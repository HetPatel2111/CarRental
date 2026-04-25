import Booking from "../models/Bookings.js";
import Coupon from "../models/Coupon.js";
import PricingConfig from "../models/PricingConfig.js";
import { rememberCache } from "../configs/cache.js";
import { cacheKeys, invalidateAdminCache, invalidateBookingCache } from "../configs/cacheKeys.js";

const DAY_IN_MS = 1000 * 60 * 60 * 24;

const unauthorized = (res) =>
    res.status(403).json({
        success: false,
        message: "Admin access required"
    });

const ensureAdmin = (req, res) => {
    if (req.user.role !== "admin") {
        unauthorized(res);
        return false;
    }

    return true;
};

const sumField = (bookings, selector) =>
    bookings.reduce((total, booking) => total + Number(selector(booking) || 0), 0);

const roundAmount = (value) => Math.max(0, Math.round(Number(value) || 0));

const getDateRange = (range = "30d") => {
    const now = new Date();
    const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
    return {
        from: new Date(now.getTime() - days * DAY_IN_MS),
        to: now,
        label: range
    };
};

const DEFAULT_PRICING_CONFIG = {
    key: "global",
    serviceFeeBase: 49,
    serviceFeeWeekend: 35,
    serviceFeeFestival: 55,
    serviceFeeTrending: 40,
    serviceFeeDemand: 35,
    serviceFeeInventory: 25,
    serviceFeePremium: 60,
    weekendPercent: 20,
    trendingPercent: 10,
    demandPercent: 8,
    inventoryPercent: 10,
    lastMinutePercent: 5,
    trendingBookingThreshold: 3,
    demandBookingThreshold: 3,
    lowInventoryThreshold: 2,
    gatewayRate: 0.02,
    gatewayFixedFee: 3,
    paymentHoldMinutes: 15,
    festivals: [
        { name: "New Year Demand", startDate: "2026-01-01", endDate: "2026-01-02", surchargePercent: 25, active: true },
        { name: "Republic Day", startDate: "2026-01-26", endDate: "2026-01-27", surchargePercent: 12, active: true },
        { name: "Independence Day", startDate: "2026-08-15", endDate: "2026-08-16", surchargePercent: 12, active: true },
        { name: "Diwali Peak", startDate: "2026-11-08", endDate: "2026-11-12", surchargePercent: 25, active: true },
        { name: "Christmas Travel", startDate: "2026-12-24", endDate: "2026-12-26", surchargePercent: 18, active: true }
    ]
};

const DEFAULT_COUPONS = [
    {
        code: "FIRST10",
        type: "percent",
        value: 10,
        maxDiscount: 1200,
        firstBookingOnly: true,
        description: "10% off on your first booking",
        active: true,
        fundedBy: "platform"
    },
    {
        code: "SAVE200",
        type: "flat",
        value: 200,
        minBookingAmount: 2500,
        description: "Flat INR 200 off on bookings above INR 2500",
        active: true,
        fundedBy: "platform"
    },
    {
        code: "WEEKEND15",
        type: "percent",
        value: 15,
        maxDiscount: 1500,
        weekendOnly: true,
        description: "15% off on weekend rentals",
        active: true,
        fundedBy: "platform"
    },
    {
        code: "SUV500",
        type: "flat",
        value: 500,
        minBookingAmount: 4000,
        category: "SUV",
        description: "Flat INR 500 off on SUV bookings above INR 4000",
        active: true,
        fundedBy: "platform"
    }
];

const sanitizeFestivalRules = (festivals = []) =>
    Array.isArray(festivals)
        ? festivals
              .filter((item) => item?.name && item?.startDate && item?.endDate)
              .map((item) => ({
                  name: String(item.name).trim(),
                  startDate: new Date(item.startDate),
                  endDate: new Date(item.endDate),
                  surchargePercent: Number(item.surchargePercent || 0),
                  active: item.active !== false
              }))
        : [];

export const getOrCreatePricingConfig = async () => {
    let config = await PricingConfig.findOne({ key: "global" });

    if (!config) {
        config = await PricingConfig.create({
            ...DEFAULT_PRICING_CONFIG,
            festivals: sanitizeFestivalRules(DEFAULT_PRICING_CONFIG.festivals)
        });
    }

    return config;
};

export const seedDefaultCoupons = async () => {
    const existingCoupons = await Coupon.countDocuments();

    if (existingCoupons === 0) {
        await Coupon.insertMany(DEFAULT_COUPONS);
    }
};

const serializePricingConfig = (config) => ({
    _id: config._id,
    serviceFeeBase: config.serviceFeeBase,
    serviceFeeWeekend: config.serviceFeeWeekend,
    serviceFeeFestival: config.serviceFeeFestival,
    serviceFeeTrending: config.serviceFeeTrending,
    serviceFeeDemand: config.serviceFeeDemand,
    serviceFeeInventory: config.serviceFeeInventory,
    serviceFeePremium: config.serviceFeePremium,
    weekendPercent: config.weekendPercent,
    trendingPercent: config.trendingPercent,
    demandPercent: config.demandPercent,
    inventoryPercent: config.inventoryPercent,
    lastMinutePercent: config.lastMinutePercent,
    trendingBookingThreshold: config.trendingBookingThreshold,
    demandBookingThreshold: config.demandBookingThreshold,
    lowInventoryThreshold: config.lowInventoryThreshold,
    gatewayRate: config.gatewayRate,
    gatewayFixedFee: config.gatewayFixedFee,
    paymentHoldMinutes: config.paymentHoldMinutes,
    festivals: (config.festivals || []).map((festival) => ({
        _id: festival._id,
        name: festival.name,
        startDate: festival.startDate,
        endDate: festival.endDate,
        surchargePercent: festival.surchargePercent,
        active: festival.active
    }))
});

const serializeCoupon = (coupon) => ({
    _id: coupon._id,
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    description: coupon.description,
    active: coupon.active,
    fundedBy: coupon.fundedBy,
    maxDiscount: coupon.maxDiscount,
    minBookingAmount: coupon.minBookingAmount,
    category: coupon.category,
    weekendOnly: coupon.weekendOnly,
    firstBookingOnly: coupon.firstBookingOnly,
    startsAt: coupon.startsAt,
    expiresAt: coupon.expiresAt
});

export const getAdminDashboard = async (req, res) => {
    try {
        if (!ensureAdmin(req, res)) return;

        const { from, to, label } = getDateRange(String(req.query.range || "30d"));
        const payload = await rememberCache(cacheKeys.adminDashboard(label), 90, async () => {
            await seedDefaultCoupons();
            const pricingConfig = await getOrCreatePricingConfig();

            const bookings = await Booking.find({
                createdAt: { $gte: from, $lte: to }
            }).populate("car owner user");

            const confirmedPaidBookings = bookings.filter(
                (booking) => booking.status === "confirmed" && booking.paymentStatus === "paid"
            );
            const cancelledBookings = bookings.filter((booking) => booking.status === "cancelled");
            const pendingSettlement = confirmedPaidBookings.filter((booking) => booking.settlementStatus !== "settled");

            const totals = {
                totalBookings: bookings.length,
                confirmedBookings: confirmedPaidBookings.length,
                cancelledBookings: cancelledBookings.length,
                pendingBookings: bookings.filter((booking) => booking.status === "pending").length,
                totalGrossSales: sumField(confirmedPaidBookings, (booking) => booking.price),
                totalBaseRevenue: sumField(confirmedPaidBookings, (booking) => booking.priceBreakdown?.basePrice),
                totalDiscount: sumField(confirmedPaidBookings, (booking) => booking.priceBreakdown?.couponDiscount),
                totalSurgeRevenue: sumField(confirmedPaidBookings, (booking) => booking.priceBreakdown?.surgeAmount),
                totalServiceFee: sumField(confirmedPaidBookings, (booking) => booking.priceBreakdown?.serviceFee),
                totalGatewayFee: sumField(confirmedPaidBookings, (booking) => booking.priceBreakdown?.gatewayFee),
                totalOwnerPayoutDue: sumField(pendingSettlement, (booking) => booking.ownerPayout),
                totalOwnerPayoutSettled: sumField(
                    confirmedPaidBookings.filter((booking) => booking.settlementStatus === "settled"),
                    (booking) => booking.ownerPayout
                ),
                totalPlatformGrossProfit: sumField(confirmedPaidBookings, (booking) => booking.platformRevenue),
                totalPlatformNetProfit: sumField(
                    confirmedPaidBookings,
                    (booking) => booking.priceBreakdown?.netPlatformProfit
                ),
                totalIncentivePaid: sumField(confirmedPaidBookings, (booking) => booking.incentiveAmount)
            };

            const ownerLeaderboardMap = new Map();
            const carLeaderboardMap = new Map();

            confirmedPaidBookings.forEach((booking) => {
                const ownerId = String(booking.owner?._id || booking.owner || "");
                const carId = String(booking.car?._id || booking.car || "");

                if (ownerId) {
                    const currentOwner = ownerLeaderboardMap.get(ownerId) || {
                        ownerId,
                        ownerName: booking.owner?.name || "Unknown owner",
                        bookings: 0,
                        grossSales: 0,
                        ownerPayout: 0,
                        netPlatformProfit: 0,
                        recommendedIncentive: 0
                    };

                    currentOwner.bookings += 1;
                    currentOwner.grossSales += Number(booking.price || 0);
                    currentOwner.ownerPayout += Number(booking.ownerPayout || 0);
                    currentOwner.netPlatformProfit += Number(booking.priceBreakdown?.netPlatformProfit || 0);
                    ownerLeaderboardMap.set(ownerId, currentOwner);
                }

                if (carId) {
                    const currentCar = carLeaderboardMap.get(carId) || {
                        carId,
                        carName: booking.car ? `${booking.car.brand} ${booking.car.model}`.trim() : "Unknown car",
                        location: booking.car?.location || "",
                        bookings: 0,
                        grossSales: 0,
                        netPlatformProfit: 0
                    };

                    currentCar.bookings += 1;
                    currentCar.grossSales += Number(booking.price || 0);
                    currentCar.netPlatformProfit += Number(booking.priceBreakdown?.netPlatformProfit || 0);
                    carLeaderboardMap.set(carId, currentCar);
                }
            });

            const topOwners = Array.from(ownerLeaderboardMap.values())
                .map((owner) => ({
                    ...owner,
                    recommendedIncentive: owner.bookings >= 5 ? Math.round(owner.ownerPayout * 0.03) : 0
                }))
                .sort((a, b) => b.bookings - a.bookings || b.grossSales - a.grossSales)
                .slice(0, 5);

            const topCars = Array.from(carLeaderboardMap.values())
                .sort((a, b) => b.bookings - a.bookings || b.grossSales - a.grossSales)
                .slice(0, 5);

            const pricingInsights = {
                weekendRevenue: sumField(confirmedPaidBookings, (booking) => booking.priceBreakdown?.weekendSurcharge),
                festivalRevenue: sumField(confirmedPaidBookings, (booking) => booking.priceBreakdown?.festivalSurcharge),
                trendingRevenue: sumField(confirmedPaidBookings, (booking) => booking.priceBreakdown?.trendingSurcharge),
                demandRevenue: sumField(
                    confirmedPaidBookings,
                    (booking) =>
                        Number(booking.priceBreakdown?.demandSurcharge || 0) +
                        Number(booking.priceBreakdown?.inventorySurcharge || 0)
                ),
                lastMinuteRevenue: sumField(confirmedPaidBookings, (booking) => booking.priceBreakdown?.lastMinuteSurcharge)
            };

            const coupons = await Coupon.find().sort({ createdAt: -1 });
            const settlementQueue = await Booking.find({
                status: "confirmed",
                paymentStatus: "paid",
                settlementStatus: { $ne: "settled" }
            })
                .populate("car owner user")
                .sort({ createdAt: -1 })
                .limit(8);

            return {
                success: true,
                range: label,
                metrics: totals,
                pricingInsights,
                topOwners,
                topCars,
                coupons: coupons.map(serializeCoupon),
                pricingConfig: serializePricingConfig(pricingConfig),
                settlementQueue,
                profitFormula: "netPlatformProfit = customerPaid - ownerPayout - gatewayFee - incentiveAmount",
                notes: {
                    confirmedCountBasis: "Only confirmed and paid bookings are included in profit analytics.",
                    settlementBasis: "Owner payout due shows unpaid owner liabilities from confirmed paid bookings."
                }
            };
        });

        res.json(payload);
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

export const getPricingConfig = async (req, res) => {
    try {
        if (!ensureAdmin(req, res)) return;

        const config = await rememberCache(cacheKeys.adminPricing(), 120, () => getOrCreatePricingConfig());
        res.json({ success: true, pricingConfig: serializePricingConfig(config) });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

export const updatePricingConfig = async (req, res) => {
    try {
        if (!ensureAdmin(req, res)) return;

        const config = await getOrCreatePricingConfig();
        const updates = req.body || {};
        const numericFields = [
            "serviceFeeBase",
            "serviceFeeWeekend",
            "serviceFeeFestival",
            "serviceFeeTrending",
            "serviceFeeDemand",
            "serviceFeeInventory",
            "serviceFeePremium",
            "weekendPercent",
            "trendingPercent",
            "demandPercent",
            "inventoryPercent",
            "lastMinutePercent",
            "trendingBookingThreshold",
            "demandBookingThreshold",
            "lowInventoryThreshold",
            "gatewayRate",
            "gatewayFixedFee",
            "paymentHoldMinutes"
        ];

        numericFields.forEach((field) => {
            if (updates[field] !== undefined) {
                config[field] = Number(updates[field]);
            }
        });

        if (updates.festivals) {
            config.festivals = sanitizeFestivalRules(updates.festivals);
        }

        await config.save();
        await invalidateAdminCache();
        res.json({ success: true, message: "Pricing configuration updated", pricingConfig: serializePricingConfig(config) });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

export const getCoupons = async (req, res) => {
    try {
        if (!ensureAdmin(req, res)) return;

        await seedDefaultCoupons();
        const coupons = await rememberCache(cacheKeys.adminCoupons(), 120, () => Coupon.find().sort({ createdAt: -1 }));
        res.json({ success: true, coupons: coupons.map(serializeCoupon) });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

export const createCoupon = async (req, res) => {
    try {
        if (!ensureAdmin(req, res)) return;

        const payload = req.body || {};
        const coupon = await Coupon.create({
            code: String(payload.code || "").trim().toUpperCase(),
            type: payload.type || "flat",
            value: Number(payload.value || 0),
            description: payload.description || "",
            active: payload.active !== false,
            fundedBy: payload.fundedBy || "platform",
            maxDiscount: Number(payload.maxDiscount || 0),
            minBookingAmount: Number(payload.minBookingAmount || 0),
            category: payload.category || "",
            weekendOnly: Boolean(payload.weekendOnly),
            firstBookingOnly: Boolean(payload.firstBookingOnly),
            startsAt: payload.startsAt || null,
            expiresAt: payload.expiresAt || null
        });
        await invalidateAdminCache();

        res.json({ success: true, message: "Coupon created", coupon: serializeCoupon(coupon) });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

export const updateCoupon = async (req, res) => {
    try {
        if (!ensureAdmin(req, res)) return;

        const payload = req.body || {};
        const coupon = await Coupon.findById(req.params.id);

        if (!coupon) {
            return res.json({ success: false, message: "Coupon not found" });
        }

        Object.assign(coupon, {
            code: payload.code !== undefined ? String(payload.code).trim().toUpperCase() : coupon.code,
            type: payload.type !== undefined ? payload.type : coupon.type,
            value: payload.value !== undefined ? Number(payload.value) : coupon.value,
            description: payload.description !== undefined ? payload.description : coupon.description,
            active: payload.active !== undefined ? Boolean(payload.active) : coupon.active,
            fundedBy: payload.fundedBy !== undefined ? payload.fundedBy : coupon.fundedBy,
            maxDiscount: payload.maxDiscount !== undefined ? Number(payload.maxDiscount) : coupon.maxDiscount,
            minBookingAmount:
                payload.minBookingAmount !== undefined ? Number(payload.minBookingAmount) : coupon.minBookingAmount,
            category: payload.category !== undefined ? payload.category : coupon.category,
            weekendOnly: payload.weekendOnly !== undefined ? Boolean(payload.weekendOnly) : coupon.weekendOnly,
            firstBookingOnly:
                payload.firstBookingOnly !== undefined ? Boolean(payload.firstBookingOnly) : coupon.firstBookingOnly,
            startsAt: payload.startsAt !== undefined ? payload.startsAt || null : coupon.startsAt,
            expiresAt: payload.expiresAt !== undefined ? payload.expiresAt || null : coupon.expiresAt
        });

        await coupon.save();
        await invalidateAdminCache();
        res.json({ success: true, message: "Coupon updated", coupon: serializeCoupon(coupon) });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

export const deleteCoupon = async (req, res) => {
    try {
        if (!ensureAdmin(req, res)) return;

        const coupon = await Coupon.findByIdAndDelete(req.params.id);
        if (!coupon) {
            return res.json({ success: false, message: "Coupon not found" });
        }
        await invalidateAdminCache();

        res.json({ success: true, message: "Coupon deleted" });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

export const getSettlementQueue = async (req, res) => {
    try {
        if (!ensureAdmin(req, res)) return;

        const bookings = await rememberCache(cacheKeys.adminSettlements(), 60, () =>
            Booking.find({
                status: "confirmed",
                paymentStatus: "paid"
            })
                .populate("car owner user")
                .sort({ createdAt: -1 })
        );

        const activeBookings = bookings.filter((booking) => booking.settlementStatus !== "settled");
        const historyBookings = bookings.filter((booking) => booking.settlementStatus === "settled");

        res.json({
            success: true,
            bookings: activeBookings,
            activeBookings,
            historyBookings
        });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

export const updateSettlement = async (req, res) => {
    try {
        if (!ensureAdmin(req, res)) return;

        const booking = await Booking.findById(req.params.id).populate("car owner user");
        if (!booking) {
            return res.json({ success: false, message: "Booking not found" });
        }

        const nextStatus = req.body?.settlementStatus;
        if (!["pending", "processing", "settled"].includes(nextStatus)) {
            return res.json({ success: false, message: "Invalid settlement status" });
        }

        booking.settlementStatus = nextStatus;
        await booking.save();
        await invalidateBookingCache({
            ownerId: booking.owner?._id?.toString() || booking.owner?.toString(),
            userId: booking.user?._id?.toString() || booking.user?.toString()
        });

        res.json({ success: true, message: "Settlement updated", booking });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

export const applyIncentive = async (req, res) => {
    try {
        if (!ensureAdmin(req, res)) return;

        const booking = await Booking.findById(req.params.id).populate("car owner user");
        if (!booking) {
            return res.json({ success: false, message: "Booking not found" });
        }

        const incentiveAmount = roundAmount(req.body?.incentiveAmount || 0);
        booking.incentiveAmount = incentiveAmount;

        const grossPlatformRevenue = Number(booking.priceBreakdown?.grossPlatformRevenue || booking.platformRevenue || 0);
        const gatewayFee = Number(booking.priceBreakdown?.gatewayFee || 0);
        booking.priceBreakdown = {
            ...booking.priceBreakdown,
            netPlatformProfit: roundAmount(Math.max(grossPlatformRevenue - gatewayFee - incentiveAmount, 0))
        };

        await booking.save();
        await invalidateBookingCache({
            ownerId: booking.owner?._id?.toString() || booking.owner?.toString(),
            userId: booking.user?._id?.toString() || booking.user?.toString()
        });

        res.json({ success: true, message: "Incentive updated", booking });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};
