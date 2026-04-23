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
    price:{
        type:Number,
        required:true
    },
    paymentId: {
        type: String,
        default: ""
    },
    orderId: {
        type: String,
        default: ""
    },
    paymentStatus: {
        type: String,
        enum: ["pending", "paid", "failed"],
        default: "pending"
    },
    paymentMethod: {
        type: String,
        enum: ["online", "offline"],
        default: "offline"
    }
},{timestamps:true})

const Booking = mongoose.model('Booking',bookingSchema)

export default Booking
