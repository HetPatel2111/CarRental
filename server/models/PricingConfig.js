import mongoose from "mongoose";

const festivalRuleSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        surchargePercent: { type: Number, default: 0 },
        active: { type: Boolean, default: true }
    },
    { _id: true }
);

const pricingConfigSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            default: "global"
        },
        serviceFeeBase: {
            type: Number,
            default: 49
        },
        serviceFeeWeekend: {
            type: Number,
            default: 35
        },
        serviceFeeFestival: {
            type: Number,
            default: 55
        },
        serviceFeeTrending: {
            type: Number,
            default: 40
        },
        serviceFeeDemand: {
            type: Number,
            default: 35
        },
        serviceFeeInventory: {
            type: Number,
            default: 25
        },
        serviceFeePremium: {
            type: Number,
            default: 60
        },
        weekendPercent: {
            type: Number,
            default: 20
        },
        trendingPercent: {
            type: Number,
            default: 10
        },
        demandPercent: {
            type: Number,
            default: 8
        },
        inventoryPercent: {
            type: Number,
            default: 10
        },
        lastMinutePercent: {
            type: Number,
            default: 5
        },
        trendingBookingThreshold: {
            type: Number,
            default: 3
        },
        demandBookingThreshold: {
            type: Number,
            default: 3
        },
        lowInventoryThreshold: {
            type: Number,
            default: 2
        },
        gatewayRate: {
            type: Number,
            default: 0.02
        },
        gatewayFixedFee: {
            type: Number,
            default: 3
        },
        paymentHoldMinutes: {
            type: Number,
            default: 15
        },
        festivals: {
            type: [festivalRuleSchema],
            default: []
        }
    },
    { timestamps: true }
);

const PricingConfig = mongoose.model("PricingConfig", pricingConfigSchema);

export default PricingConfig;
