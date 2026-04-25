import helmet from "helmet";
import rateLimit from "express-rate-limit";

const isProduction = process.env.NODE_ENV === "production";

export const helmetMiddleware = helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: isProduction
        ? {
              useDefaults: true,
              directives: {
                  "img-src": ["'self'", "data:", "https:"],
                  "script-src": ["'self'", "'unsafe-inline'"],
                  "connect-src": ["'self'", "https:", "wss:"]
              }
          }
        : false
});

const buildLimiter = ({ windowMs, max, message }) =>
    rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            success: false,
            message
        }
    });

export const apiLimiter = buildLimiter({
    windowMs: 15 * 60 * 1000,
    max: 400,
    message: "Too many requests right now. Please try again in a moment."
});

export const authLimiter = buildLimiter({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: "Too many login or signup attempts. Please wait a few minutes and try again."
});

export const chatLimiter = buildLimiter({
    windowMs: 10 * 60 * 1000,
    max: 60,
    message: "Chat request limit reached. Please wait a little and try again."
});

export const bookingLimiter = buildLimiter({
    windowMs: 10 * 60 * 1000,
    max: 80,
    message: "Too many booking-related requests. Please slow down and try again."
});
