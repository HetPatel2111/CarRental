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
    bookingSource: {
        type: String,
        enum: ["web", "chat", "admin"],
        default: "web"
    },
    price:{
        type:Number,
        required:true
    },
    couponCode: {
        type: String,
        default: ""
    },
    ownerPayout: {
        type: Number,
        default: 0
    },
    platformRevenue: {
        type: Number,
        default: 0
    },
    settlementStatus: {
        type: String,
        enum: ["pending", "processing", "settled"],
        default: "pending"
    },
    incentiveAmount: {
        type: Number,
        default: 0
    },
    paymentWindowExpiresAt: {
        type: Date,
        default: null
    },
    priceBreakdown: {
        rentalDays: { type: Number, default: 0 },
        basePricePerDay: { type: Number, default: 0 },
        basePrice: { type: Number, default: 0 },
        weekendSurcharge: { type: Number, default: 0 },
        festivalSurcharge: { type: Number, default: 0 },
        trendingSurcharge: { type: Number, default: 0 },
        demandSurcharge: { type: Number, default: 0 },
        inventorySurcharge: { type: Number, default: 0 },
        lastMinuteSurcharge: { type: Number, default: 0 },
        surgeAmount: { type: Number, default: 0 },
        serviceFeeBase: { type: Number, default: 0 },
        serviceFee: { type: Number, default: 0 },
        couponDiscount: { type: Number, default: 0 },
        gatewayFee: { type: Number, default: 0 },
        grossPlatformRevenue: { type: Number, default: 0 },
        netPlatformProfit: { type: Number, default: 0 },
        finalPrice: { type: Number, default: 0 },
        appliedRules: [{ type: String }]
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
        enum: ["pending", "paid", "failed", "refunded"],
        default: "pending"
    },
    refundId: {
        type: String,
        default: ""
    },
    refundReason: {
        type: String,
        default: ""
    },
    refundProcessedAt: {
        type: Date,
        default: null
    },
    paymentMethod: {
        type: String,
        enum: ["online", "offline"],
        default: "offline"
    }
},{timestamps:true})

bookingSchema.index({ user: 1, createdAt: -1 })
bookingSchema.index({ owner: 1, createdAt: -1 })
bookingSchema.index({ car: 1, pickupDate: 1, returnDate: 1, status: 1 })
bookingSchema.index({ status: 1, paymentStatus: 1, settlementStatus: 1, createdAt: -1 })
bookingSchema.index({ orderId: 1 })
bookingSchema.index({ paymentId: 1 })

const Booking = mongoose.model('Booking',bookingSchema)

export default Booking
