import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true
        },
        type: {
            type: String,
            enum: ["percent", "flat"],
            required: true
        },
        value: {
            type: Number,
            required: true
        },
        description: {
            type: String,
            default: ""
        },
        active: {
            type: Boolean,
            default: true
        },
        fundedBy: {
            type: String,
            enum: ["platform", "owner", "shared"],
            default: "platform"
        },
        maxDiscount: {
            type: Number,
            default: 0
        },
        minBookingAmount: {
            type: Number,
            default: 0
        },
        category: {
            type: String,
            default: ""
        },
        weekendOnly: {
            type: Boolean,
            default: false
        },
        firstBookingOnly: {
            type: Boolean,
            default: false
        },
        startsAt: {
            type: Date,
            default: null
        },
        expiresAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

const Coupon = mongoose.model("Coupon", couponSchema);

export default Coupon;
