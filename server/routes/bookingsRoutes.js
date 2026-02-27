import express from "express"
import {createBooking, getUserBookings , getOwnerBookings , changeBookingStatus, checkAvailbilityOfCar} from "../controllers/bookingController.js"
import {protect} from "../middleware/auth.js"


const bookingRouter = express.Router()

bookingRouter.post('/check-availability' , checkAvailbilityOfCar)
bookingRouter.post('/create', protect , createBooking)
bookingRouter.get('/user' ,protect ,getUserBookings)
bookingRouter.get('/owner' , protect , getOwnerBookings)
bookingRouter.post('/change-status' , protect , changeBookingStatus)

export default bookingRouter