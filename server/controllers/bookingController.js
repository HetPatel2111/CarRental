import Booking from "../models/Bookings.js";
import Car from "../models/Car.js";
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
            isDeleted: false,
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
        const dateValidation = validateBookingDates(pickupDate, returnDate);

        if (!dateValidation.valid) {
            return res.status(400).json({ success: false, message: dateValidation.message });
        }

        const isAvaliable = await checkAvailbility(car, pickupDate, returnDate);

        if (!isAvaliable) {
            return res.status(409).json({ success: false, message: "Car is not available" });
        }

        const carData = await Car.findById(car);

        if (!carData || carData.isDeleted || !carData.isAvaliable) {
            return res.status(404).json({ success: false, message: "Car not found" });
        }

        if (carData.owner.toString() === _id.toString()) {
            return res.status(400).json({ success: false, message: "You cannot book your own car." });
        }

        const numberOfDays = calculateRentalDays(
            dateValidation.parsedPickupDate,
            dateValidation.parsedReturnDate
        );
        const price = carData.pricePerDay * numberOfDays;

        await Booking.create({
            car,
            owner: carData.owner,
            user: _id,
            pickupDate,
            returnDate,
            price,
        });

        res.status(201).json({ success: true, message: "Booking created successfully" });
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

        booking.status = status;
        await booking.save();

        res.json({ success: true, message: "Status updated successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
