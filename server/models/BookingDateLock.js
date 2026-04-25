import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

const bookingDateLockSchema = new mongoose.Schema(
    {
        car: {
            type: ObjectId,
            ref: "Car",
            required: true
        },
        booking: {
            type: ObjectId,
            ref: "Booking",
            required: true
        },
        date: {
            type: Date,
            required: true
        },
        expiresAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

bookingDateLockSchema.index({ car: 1, date: 1 }, { unique: true });
bookingDateLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const BookingDateLock = mongoose.model("BookingDateLock", bookingDateLockSchema);

export default BookingDateLock;
