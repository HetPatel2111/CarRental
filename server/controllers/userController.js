import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Car from "../models/Car.js";
import { isValidEmail, normalizeEmail } from "../utils/validators.js";

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

export const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const normalizedEmail = normalizeEmail(email);

        if (!name?.trim() || !normalizedEmail || !password) {
            return res.status(400).json({
                success: false,
                message: "Please fill in all required fields.",
            });
        }

        if (!isValidEmail(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address.",
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters long.",
            });
        }

        const userExists = await User.findOne({ email: normalizedEmail });
        if (userExists) {
            return res.status(409).json({
                success: false,
                message: "User already exists",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
        });

        res.status(201).json({
            success: true,
            token: generateToken(user._id.toString()),
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const loginuser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = normalizeEmail(email);
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials",
            });
        }

        res.json({
            success: true,
            token: generateToken(user._id.toString()),
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getUserData = async (req, res) => {
    res.status(200).json({
        success: true,
        user: req.user,
    });
};

export const getCars = async (req, res) => {
    try {
        const cars = await Car.find({ isAvaliable: true, isDeleted: false }).sort({ createdAt: -1 });
        res.json({ success: true, cars });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
