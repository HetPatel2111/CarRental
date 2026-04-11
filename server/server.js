import express from "express";
import "dotenv/config";
import cors from "cors";
import connectDB from "./configs/db.js";
import userRouter from "./routes/userRoutes.js";
import ownerRouter from "./routes/ownerRoutes.js";
import bookingRouter from "./routes/bookingsRoutes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

const app = express();

await connectDB();

const allowedOrigins = [
    process.env.CLIENT_URL,
    ...(process.env.CLIENT_URLS || "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    "http://localhost:5173",
    "https://car-rental-lake-two.vercel.app",
];

const uniqueAllowedOrigins = [...new Set(allowedOrigins.filter(Boolean))];

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || uniqueAllowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(new Error(`CORS blocked for origin: ${origin}`));
        },
        credentials: true,
    })
);
app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => res.send("server is running"));
app.use("/api/user", userRouter);
app.use("/api/owner", ownerRouter);
app.use("/api/bookings", bookingRouter);
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`server running on port ${PORT}`);
});
