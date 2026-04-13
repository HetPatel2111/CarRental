import crypto from "crypto";
import Booking from "../models/Bookings.js";
import Car from "../models/Car.js";

// Function to check Availbility of car for a given Date
const checkAvailbility = async(car,pickupDate , returnDate)=>{
    const bookings = await Booking.find({
        car,
        pickupDate:{$lte:returnDate},
        returnDate:{$gte:pickupDate}
    })
    return bookings.length === 0;
}

const calculateBookingPrice = (pricePerDay, pickupDate, returnDate) => {
    const picked = new Date(pickupDate)
    const returned = new Date(returnDate)
    const diffInMs = returned - picked

    if (Number.isNaN(picked.getTime()) || Number.isNaN(returned.getTime()) || diffInMs <= 0) {
        throw new Error("Please select valid pickup and return dates")
    }

    const noOfDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24))
    return pricePerDay * noOfDays
}

const createBasicAuthHeader = () => {
    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    if (!keyId || !keySecret) {
        throw new Error("Razorpay keys are missing in server environment")
    }

    const encodedCredentials = Buffer.from(`${keyId}:${keySecret}`).toString("base64")
    return `Basic ${encodedCredentials}`
}

const createRazorpayOrder = async ({ amount, receipt, notes }) => {
    const response = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
            "Authorization": createBasicAuthHeader(),
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            amount,
            currency: "INR",
            receipt,
            notes
        })
    })

    const data = await response.json()

    if (!response.ok) {
        throw new Error(data?.error?.description || "Unable to create Razorpay order")
    }

    return data
}

// API to check Availability of Cars for given Date and location
export const checkAvailbilityOfCar = async(req,res)=>{
    try{
        const {location , pickupDate , returnDate} = req.body

        // Fetch all available cars for the given location
        const cars = await Car.find({location , isAvaliable:true})

        // Check car availability for the given data range using promise
        const availableCarsPromises = cars.map(async(car)=>{
            const isAvaliable = await checkAvailbility(car._id , pickupDate , returnDate)
            return {...car._doc , isAvaliable:isAvaliable}
        })

        let availableCars = await Promise.all(availableCarsPromises)
        availableCars = availableCars.filter(car => car.isAvaliable === true)

        res.json({success:true , availableCars})

    } catch(error){
        console.log(error.message)
        res.json({success:false, message:error.message})
    }
}


// Api for booking
export const createBooking = async(req,res)=>{
    try{
        const {_id} = req.user
        const {car,pickupDate,returnDate} = req.body

        const isAvaliable = await checkAvailbility(car,pickupDate,returnDate)

        if(!isAvaliable){
            return res.json({success:false , message:"Car is not available"})
        }

        const carData = await Car.findById(car)

        // Calculate price based on PickupDate and returnDate
        const picked = new Date(pickupDate)
        const returned = new Date(returnDate)
        const noOfDays = Math.ceil((returned-picked)) / (1000 * 60 * 60 * 24)
        const price = carData.pricePerDay * noOfDays

        await Booking.create({
            car,
            owner:carData.owner,
            user:_id,
            pickupDate,
            returnDate,
            price
        })

        res.json({success:true, message:"Booking Created"})

    }catch(error){
        console.log(error.message)
        res.json({success:false, message:error.message})
    }
}

// API to create Razorpay order for a booking
export const createBookingOrder = async(req,res)=>{
    try{
        const {_id} = req.user
        const {car, pickupDate, returnDate} = req.body

        const isAvaliable = await checkAvailbility(car, pickupDate, returnDate)

        if(!isAvaliable){
            return res.json({success:false , message:"Car is not available"})
        }

        const carData = await Car.findById(car)

        if (!carData) {
            return res.json({ success: false, message: "Car not found" })
        }

        const price = calculateBookingPrice(carData.pricePerDay, pickupDate, returnDate)
        const order = await createRazorpayOrder({
            amount: price * 100,
            receipt: `booking_${Date.now()}`,
            notes: {
                carId: carData._id.toString(),
                userId: _id.toString()
            }
        })

        res.json({
            success: true,
            order,
            amount: price,
            key: process.env.RAZORPAY_KEY_ID
        })

    }catch(error){
        console.log(error.message)
        res.json({success:false, message:error.message})
    }
}

// API to verify Razorpay payment and create booking
export const verifyBookingPayment = async(req,res)=>{
    try{
        const {_id} = req.user
        const {
            car,
            pickupDate,
            returnDate,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.json({ success: false, message: "Missing payment verification details" })
        }

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex")

        if (expectedSignature !== razorpay_signature) {
            return res.json({ success: false, message: "Payment verification failed" })
        }

        const isAvaliable = await checkAvailbility(car, pickupDate, returnDate)

        if(!isAvaliable){
            return res.json({success:false , message:"Car is not available now. Please choose different dates."})
        }

        const carData = await Car.findById(car)

        if (!carData) {
            return res.json({ success: false, message: "Car not found" })
        }

        const price = calculateBookingPrice(carData.pricePerDay, pickupDate, returnDate)

        const existingBooking = await Booking.findOne({ paymentId: razorpay_payment_id })
        if (existingBooking) {
            return res.json({ success: true, message: "Payment already verified", booking: existingBooking })
        }

        const booking = await Booking.create({
            car,
            owner:carData.owner,
            user:_id,
            pickupDate,
            returnDate,
            price,
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id,
            paymentStatus: "paid",
            status: "confirmed"
        })

        res.json({success:true, message:"Payment successful and booking created", booking})

    }catch(error){
        console.log(error.message)
        res.json({success:false, message:error.message})
    }
}

// Api to list User Bookings
export const getUserBookings = async(req,res)=>{
    try{
        const {_id} = req.user
       const bookings = await Booking.find({ user: _id }).populate('car').sort({ createdAt: -1 })
        res.json({success:true , bookings})

    }catch(error){
        console.log(error.message)
        res.json({success:false, message:error.message})
    }
}

// API to get Owner Bookings

export const getOwnerBookings = async(req,res)=>{
    try{
        if(req.user.role !== 'owner'){
            return res.json({
                success:false,
                message:"Unauthorized"
            })
        }

        const bookings = await Booking.find({owner:req.user._id}).populate
        ('car user').select("-user.password").sort({createdAt:-1})

        res.json({success:true,bookings})
    }catch(error) {
        console.log(error.message)
        res.json({ success: false, message: error.message })
    }
}


// API to change Booking status
export const changeBookingStatus = async(req,res)=>{
    try{
       const {_id} = req.user
       const {bookingId , status} = req.body

       const booking = await Booking.findById(bookingId)

       if(booking.owner.toString() !== _id.toString()){
        return res.json({success:false , message:"Unauthorized"})
       }

       booking.status = status
       await booking.save()

       res.json({success:true , message:"Status Updated"})
    }catch(error) {
        console.log(error.message)
        res.json({ success: false, message: error.message })
    }
}
