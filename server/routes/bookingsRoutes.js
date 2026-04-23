import express from "express"
import {
    createBooking,
    createBookingOrder,
    verifyBookingPayment,
    getUserBookings,
    getOwnerBookings,
    changeBookingStatus,
    checkAvailbilityOfCar,
    cancelBooking
} from "../controllers/bookingController.js"
import {protect} from "../middleware/auth.js"


const bookingRouter = express.Router()

bookingRouter.post('/check-availability' , checkAvailbilityOfCar)
bookingRouter.post('/create', protect , createBooking)
bookingRouter.post('/create-order', protect , createBookingOrder)
bookingRouter.post('/verify-payment', protect , verifyBookingPayment)
bookingRouter.get('/user' ,protect ,getUserBookings)
bookingRouter.get('/owner' , protect , getOwnerBookings)
bookingRouter.post('/change-status' , protect , changeBookingStatus)
bookingRouter.delete('/:id', protect, cancelBooking)

export default bookingRouter
