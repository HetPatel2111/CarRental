import mongoose from "mongoose";
const {ObjectId} = mongoose.Schema.Types

const carSchema = new mongoose.Schema({
    owner:{type:ObjectId , ref:'User'},
    brand:{type:String , required:true, trim: true},
    model:{type:String , required:true, trim: true},
    image:{type:String , required:true},
    year:{type:Number , required:true, min: 1990},
    category:{type:String , required:true, trim: true},
    seating_capacity:{type:Number , required:true, min: 1},
    fuel_type:{type:String , required:true, trim: true},
    transmission:{type:String , required:true, trim: true},
    pricePerDay:{type:Number , required:true, min: 1},
    location:{type:String , required:true, trim: true},
    description:{type:String , required:true, trim: true},
    isAvaliable:{type:Boolean , default:true},
    isDeleted:{type:Boolean, default:false},
},{timestamps:true})

carSchema.index({ owner: 1, isDeleted: 1 })
carSchema.index({ location: 1, isAvaliable: 1, isDeleted: 1 })

const Car = mongoose.model('Car',carSchema)

export default Car
