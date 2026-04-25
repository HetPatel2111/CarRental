import mongoose from "mongoose";
import { getCacheStats } from "../configs/cache.js";

const uptimeSeconds = () => Math.round(process.uptime());

export const getPerformanceSummary = async (_req, res) => {
    try {
        const mongooseState = mongoose.connection.readyState;
        const stateLabel = mongooseState === 1
            ? "connected"
            : mongooseState === 2
                ? "connecting"
                : mongooseState === 3
                    ? "disconnecting"
                    : "disconnected";

        res.json({
            success: true,
            performance: {
                uptimeSeconds: uptimeSeconds(),
                nodeEnv: process.env.NODE_ENV || "development",
                memoryUsageMb: {
                    rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
                    heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                    heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
                },
                database: {
                    state: stateLabel,
                    host: mongoose.connection.host || "unknown",
                    name: mongoose.connection.name || "unknown"
                },
                cache: getCacheStats(),
                scalabilityNotes: [
                    "Read-heavy endpoints use in-memory response caching to reduce repeated database reads.",
                    "Cars and bookings collections include indexes for search, dashboard, and booking lookups.",
                    "Rate limiting and Helmet reduce abuse pressure on expensive API routes."
                ]
            }
        });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};
