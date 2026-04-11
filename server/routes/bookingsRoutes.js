import express from "express"
import {
    createBooking,
    getUserBookings,
    getOwnerBookings,
    changeBookingStatus,
    checkAvailbilityOfCar,
    createCheckoutSession,
    verifyCheckoutSession,
    cancelPendingPayment,
} from "../controllers/bookingController.js"
import {protect} from "../middleware/auth.js"


const bookingRouter = express.Router()

bookingRouter.post('/check-availability' , checkAvailbilityOfCar)
bookingRouter.post('/create', protect , createBooking)
bookingRouter.post('/checkout-session', protect, createCheckoutSession)
bookingRouter.get('/user' ,protect ,getUserBookings)
bookingRouter.get('/owner' , protect , getOwnerBookings)
bookingRouter.get('/verify-payment', protect, verifyCheckoutSession)
bookingRouter.post('/cancel-payment', protect, cancelPendingPayment)
bookingRouter.post('/change-status' , protect , changeBookingStatus)

export default bookingRouter
