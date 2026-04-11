import imageKit from "../configs/imageKit.js";
import User from "../models/User.js";
import Car from "../models/Car.js";
import Booking from "../models/Bookings.js";

const uploadToImageKit = async (file, folder, transformation) => {
    const response = await imageKit.upload({
        file: file.buffer,
        fileName: file.originalname,
        folder,
    });

    return imageKit.url({
        path: response.filePath,
        transformation,
    });
};

export const changeRoleToOwner = async (req, res) => {
    try {
        const { _id } = req.user;
        await User.findByIdAndUpdate(_id, { role: "owner" });

        res.json({
            success: true,
            message: "Now you can list cars",
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const addCar = async (req, res) => {
    try {
        if (req.user.role !== "owner") {
            return res.status(403).json({
                success: false,
                message: "Only owners can list cars.",
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Image is required",
            });
        }

        const { _id } = req.user;
        const carData = JSON.parse(req.body.carData);
        const image = await uploadToImageKit(req.file, "/cars", [
            { width: "1280" },
            { quality: "auto" },
            { format: "webp" },
        ]);

        await Car.create({
            ...carData,
            owner: _id,
            image,
        });

        res.status(201).json({
            success: true,
            message: "Car added successfully",
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getOwnerCars = async (req, res) => {
    try {
        if (req.user.role !== "owner") {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

        const { _id } = req.user;
        const cars = await Car.find({ owner: _id, isDeleted: { $ne: true } }).sort({ createdAt: -1 });

        res.json({ success: true, cars });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const toggleCarAvailability = async (req, res) => {
    try {
        const { _id } = req.user;
        const { carId } = req.body;
        const car = await Car.findById(carId);

        if (!car || car.isDeleted) {
            return res.status(404).json({ success: false, message: "Car not found" });
        }

        if (car.owner.toString() !== _id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized",
            });
        }

        car.isAvaliable = !car.isAvaliable;
        await car.save();

        res.json({ success: true, message: "Availability updated" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteCar = async (req, res) => {
    try {
        const { _id } = req.user;
        const { carId } = req.body;
        const car = await Car.findById(carId);

        if (!car || car.isDeleted) {
            return res.status(404).json({ success: false, message: "Car not found" });
        }

        if (car.owner.toString() !== _id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const activeBooking = await Booking.findOne({
            car: carId,
            status: { $in: ["pending", "confirmed"] },
            returnDate: { $gte: new Date() },
        });

        if (activeBooking) {
            return res.status(400).json({
                success: false,
                message: "This car has active bookings and cannot be removed yet.",
            });
        }

        car.isAvaliable = false;
        car.isDeleted = true;
        await car.save();

        res.json({ success: true, message: "Car removed successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getDashboardData = async (req, res) => {
    try {
        const { _id, role } = req.user;

        if (role !== "owner") {
            return res.status(403).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const currentDate = new Date();
        const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const nextMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);

        const cars = await Car.find({ owner: _id, isDeleted: { $ne: true } });
        const bookings = await Booking.find({ owner: _id }).populate("car").sort({ createdAt: -1 });
        const pendingBookings = bookings.filter((booking) => booking.status === "pending");
        const completeBookings = bookings.filter((booking) => booking.status === "confirmed");

        const monthlyRevenue = bookings
            .filter((booking) => booking.status === "confirmed" && booking.paymentStatus === "paid")
            .filter((booking) => booking.createdAt >= currentMonthStart && booking.createdAt < nextMonthStart)
            .reduce((accumulator, booking) => accumulator + booking.price, 0);

        res.json({
            success: true,
            dashboardData: {
                totalCars: cars.length,
                totalBookings: bookings.length,
                pendingBookings: pendingBookings.length,
                completeBookings: completeBookings.length,
                recentBookings: bookings.slice(0, 5),
                monthlyRevenue,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateUserImage = async (req, res) => {
    try {
        const { _id } = req.user;

        if (!req.file) {
            return res.status(400).json({ success: false, message: "Image is required" });
        }

        const image = await uploadToImageKit(req.file, "/users", [
            { width: "400" },
            { quality: "auto" },
            { format: "webp" },
        ]);

        await User.findByIdAndUpdate(_id, { image });

        res.json({ success: true, message: "Profile image updated" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
