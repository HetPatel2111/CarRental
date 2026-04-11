import mongoose from "mongoose";
const {ObjectId} = mongoose.Schema.Types

const bookingSchema = new mongoose.Schema({
   car:{
        type:ObjectId , 
        ref:"Car" , 
        required:true       
    },
    user:{
        type:ObjectId , 
        ref:"User" , 
        required:true       
    },
    owner:{
        type:ObjectId , 
        ref:"User" , 
        required:true       
    },
    pickupDate:{
        type:Date ,  
        required:true       
    },
    returnDate:{
        type:Date,  
        required:true       
    },
    status:{
        type:String,
        enum:["pending" , "confirmed" , "cancelled"],
        default:"pending"
    },
    paymentStatus:{
        type:String,
        enum:["pending" , "paid" , "failed"],
        default:"pending"
    },
    paymentMethod:{
        type:String,
        enum:["stripe"],
        default:"stripe"
    },
    stripeSessionId:{
        type:String,
        default:""
    },
    price:{
        type:Number,
        required:true
    }
},{timestamps:true})

bookingSchema.index({ car: 1, pickupDate: 1, returnDate: 1, status: 1 })
bookingSchema.index({ owner: 1, createdAt: -1 })
bookingSchema.index({ user: 1, createdAt: -1 })
bookingSchema.index({ stripeSessionId: 1 })

const Booking = mongoose.model('Booking',bookingSchema)

export default Booking
