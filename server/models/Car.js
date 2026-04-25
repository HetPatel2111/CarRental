import mongoose from "mongoose";
const {ObjectId} = mongoose.Schema.Types

const carSchema = new mongoose.Schema({
    owner:{type:ObjectId , ref:'User'},
    brand:{type:String , required:true},
    model:{type:String , required:true},
    image:{type:String , required:true},
    buyDate:{type:Date , default:null},
    year:{type:Number , required:true},
    category:{type:String , required:true},
    seating_capacity:{type:Number , required:true},
    fuel_type:{type:String , required:true},
    transmission:{type:String , required:true},
    pricePerDay:{type:Number , required:true},
    location:{type:String , required:true},
    description:{type:String , required:true},
    isAvaliable:{type:Boolean , default:true},
},{timestamps:true})

carSchema.index({
    brand: "text",
    model: "text",
    category: "text",
    location: "text",
    description: "text",
    transmission: "text",
    fuel_type: "text"
})

carSchema.index({ location: 1, category: 1, pricePerDay: 1, year: -1, isAvaliable: 1 })

const Car = mongoose.model('Car',carSchema)

export default Car
