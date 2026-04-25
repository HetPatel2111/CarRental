import crypto from "crypto";

const DEFAULT_TTL_SECONDS = 60;
const memoryStore = new Map();
const cacheStats = {
    hits: 0,
    misses: 0,
    writes: 0,
    deletes: 0
};

const getMemoryEntry = (key) => {
    const entry = memoryStore.get(key);

    if (!entry) {
        return null;
    }

    if (entry.expiresAt <= Date.now()) {
        memoryStore.delete(key);
        return null;
    }

    return entry.value;
};

const setMemoryEntry = (key, value, ttlSeconds = DEFAULT_TTL_SECONDS) => {
    memoryStore.set(key, {
        value,
        expiresAt: Date.now() + Number(ttlSeconds || DEFAULT_TTL_SECONDS) * 1000
    });
};

const deleteMemoryByPrefix = (prefix) => {
    for (const key of memoryStore.keys()) {
        if (key.startsWith(prefix)) {
            memoryStore.delete(key);
        }
    }
};

export const connectCache = async () => null;

export const getCacheKey = (...parts) =>
    parts
        .flat()
        .filter((part) => part !== undefined && part !== null && part !== "")
        .map((part) => (typeof part === "string" ? part : JSON.stringify(part)))
        .join(":");

export const hashCacheKeyPart = (value) =>
    crypto.createHash("sha1").update(JSON.stringify(value ?? "")).digest("hex");

export const getCache = async (key) => {
    const value = getMemoryEntry(key);
    if (value !== null) {
        cacheStats.hits += 1;
        return value;
    }

    cacheStats.misses += 1;
    return null;
};

export const setCache = async (key, value, ttlSeconds = DEFAULT_TTL_SECONDS) => {
    setMemoryEntry(key, value, ttlSeconds);
    cacheStats.writes += 1;
    return value;
};

export const deleteCache = async (key) => {
    memoryStore.delete(key);
    cacheStats.deletes += 1;
};

export const deleteCacheByPrefix = async (prefix) => {
    const beforeSize = memoryStore.size;
    deleteMemoryByPrefix(prefix);
    cacheStats.deletes += Math.max(0, beforeSize - memoryStore.size);
};

export const rememberCache = async (key, ttlSeconds, factory) => {
    const cached = await getCache(key);

    if (cached !== null) {
        return cached;
    }

    const freshValue = await factory();
    await setCache(key, freshValue, ttlSeconds);
    return freshValue;
};

export const getCacheStats = () => ({
    provider: "memory",
    memoryKeys: memoryStore.size,
    ...cacheStats,
    hitRate: cacheStats.hits + cacheStats.misses === 0
        ? 0
        : Number(((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(2))
});
