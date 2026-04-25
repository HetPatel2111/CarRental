import express from "express"
import {
    createBooking,
    createBookingOrder,
    verifyBookingPayment,
    getUserBookings,
    getOwnerBookings,
    changeBookingStatus,
    checkAvailbilityOfCar,
    cancelBooking,
    getBookingPricePreview
} from "../controllers/bookingController.js"
import {protect} from "../middleware/auth.js"
import { bookingLimiter } from "../middleware/security.js"


const bookingRouter = express.Router()

bookingRouter.post('/check-availability' , bookingLimiter, checkAvailbilityOfCar)
bookingRouter.post('/pricing-preview' , bookingLimiter, getBookingPricePreview)
bookingRouter.post('/create', bookingLimiter, protect , createBooking)
bookingRouter.post('/create-order', bookingLimiter, protect , createBookingOrder)
bookingRouter.post('/verify-payment', bookingLimiter, protect , verifyBookingPayment)
bookingRouter.get('/user' ,protect ,getUserBookings)
bookingRouter.get('/owner' , protect , getOwnerBookings)
bookingRouter.post('/change-status' , bookingLimiter, protect , changeBookingStatus)
bookingRouter.delete('/:id', bookingLimiter, protect, cancelBooking)

export default bookingRouter
