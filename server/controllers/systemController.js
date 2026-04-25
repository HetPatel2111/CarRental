import mongoose from "mongoose";
import { getCacheStats } from "../configs/cache.js";

const uptimeSeconds = () => Math.round(process.uptime());
let lastKeepAliveAt = null;

const getDatabaseState = () => {
    const mongooseState = mongoose.connection.readyState;

    return mongooseState === 1
        ? "connected"
        : mongooseState === 2
            ? "connecting"
            : mongooseState === 3
                ? "disconnecting"
                : "disconnected";
};

const getBaseSystemPayload = () => ({
    timestamp: new Date().toISOString(),
    uptimeSeconds: uptimeSeconds(),
    nodeEnv: process.env.NODE_ENV || "development",
    database: {
        state: getDatabaseState(),
        host: mongoose.connection.host || "unknown",
        name: mongoose.connection.name || "unknown"
    },
    cache: getCacheStats(),
    lastKeepAliveAt
});

const pingDatabase = async () => {
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
        return {
            ok: false,
            skipped: true,
            message: "Database ping skipped because the connection is not ready."
        };
    }

    await mongoose.connection.db.admin().ping();

    return {
        ok: true,
        skipped: false,
        message: "Database ping completed."
    };
};

export const getHealthStatus = async (_req, res) => {
    try {
        const system = getBaseSystemPayload();

        res.status(200).json({
            success: true,
            service: "car-rental-server",
            status: system.database.state === "connected" ? "healthy" : "degraded",
            system
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const runKeepAlive = async (_req, res) => {
    try {
        const databasePing = await pingDatabase();
        lastKeepAliveAt = new Date().toISOString();

        res.status(200).json({
            success: true,
            message: "Keep-alive request completed.",
            source: "vercel-cron-ready-endpoint",
            databasePing,
            system: getBaseSystemPayload()
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getPerformanceSummary = async (_req, res) => {
    try {
        const system = getBaseSystemPayload();

        res.json({
            success: true,
            performance: {
                uptimeSeconds: system.uptimeSeconds,
                nodeEnv: system.nodeEnv,
                memoryUsageMb: {
                    rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
                    heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                    heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
                },
                database: system.database,
                cache: system.cache,
                lastKeepAliveAt: system.lastKeepAliveAt,
                scalabilityNotes: [
                    "Read-heavy endpoints use in-memory response caching to reduce repeated database reads.",
                    "Cars and bookings collections include indexes for search, dashboard, and booking lookups.",
                    "Rate limiting and Helmet reduce abuse pressure on expensive API routes.",
                    "A dedicated keep-alive endpoint can be scheduled to warm the deployment without loading business routes."
                ]
            }
        });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};
