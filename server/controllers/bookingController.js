import crypto from "crypto";
import mongoose from "mongoose";
import Booking from "../models/Bookings.js";
import BookingDateLock from "../models/BookingDateLock.js";
import { rememberCache } from "../configs/cache.js";
import { cacheKeys, invalidateBookingCache } from "../configs/cacheKeys.js";
import Car from "../models/Car.js";
import Coupon from "../models/Coupon.js";
import { getOrCreatePricingConfig, seedDefaultCoupons } from "./adminController.js";

const DAY_IN_MS = 1000 * 60 * 60 * 24;
const { ObjectId } = mongoose.Types;

const roundAmount = (value) => Math.max(0, Math.round(Number(value) || 0));
const normalizeCouponCode = (couponCode = "") => couponCode.trim().toUpperCase();
const getNow = () => new Date();
const createPaymentWindowExpiry = (paymentHoldMinutes) => new Date(Date.now() + Number(paymentHoldMinutes || 15) * 60 * 1000);
const toUtcDateOnly = (value) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const toDateKey = (value) => {
    const date = toUtcDateOnly(value);
    return date ? date.toISOString().split("T")[0] : "";
};

const getRentalDays = (pickupDate, returnDate) => {
    const picked = toUtcDateOnly(pickupDate);
    const returned = toUtcDateOnly(returnDate);

    if (!picked || !returned) {
        throw new Error("Please select valid pickup and return dates");
    }

    const diffInMs = returned - picked;

    if (diffInMs < 0) {
        throw new Error("Please select valid pickup and return dates");
    }

    return Math.floor(diffInMs / DAY_IN_MS) + 1;
};

const enumerateTripDates = (pickupDate, returnDate) => {
    const tripDates = [];
    const cursor = toUtcDateOnly(pickupDate);
    const end = toUtcDateOnly(returnDate);

    if (!cursor || !end || cursor > end) {
        return tripDates;
    }

    while (cursor <= end) {
        tripDates.push(new Date(cursor));
        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return tripDates;
};

const isWeekendRange = (pickupDate, returnDate) =>
    enumerateTripDates(pickupDate, returnDate).some((date) => {
        const day = date.getDay();
        return day === 0 || day === 6;
    });

const getFestivalPricing = (pickupDate, returnDate, festivalRules = []) => {
    const tripDates = enumerateTripDates(pickupDate, returnDate);
    const matchedFestivals = festivalRules.filter((rule) =>
        rule?.active !== false &&
        tripDates.some((date) => date >= new Date(rule.startDate) && date <= new Date(rule.endDate))
    );

    if (!matchedFestivals.length) {
        return {
            festivalPercent: 0,
            festivals: []
        };
    }

    return {
        festivalPercent: matchedFestivals.reduce((maxPercent, rule) => Math.max(maxPercent, rule.surchargePercent), 0),
        festivals: matchedFestivals.map((rule) => rule.name)
    };
};

const getActiveBookingFilter = ({ car, pickupDate, returnDate, excludeBookingId = null } = {}) => {
    const now = getNow();
    const filter = {
        status: { $ne: "cancelled" }
    };

    if (car) {
        filter.car = car;
    }

    if (pickupDate && returnDate) {
        filter.pickupDate = { $lte: returnDate };
        filter.returnDate = { $gte: pickupDate };
    }

    if (excludeBookingId) {
        filter._id = { $ne: excludeBookingId };
    }

    filter.$or = [
        { paymentStatus: "paid" },
        { paymentMethod: "offline" },
        { paymentWindowExpiresAt: { $gt: now } },
        { orderId: "" },
        { orderId: null }
    ];

    return filter;
};

const createPriceBreakdown = (pricing) => ({
    rentalDays: pricing.rentalDays,
    basePricePerDay: pricing.basePricePerDay,
    basePrice: pricing.basePrice,
    weekendSurcharge: pricing.weekendSurcharge,
    festivalSurcharge: pricing.festivalSurcharge,
    trendingSurcharge: pricing.trendingSurcharge,
    demandSurcharge: pricing.demandSurcharge,
    inventorySurcharge: pricing.inventorySurcharge,
    lastMinuteSurcharge: pricing.lastMinuteSurcharge,
    surgeAmount: pricing.surgeAmount,
    serviceFeeBase: pricing.serviceFeeBase,
    serviceFee: pricing.serviceFee,
    couponDiscount: pricing.couponDiscount,
    gatewayFee: pricing.gatewayFee,
    grossPlatformRevenue: pricing.grossPlatformRevenue,
    netPlatformProfit: pricing.netPlatformProfit,
    finalPrice: pricing.finalPrice,
    appliedRules: pricing.appliedRules
});

const createBasicAuthHeader = () => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
        throw new Error("Razorpay keys are missing in server environment");
    }

    const encodedCredentials = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    return `Basic ${encodedCredentials}`;
};

const getPricingConfig = async () => getOrCreatePricingConfig();

const createRazorpayOrder = async ({ amount, receipt, notes }) => {
    const response = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
            Authorization: createBasicAuthHeader(),
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            amount,
            currency: "INR",
            receipt,
            notes
        })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data?.error?.description || "Unable to create Razorpay order");
    }

    return data;
};

const createRazorpayRefund = async ({ paymentId, amount, notes = {} }) => {
    const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
        method: "POST",
        headers: {
            Authorization: createBasicAuthHeader(),
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            amount,
            speed: "normal",
            notes
        })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data?.error?.description || "Unable to create Razorpay refund");
    }

    return data;
};

export class BookingConflictError extends Error {
    constructor(message = "Car is not available for the selected dates") {
        super(message);
        this.name = "BookingConflictError";
    }
}

const evaluateCoupon = async ({ couponCode, subtotal, carData, pickupDate, returnDate, userId }) => {
    const normalizedCode = normalizeCouponCode(couponCode);

    if (!normalizedCode) {
        return {
            couponCode: "",
            couponDiscount: 0,
            couponMessage: ""
        };
    }

    await seedDefaultCoupons();
    const rule = await Coupon.findOne({ code: normalizedCode, active: true });

    if (!rule) {
        throw new Error("Invalid coupon code");
    }

    const now = getNow();
    if (rule.startsAt && new Date(rule.startsAt) > now) {
        throw new Error(`Coupon ${normalizedCode} is not active yet`);
    }

    if (rule.expiresAt && new Date(rule.expiresAt) < now) {
        throw new Error(`Coupon ${normalizedCode} has expired`);
    }

    if (rule.minBookingAmount && subtotal < rule.minBookingAmount) {
        throw new Error(`Coupon ${normalizedCode} requires a minimum booking value of INR ${rule.minBookingAmount}`);
    }

    if (rule.category && String(carData.category).toLowerCase() !== rule.category.toLowerCase()) {
        throw new Error(`Coupon ${normalizedCode} is only valid for ${rule.category} cars`);
    }

    if (rule.weekendOnly && !isWeekendRange(pickupDate, returnDate)) {
        throw new Error(`Coupon ${normalizedCode} is only valid for weekend rentals`);
    }

    if (rule.firstBookingOnly && userId) {
        const existingBookings = await Booking.countDocuments({
            user: userId,
            status: { $ne: "cancelled" }
        });

        if (existingBookings > 0) {
            throw new Error(`Coupon ${normalizedCode} is only valid on the first booking`);
        }
    }

    let couponDiscount = 0;
    if (rule.type === "percent") {
        couponDiscount = Math.floor((subtotal * rule.value) / 100);
        if (rule.maxDiscount) {
            couponDiscount = Math.min(couponDiscount, rule.maxDiscount);
        }
    } else {
        couponDiscount = rule.value;
    }

    return {
        couponCode: normalizedCode,
        couponDiscount: roundAmount(Math.min(couponDiscount, subtotal)),
        couponMessage: rule.description
    };
};

export const checkAvailbility = async (car, pickupDate, returnDate, excludeBookingId = null) => {
    await clearExpiredBookingLocks({ carId: car, pickupDate, returnDate });

    const activeLockFilter = {
        car,
        date: {
            $gte: toUtcDateOnly(pickupDate),
            $lte: toUtcDateOnly(returnDate)
        }
    };

    if (excludeBookingId) {
        activeLockFilter.booking = { $ne: excludeBookingId };
    }

    const lockExists = await BookingDateLock.exists(activeLockFilter);
    if (lockExists) {
        return false;
    }

    const bookings = await Booking.find(
        getActiveBookingFilter({ car, pickupDate, returnDate, excludeBookingId })
    ).select("_id");

    return bookings.length === 0;
};

export const calculateBookingPrice = (pricePerDay, pickupDate, returnDate) => {
    return roundAmount(pricePerDay * getRentalDays(pickupDate, returnDate));
};

export const calculateDynamicPricing = async ({ carData, pickupDate, returnDate, userId = null, couponCode = "" }) => {
    const pricingConfig = await getPricingConfig();
    const rentalDays = getRentalDays(pickupDate, returnDate);
    const basePricePerDay = Number(carData.pricePerDay || 0);
    const basePrice = roundAmount(basePricePerDay * rentalDays);
    const weekendTrip = isWeekendRange(pickupDate, returnDate);
    const { festivalPercent, festivals } = getFestivalPricing(pickupDate, returnDate, pricingConfig.festivals || []);

    const activeLocationBookings = await Booking.find(
        getActiveBookingFilter({ pickupDate, returnDate })
    ).populate("car", "location");

    const sameLocationDemand = activeLocationBookings.filter(
        (booking) => booking.car?.location?.toLowerCase() === String(carData.location || "").toLowerCase()
    ).length;

    const availableCarsInLocation = await Car.countDocuments({
        location: carData.location,
        isAvaliable: true
    });

    const recentTrendingBookings = await Booking.countDocuments({
        car: carData._id,
        status: "confirmed",
        paymentStatus: "paid",
        createdAt: { $gte: new Date(Date.now() - 30 * DAY_IN_MS) }
    });

    const appliedRules = [];
    const weekendSurcharge = weekendTrip ? roundAmount((basePrice * Number(pricingConfig.weekendPercent || 0)) / 100) : 0;
    if (weekendSurcharge) appliedRules.push(`weekend_${pricingConfig.weekendPercent}_percent`);

    const festivalSurcharge = festivalPercent ? roundAmount((basePrice * festivalPercent) / 100) : 0;
    if (festivalSurcharge) appliedRules.push(`festival_${festivalPercent}_percent`);

    const trendingSurcharge =
        recentTrendingBookings >= Number(pricingConfig.trendingBookingThreshold || 0)
            ? roundAmount((basePrice * Number(pricingConfig.trendingPercent || 0)) / 100)
            : 0;
    if (trendingSurcharge) appliedRules.push(`trending_car_${pricingConfig.trendingPercent}_percent`);

    const demandSurcharge =
        sameLocationDemand >= Number(pricingConfig.demandBookingThreshold || 0)
            ? roundAmount((basePrice * Number(pricingConfig.demandPercent || 0)) / 100)
            : 0;
    if (demandSurcharge) appliedRules.push(`high_demand_${pricingConfig.demandPercent}_percent`);

    const inventorySurcharge =
        availableCarsInLocation <= Number(pricingConfig.lowInventoryThreshold || 0)
            ? roundAmount((basePrice * Number(pricingConfig.inventoryPercent || 0)) / 100)
            : 0;
    if (inventorySurcharge) appliedRules.push(`low_inventory_${pricingConfig.inventoryPercent}_percent`);

    const pickupGapDays = Math.floor((new Date(pickupDate) - getNow()) / DAY_IN_MS);
    const lastMinuteSurcharge =
        pickupGapDays >= 0 && pickupGapDays <= 1
            ? roundAmount((basePrice * Number(pricingConfig.lastMinutePercent || 0)) / 100)
            : 0;
    if (lastMinuteSurcharge) appliedRules.push(`last_minute_${pricingConfig.lastMinutePercent}_percent`);

    const surgeAmount = roundAmount(
        weekendSurcharge + festivalSurcharge + trendingSurcharge + demandSurcharge + inventorySurcharge + lastMinuteSurcharge
    );

    let serviceFee = Number(pricingConfig.serviceFeeBase || 49);
    const serviceFeeBase = Number(pricingConfig.serviceFeeBase || 49);
    if (weekendTrip) serviceFee += Number(pricingConfig.serviceFeeWeekend || 0);
    if (festivalSurcharge) serviceFee += Number(pricingConfig.serviceFeeFestival || 0);
    if (trendingSurcharge) serviceFee += Number(pricingConfig.serviceFeeTrending || 0);
    if (sameLocationDemand >= Number(pricingConfig.demandBookingThreshold || 0)) {
        serviceFee += Number(pricingConfig.serviceFeeDemand || 0);
    }
    if (availableCarsInLocation <= Number(pricingConfig.lowInventoryThreshold || 0)) {
        serviceFee += Number(pricingConfig.serviceFeeInventory || 0);
    }
    if (["luxury", "premium"].includes(String(carData.category || "").toLowerCase())) {
        serviceFee += Number(pricingConfig.serviceFeePremium || 0);
        appliedRules.push("premium_handling_fee");
    }
    if (basePrice >= 5000) serviceFee += Math.round(basePrice * 0.02);
    serviceFee = roundAmount(Math.min(serviceFee, Math.max(249, Math.round(basePrice * 0.15))));

    const subtotal = roundAmount(basePrice + surgeAmount + serviceFee);
    const coupon = await evaluateCoupon({ couponCode, subtotal, carData, pickupDate, returnDate, userId });
    const finalPrice = roundAmount(Math.max(subtotal - coupon.couponDiscount, 0));
    const ownerPayout = basePrice;
    const gatewayFee = roundAmount(
        finalPrice * Number(pricingConfig.gatewayRate || 0) + Number(pricingConfig.gatewayFixedFee || 0)
    );
    const grossPlatformRevenue = roundAmount(Math.max(finalPrice - ownerPayout, 0));
    const netPlatformProfit = roundAmount(Math.max(grossPlatformRevenue - gatewayFee, 0));

    return {
        rentalDays,
        basePricePerDay,
        basePrice,
        weekendSurcharge,
        festivalSurcharge,
        trendingSurcharge,
        demandSurcharge,
        inventorySurcharge,
        lastMinuteSurcharge,
        surgeAmount,
        serviceFeeBase,
        serviceFee,
        couponCode: coupon.couponCode,
        couponDiscount: coupon.couponDiscount,
        couponMessage: coupon.couponMessage,
        finalPrice,
        ownerPayout,
        gatewayFee,
        grossPlatformRevenue,
        platformRevenue: grossPlatformRevenue,
        netPlatformProfit,
        appliedRules,
        pricingModel: {
            type: "marketplace_dynamic",
            formula: "basePrice + weekend + festival + trending + demand + inventory + lastMinute + serviceFee - couponDiscount",
            weekendPricingActive: weekendTrip,
            festivalPricingActive: festivalSurcharge > 0,
            festivals,
            trendingPricingActive: trendingSurcharge > 0,
            demandPricingActive: demandSurcharge > 0 || inventorySurcharge > 0,
            serviceFeeDynamic: true
        }
    };
};

const buildBookingPayload = ({ carId, carData, userId, pickupDate, returnDate, pricing, paymentMethod, status, paymentStatus, orderId = "", paymentId = "", bookingSource = "web", paymentWindowExpiresAt = null }) => ({
    car: carId,
    owner: carData.owner,
    user: userId,
    pickupDate,
    returnDate,
    price: pricing.finalPrice,
    couponCode: pricing.couponCode,
    ownerPayout: pricing.ownerPayout,
    platformRevenue: pricing.grossPlatformRevenue,
    incentiveAmount: 0,
    settlementStatus: "pending",
    priceBreakdown: createPriceBreakdown(pricing),
    paymentId,
    orderId,
    paymentStatus,
    paymentMethod,
    status,
    bookingSource,
    paymentWindowExpiresAt
});

const clearExpiredBookingLocks = async ({ carId, pickupDate, returnDate }) => {
    const startDate = toUtcDateOnly(pickupDate);
    const endDate = toUtcDateOnly(returnDate);

    if (!startDate || !endDate) {
        return;
    }

    await BookingDateLock.deleteMany({
        car: carId,
        date: { $gte: startDate, $lte: endDate },
        expiresAt: { $ne: null, $lte: getNow() }
    });
};

const getTripLockDocs = ({ carId, bookingId, pickupDate, returnDate, expiresAt = null }) =>
    enumerateTripDates(pickupDate, returnDate).map((date) => ({
        car: carId,
        booking: bookingId,
        date,
        expiresAt
    }));

const isDuplicateKeyError = (error) => error?.code === 11000 || error?.writeErrors?.some((item) => item?.code === 11000);

const acquireBookingLocks = async ({ carId, bookingId, pickupDate, returnDate, expiresAt = null }) => {
    await clearExpiredBookingLocks({ carId, pickupDate, returnDate });

    const lockDocs = getTripLockDocs({ carId, bookingId, pickupDate, returnDate, expiresAt });

    try {
        if (lockDocs.length) {
            await BookingDateLock.insertMany(lockDocs, { ordered: true });
        }
    } catch (error) {
        if (isDuplicateKeyError(error)) {
            throw new BookingConflictError();
        }

        throw error;
    }
};

const releaseBookingLocks = async (bookingId) => {
    await BookingDateLock.deleteMany({ booking: bookingId });
};

const refreshBookingLocks = async ({ bookingId, expiresAt }) => {
    await BookingDateLock.updateMany({ booking: bookingId }, { $set: { expiresAt } });
};

const ensureBookingLocks = async ({ bookingId, carId, pickupDate, returnDate, expiresAt = null }) => {
    await clearExpiredBookingLocks({ carId, pickupDate, returnDate });

    const existingLocks = await BookingDateLock.find({ booking: bookingId }).select("date");
    const expectedDates = enumerateTripDates(pickupDate, returnDate).map((date) => toDateKey(date));
    const ownedDateSet = new Set(existingLocks.map((item) => toDateKey(item.date)));
    const missingLockDocs = getTripLockDocs({ carId, bookingId, pickupDate, returnDate, expiresAt }).filter(
        (item) => !ownedDateSet.has(toDateKey(item.date))
    );

    try {
        if (missingLockDocs.length) {
            await BookingDateLock.insertMany(missingLockDocs, { ordered: true });
        }
    } catch (error) {
        if (isDuplicateKeyError(error)) {
            throw new BookingConflictError();
        }

        throw error;
    }

    await BookingDateLock.deleteMany({
        booking: bookingId,
        date: { $nin: expectedDates.map((value) => toUtcDateOnly(value)) }
    });

    await refreshBookingLocks({ bookingId, expiresAt });
};

const persistBookingWithLocks = async ({ bookingId, payload }) => {
    try {
        const booking = await Booking.findByIdAndUpdate(
            bookingId,
            payload,
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }
        );

        return booking;
    } catch (error) {
        await releaseBookingLocks(bookingId);
        throw error;
    }
};

const markBookingRefunded = async ({ booking, refundId = "", refundReason }) => {
    booking.status = "cancelled";
    booking.paymentStatus = "refunded";
    booking.paymentWindowExpiresAt = null;
    booking.refundId = refundId;
    booking.refundReason = refundReason;
    booking.refundProcessedAt = getNow();
    await booking.save();
};

const refundBookingPaymentIfNeeded = async ({ booking, reason }) => {
    if (!booking?.paymentId || booking.paymentStatus === "refunded") {
        return null;
    }

    const refund = await createRazorpayRefund({
        paymentId: booking.paymentId,
        amount: roundAmount(Number(booking.price || 0) * 100),
        notes: {
            bookingId: booking._id.toString(),
            reason
        }
    });

    await markBookingRefunded({
        booking,
        refundId: refund.id || "",
        refundReason: reason
    });

    return refund;
};

export const cancelBookingReservation = async (booking, { reason = "booking_cancelled", refundPayment = true } = {}) => {
    booking.status = "cancelled";
    booking.paymentWindowExpiresAt = null;

    let refund = null;
    if (refundPayment && booking.paymentStatus === "paid" && booking.paymentMethod === "online" && booking.paymentId) {
        refund = await refundBookingPaymentIfNeeded({ booking, reason });
    } else {
        if (booking.paymentStatus === "pending") {
            booking.paymentStatus = "failed";
        }

        await booking.save();
    }

    await releaseBookingLocks(booking._id);
    return refund;
};

export const createOfflineBookingReservation = async ({
    carId,
    carData,
    userId,
    pickupDate,
    returnDate,
    pricing,
    bookingSource = "web"
}) => {
    const bookingId = new ObjectId();

    const legacyAvailability = await checkAvailbility(carId, pickupDate, returnDate);
    if (!legacyAvailability) {
        throw new BookingConflictError();
    }

    await acquireBookingLocks({
        carId,
        bookingId,
        pickupDate,
        returnDate,
        expiresAt: null
    });

    return persistBookingWithLocks({
        bookingId,
        payload: buildBookingPayload({
            carId,
            carData,
            userId,
            pickupDate,
            returnDate,
            pricing,
            paymentMethod: "offline",
            paymentStatus: "pending",
            status: "pending",
            bookingSource
        })
    });
};

const syncPendingBookingHold = async ({ existingBooking, carId, carData, userId, pickupDate, returnDate, pricing, paymentHoldMinutes }) => {
    const bookingId = existingBooking?._id || new ObjectId();
    const paymentWindowExpiresAt = createPaymentWindowExpiry(paymentHoldMinutes);
    const isAvaliable = await checkAvailbility(carId, pickupDate, returnDate, existingBooking?._id || null);

    if (!isAvaliable) {
        throw new BookingConflictError();
    }

    if (existingBooking) {
        await ensureBookingLocks({
            bookingId,
            carId,
            pickupDate,
            returnDate,
            expiresAt: paymentWindowExpiresAt
        });
    } else {
        await acquireBookingLocks({
            carId,
            bookingId,
            pickupDate,
            returnDate,
            expiresAt: paymentWindowExpiresAt
        });
    }

    try {
        const order = await createRazorpayOrder({
            amount: pricing.finalPrice * 100,
            receipt: `booking_${Date.now()}`,
            notes: {
                carId: carData._id.toString(),
                userId: userId.toString(),
                couponCode: pricing.couponCode
            }
        });

        const bookingHold = await persistBookingWithLocks({
            bookingId,
            payload: buildBookingPayload({
                carId,
                carData,
                userId,
                pickupDate,
                returnDate,
                pricing,
                paymentMethod: "online",
                paymentStatus: "pending",
                status: "pending",
                orderId: order.id,
                bookingSource: "web",
                paymentWindowExpiresAt
            })
        });

        return { bookingHold, order };
    } catch (error) {
        if (!existingBooking) {
            await releaseBookingLocks(bookingId);
        }

        throw error;
    }
};

export const checkAvailbilityOfCar = async (req, res) => {
    try {
        const { location, pickupDate, returnDate } = req.body;

        const cars = await Car.find({ location, isAvaliable: true });
        const availableCarsPromises = cars.map(async (car) => {
            const isAvaliable = await checkAvailbility(car._id, pickupDate, returnDate);
            return { ...car._doc, isAvaliable };
        });

        let availableCars = await Promise.all(availableCarsPromises);
        availableCars = availableCars.filter((car) => car.isAvaliable === true);

        res.json({ success: true, availableCars });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

export const getBookingPricePreview = async (req, res) => {
    try {
        const { car, pickupDate, returnDate, couponCode = "" } = req.body;
        const carData = await Car.findById(car);

        if (!carData) {
            return res.json({ success: false, message: "Car not found" });
        }

        const pricing = await calculateDynamicPricing({
            carData,
            pickupDate,
            returnDate,
            userId: req.user?._id || null,
            couponCode
        });

        res.json({ success: true, pricing });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

export const createBooking = async (req, res) => {
    try {
        const { _id } = req.user;
        const { car, pickupDate, returnDate, paymentMethod = "offline", couponCode = "" } = req.body;

        if (paymentMethod !== "offline") {
            return res.json({ success: false, message: "Use online payment to pay now, or choose offline payment." });
        }

        const isAvaliable = await checkAvailbility(car, pickupDate, returnDate);
        if (!isAvaliable) {
            return res.json({ success: false, message: "Car is not available" });
        }

        const carData = await Car.findById(car);
        if (!carData) {
            return res.json({ success: false, message: "Car not found" });
        }

        const pricing = await calculateDynamicPricing({
            carData,
            pickupDate,
            returnDate,
            userId: _id,
            couponCode
        });

        await createOfflineBookingReservation({
            carId: car,
            carData,
            userId: _id,
            pickupDate,
            returnDate,
            pricing,
            bookingSource: "web"
        });
        await invalidateBookingCache({ ownerId: carData.owner?.toString(), userId: _id.toString() });

        res.json({
            success: true,
            message: "Booking request created. Payment is pending offline.",
            pricing
        });
    } catch (error) {
        if (error instanceof BookingConflictError) {
            return res.json({ success: false, message: "Car is not available for the selected dates" });
        }

        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

export const createBookingOrder = async (req, res) => {
    try {
        const { _id } = req.user;
        const { car, pickupDate, returnDate, couponCode = "" } = req.body;
        const pricingConfig = await getPricingConfig();

        const existingHold = await Booking.findOne({
            user: _id,
            car,
            pickupDate,
            returnDate,
            status: "pending",
            paymentStatus: "pending",
            paymentMethod: "online",
            paymentWindowExpiresAt: { $gt: getNow() }
        }).sort({ createdAt: -1 });

        const isAvaliable = await checkAvailbility(car, pickupDate, returnDate, existingHold?._id || null);
        if (!isAvaliable) {
            return res.json({ success: false, message: "Car is not available" });
        }

        const carData = await Car.findById(car);
        if (!carData) {
            return res.json({ success: false, message: "Car not found" });
        }

        const pricing = await calculateDynamicPricing({
            carData,
            pickupDate,
            returnDate,
            userId: _id,
            couponCode
        });

        const { bookingHold, order } = await syncPendingBookingHold({
            existingBooking: existingHold,
            carId: car,
            carData,
            userId: _id,
            pickupDate,
            returnDate,
            pricing,
            paymentHoldMinutes: pricingConfig.paymentHoldMinutes
        });

        res.json({
            success: true,
            order,
            amount: pricing.finalPrice,
            pricing,
            bookingHoldId: bookingHold._id,
            holdExpiresAt: bookingHold.paymentWindowExpiresAt,
            key: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        if (error instanceof BookingConflictError) {
            return res.json({ success: false, message: "Car is not available for the selected dates" });
        }

        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

export const verifyBookingPayment = async (req, res) => {
    try {
        const { _id } = req.user;
        const {
            car,
            pickupDate,
            returnDate,
            couponCode = "",
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.json({ success: false, message: "Missing payment verification details" });
        }

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.json({ success: false, message: "Payment verification failed" });
        }

        const existingPaidBooking = await Booking.findOne({ paymentId: razorpay_payment_id }).populate("car");
        if (existingPaidBooking) {
            return res.json({ success: true, message: "Payment already verified", booking: existingPaidBooking });
        }

        const booking = await Booking.findOne({
            orderId: razorpay_order_id,
            user: _id,
            paymentMethod: "online"
        });

        if (!booking) {
            return res.json({
                success: false,
                message: "Booking hold not found for this payment. Please contact support before retrying."
            });
        }

        const bookingCarId = booking.car;
        const bookingPickupDate = booking.pickupDate;
        const bookingReturnDate = booking.returnDate;
        const bookingCouponCode = booking.couponCode || couponCode;

        const carData = await Car.findById(bookingCarId);
        if (!carData) {
            return res.json({ success: false, message: "Car not found" });
        }

        const refundReason = "booking_conflict_after_payment";

        try {
            const conflict = await checkAvailbility(bookingCarId, bookingPickupDate, bookingReturnDate, booking._id);
            if (!conflict) {
                throw new BookingConflictError();
            }

            await ensureBookingLocks({
                bookingId: booking._id,
                carId: bookingCarId,
                pickupDate: bookingPickupDate,
                returnDate: bookingReturnDate,
                expiresAt: null
            });
        } catch (error) {
            if (!(error instanceof BookingConflictError)) {
                throw error;
            }

            try {
                const refund = await refundBookingPaymentIfNeeded({
                    booking,
                    reason: refundReason
                });
                await releaseBookingLocks(booking._id);

                return res.json({
                    success: false,
                    refunded: true,
                    refundId: refund?.id || "",
                    message: "Payment was captured but the car was booked in the same date range by another user first. A full refund has been started automatically."
                });
            } catch (refundError) {
                await releaseBookingLocks(booking._id);
                return res.json({
                    success: false,
                    message: `Payment was received but automatic refund failed: ${refundError.message}. Please contact support immediately.`
                });
            }
        }

        const pricing = await calculateDynamicPricing({
            carData,
            pickupDate: bookingPickupDate,
            returnDate: bookingReturnDate,
            userId: _id,
            couponCode: bookingCouponCode
        });

        Object.assign(
            booking,
            buildBookingPayload({
                carId: bookingCarId,
                carData,
                userId: _id,
                pickupDate: bookingPickupDate,
                returnDate: bookingReturnDate,
                pricing,
                paymentMethod: "online",
                paymentStatus: "paid",
                status: "confirmed",
                orderId: razorpay_order_id,
                paymentId: razorpay_payment_id,
                bookingSource: booking.bookingSource || "web",
                paymentWindowExpiresAt: null
            })
        );
        booking.refundId = "";
        booking.refundReason = "";
        booking.refundProcessedAt = null;

        await booking.save();
        await booking.populate("car");
        await invalidateBookingCache({ ownerId: booking.owner?.toString(), userId: _id.toString() });

        res.json({ success: true, message: "Payment successful and booking confirmed", booking, pricing });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

export const getUserBookings = async (req, res) => {
    try {
        const { _id } = req.user;
        const bookings = await rememberCache(cacheKeys.userBookings(_id.toString()), 60, () =>
            Booking.find({ user: _id }).populate("car").sort({ createdAt: -1 })
        );
        res.json({ success: true, bookings });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

export const getOwnerBookings = async (req, res) => {
    try {
        if (req.user.role !== "owner") {
            return res.json({
                success: false,
                message: "Unauthorized"
            });
        }

        const bookings = await rememberCache(cacheKeys.ownerBookings(req.user._id.toString()), 60, () =>
            Booking.find({ owner: req.user._id })
                .populate("car user")
                .select("-user.password")
                .sort({ createdAt: -1 })
        );

        res.json({ success: true, bookings });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

export const changeBookingStatus = async (req, res) => {
    try {
        const { _id } = req.user;
        const { bookingId, status } = req.body;

        const booking = await Booking.findById(bookingId);

        if (booking.owner.toString() !== _id.toString()) {
            return res.json({ success: false, message: "Unauthorized" });
        }

        booking.status = status;

        if (status === "confirmed" && booking.paymentStatus === "paid") {
            booking.paymentWindowExpiresAt = null;
            await refreshBookingLocks({ bookingId: booking._id, expiresAt: null });
            await booking.save();
            await invalidateBookingCache({ ownerId: booking.owner?.toString(), userId: booking.user?.toString() });
            return res.json({ success: true, message: "Status Updated" });
        }

        if (status === "cancelled") {
            const refund = await cancelBookingReservation(booking, {
                reason: "owner_cancelled_booking"
            });
            await invalidateBookingCache({ ownerId: booking.owner?.toString(), userId: booking.user?.toString() });

            return res.json({
                success: true,
                message: refund ? "Status updated and payment refund started" : "Status Updated"
            });
        }

        await booking.save();
        await invalidateBookingCache({ ownerId: booking.owner?.toString(), userId: booking.user?.toString() });

        res.json({ success: true, message: "Status Updated" });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

export const cancelBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id).populate("car");

        if (!booking) {
            return res.json({ success: false, message: "Booking not found" });
        }

        if (booking.user.toString() !== req.user._id.toString()) {
            return res.json({ success: false, message: "Unauthorized" });
        }

        if (booking.status === "cancelled") {
            return res.json({ success: true, message: "Booking is already cancelled", booking });
        }

        const refund = await cancelBookingReservation(booking, {
            reason: "user_cancelled_booking"
        });
        await invalidateBookingCache({ ownerId: booking.owner?.toString(), userId: booking.user?.toString() });

        res.json({
            success: true,
            message: refund ? "Booking cancelled and refund started successfully" : "Booking cancelled successfully",
            booking
        });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};
