import { deleteCacheByPrefix, getCacheKey } from "./cache.js";

export const CACHE_PREFIX = {
    cars: "cars:",
    owner: "owner:",
    admin: "admin:",
    chat: "chat:",
    booking: "booking:"
};

export const cacheKeys = {
    carsList: (suffix = "all") => getCacheKey("cars", "list", suffix),
    carsSearch: (suffix) => getCacheKey("cars", "search", suffix),
    ownerDashboard: (ownerId) => getCacheKey("owner", "dashboard", ownerId),
    ownerCars: (ownerId) => getCacheKey("owner", "cars", ownerId),
    ownerBookings: (ownerId) => getCacheKey("owner", "bookings", ownerId),
    adminDashboard: (range) => getCacheKey("admin", "dashboard", range),
    adminCoupons: () => getCacheKey("admin", "coupons"),
    adminPricing: () => getCacheKey("admin", "pricing"),
    adminSettlements: () => getCacheKey("admin", "settlements"),
    chatRecommendations: (suffix) => getCacheKey("chat", "recommend", suffix),
    userBookings: (userId) => getCacheKey("booking", "user", userId)
};

export const invalidateCarsCache = async () => {
    await deleteCacheByPrefix(CACHE_PREFIX.cars);
    await deleteCacheByPrefix(CACHE_PREFIX.chat);
};

export const invalidateOwnerCache = async (ownerId) => {
    if (!ownerId) {
        await deleteCacheByPrefix(CACHE_PREFIX.owner);
        return;
    }

    await deleteCacheByPrefix(`owner:dashboard:${ownerId}`);
    await deleteCacheByPrefix(`owner:cars:${ownerId}`);
    await deleteCacheByPrefix(`owner:bookings:${ownerId}`);
};

export const invalidateAdminCache = async () => {
    await deleteCacheByPrefix(CACHE_PREFIX.admin);
};

export const invalidateBookingCache = async ({ ownerId, userId } = {}) => {
    if (userId) {
        await deleteCacheByPrefix(`booking:user:${userId}`);
    } else {
        await deleteCacheByPrefix(CACHE_PREFIX.booking);
    }

    await invalidateOwnerCache(ownerId);
    await invalidateAdminCache();
    await invalidateCarsCache();
};
