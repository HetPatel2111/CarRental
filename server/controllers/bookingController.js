import Booking from "../models/Bookings.js";
import Car from "../models/Car.js";
import stripe from "../configs/stripe.js";
import { calculateRentalDays, validateBookingDates } from "../utils/validators.js";

const checkAvailbility = async (car, pickupDate, returnDate) => {
    const bookings = await Booking.find({
        car,
        pickupDate: { $lte: returnDate },
        returnDate: { $gte: pickupDate },
        status: { $in: ["pending", "confirmed"] },
    });

    return bookings.length === 0;
};

const buildBookingPayload = async ({ userId, carId, pickupDate, returnDate }) => {
    const dateValidation = validateBookingDates(pickupDate, returnDate);

    if (!dateValidation.valid) {
        return { error: { status: 400, message: dateValidation.message } };
    }

    const isAvaliable = await checkAvailbility(carId, pickupDate, returnDate);
    if (!isAvaliable) {
        return { error: { status: 409, message: "Car is not available" } };
    }

    const carData = await Car.findById(carId);
    if (!carData || carData.isDeleted || !carData.isAvaliable) {
        return { error: { status: 404, message: "Car not found" } };
    }

    if (carData.owner.toString() === userId.toString()) {
        return { error: { status: 400, message: "You cannot book your own car." } };
    }

    const numberOfDays = calculateRentalDays(
        dateValidation.parsedPickupDate,
        dateValidation.parsedReturnDate
    );

    return {
        carData,
        price: carData.pricePerDay * numberOfDays,
        numberOfDays,
    };
};

export const checkAvailbilityOfCar = async (req, res) => {
    try {
        const { location, pickupDate, returnDate } = req.body;
        const dateValidation = validateBookingDates(pickupDate, returnDate);

        if (!location?.trim()) {
            return res.status(400).json({ success: false, message: "Location is required." });
        }

        if (!dateValidation.valid) {
            return res.status(400).json({ success: false, message: dateValidation.message });
        }

        const cars = await Car.find({
            location,
            isAvaliable: true,
            isDeleted: { $ne: true },
        });

        const availableCars = await Promise.all(
            cars.map(async (car) => {
                const isAvaliable = await checkAvailbility(car._id, pickupDate, returnDate);
                return isAvaliable ? car : null;
            })
        );

        res.json({
            success: true,
            availableCars: availableCars.filter(Boolean),
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createBooking = async (req, res) => {
    try {
        const { _id } = req.user;
        const { car, pickupDate, returnDate } = req.body;
        const bookingData = await buildBookingPayload({
            userId: _id,
            carId: car,
            pickupDate,
            returnDate,
        });

        if (bookingData.error) {
            return res.status(bookingData.error.status).json({
                success: false,
                message: bookingData.error.message,
            });
        }

        await Booking.create({
            car,
            owner: bookingData.carData.owner,
            user: _id,
            pickupDate,
            returnDate,
            price: bookingData.price,
        });

        res.status(201).json({ success: true, message: "Booking created successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createCheckoutSession = async (req, res) => {
    try {
        const { _id } = req.user;
        const { car, pickupDate, returnDate } = req.body;
        const bookingData = await buildBookingPayload({
            userId: _id,
            carId: car,
            pickupDate,
            returnDate,
        });

        if (bookingData.error) {
            return res.status(bookingData.error.status).json({
                success: false,
                message: bookingData.error.message,
            });
        }

        const booking = await Booking.create({
            car,
            owner: bookingData.carData.owner,
            user: _id,
            pickupDate,
            returnDate,
            price: bookingData.price,
            paymentStatus: "pending",
        });

        const session = await stripe.checkout.sessions.create({
            mode: "payment",
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: `${bookingData.carData.brand} ${bookingData.carData.model}`,
                            description: `${bookingData.numberOfDays} day rental in ${bookingData.carData.location}`,
                            images: bookingData.carData.image ? [bookingData.carData.image] : [],
                        },
                        unit_amount: Math.round(bookingData.price * 100),
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                bookingId: booking._id.toString(),
                userId: _id.toString(),
            },
            success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.CLIENT_URL}/payment/cancel?bookingId=${booking._id}`,
        });

        booking.stripeSessionId = session.id;
        await booking.save();

        res.status(201).json({
            success: true,
            url: session.url,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const verifyCheckoutSession = async (req, res) => {
    try {
        const sessionId = req.query.session_id;

        if (!sessionId) {
            return res.status(400).json({ success: false, message: "Session id is required." });
        }

        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const booking = await Booking.findOne({ stripeSessionId: sessionId }).populate("car");

        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found." });
        }

        if (booking.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

        if (session.payment_status === "paid") {
            booking.paymentStatus = "paid";
            booking.status = "confirmed";
            await booking.save();

            return res.json({
                success: true,
                message: "Payment verified successfully.",
                booking,
            });
        }

        return res.status(400).json({
            success: false,
            message: "Payment is not completed yet.",
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const cancelPendingPayment = async (req, res) => {
    try {
        const { bookingId } = req.body;
        const booking = await Booking.findById(bookingId);

        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found." });
        }

        if (booking.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

        if (booking.paymentStatus === "paid") {
            return res.status(400).json({
                success: false,
                message: "Paid bookings cannot be cancelled from this page.",
            });
        }

        booking.paymentStatus = "failed";
        booking.status = "cancelled";
        await booking.save();

        res.json({ success: true, message: "Payment was cancelled." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getUserBookings = async (req, res) => {
    try {
        const { _id } = req.user;
        const bookings = await Booking.find({ user: _id }).populate("car").sort({ createdAt: -1 });

        res.json({ success: true, bookings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getOwnerBookings = async (req, res) => {
    try {
        if (req.user.role !== "owner") {
            return res.status(403).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const bookings = await Booking.find({ owner: req.user._id })
            .populate("car")
            .populate({ path: "user", select: "name email image" })
            .sort({ createdAt: -1 });

        res.json({ success: true, bookings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const changeBookingStatus = async (req, res) => {
    try {
        const { _id } = req.user;
        const { bookingId, status } = req.body;
        const allowedStatuses = ["pending", "confirmed", "cancelled"];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid booking status." });
        }

        const booking = await Booking.findById(bookingId);

        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found." });
        }

        if (booking.owner.toString() !== _id.toString()) {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

        if (status === "confirmed" && booking.paymentStatus !== "paid") {
            return res.status(400).json({
                success: false,
                message: "Only paid bookings can be confirmed.",
            });
        }

        booking.status = status;
        await booking.save();

        res.json({ success: true, message: "Status updated successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
