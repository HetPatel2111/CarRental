import fs from "fs"
import imageKit from "../configs/imageKit.js"
import { rememberCache } from "../configs/cache.js"
import { cacheKeys, invalidateCarsCache, invalidateOwnerCache } from "../configs/cacheKeys.js"
import Booking from "../models/Bookings.js"
import Car from "../models/Car.js"
import User from "../models/User.js"

export const changeRoleToOwner = async(req, res) => {
    try {
        const {_id} = req.user
        await User.findByIdAndUpdate(_id, {role: "owner"})
        res.json({
            success: true,
            message: "Now you can list cars"
        })
    } catch(error) {
        console.log(error.message)
        res.json({ success: false, message: error.message })
    }
}

export const addCar = async(req, res) => {
    try {
        if (!req.file) {
            return res.json({
                success: false,
                message: "Image is required"
            })
        }

        const {_id} = req.user
        const carData = JSON.parse(req.body.carData)
        const imageFile = req.file

        const fileBuffer = fs.readFileSync(imageFile.path)
        const response = await imageKit.upload({
            file: fileBuffer,
            fileName: imageFile.originalname,
            folder: '/cars'
        })

        const image = imageKit.url({
            path: response.filePath,
            transformation: [
                {width: '1280'},
                {quality: 'auto'},
                {format: 'webp'}
            ]
        })

        await Car.create({ ...carData, owner: _id, image })
        await invalidateCarsCache()
        await invalidateOwnerCache(_id.toString())

        res.json({
            success: true,
            message: "Car Added"
        })
    } catch(error) {
        console.log(error.message)
        res.json({ success: false, message: error.message })
    }
}

export const getOwnerCars = async(req,res)=>{
    try{
        const {_id} = req.user
        const cars = await rememberCache(cacheKeys.ownerCars(_id.toString()), 90, () =>
            Car.find({owner:_id}).sort({ createdAt: -1 })
        )
        res.json({success:true , cars})
    }catch(error) {
        console.log(error.message)
        res.json({ success: false, message: error.message })
    }
}

export const toggleCarAvailability = async(req,res)=>{
    try{
        const {_id} = req.user
        const {carId} = req.body
        const car = await Car.findById(carId)

        if(car.owner.toString() != _id.toString()){
            return res.json({
                success:false,
                message:"Unauthorized"
            })
        }

        car.isAvaliable = !car.isAvaliable
        await car.save()
        await invalidateCarsCache()
        await invalidateOwnerCache(_id.toString())

        res.json({success:true , message:"Availbility Toggled"})
    }catch(error) {
        console.log(error.message)
        res.json({ success: false, message: error.message })
    }
}

export const deleteCar = async(req,res)=>{
    try{
        const {_id} = req.user
        const {carId} = req.body
        const car = await Car.findById(carId)

        if(car.owner.toString() != _id.toString()){
            return res.json({
                success:false,
                message:"Unauthorized"
            })
        }

        car.owner = null
        car.isAvaliable = false

        await car.save()
        await invalidateCarsCache()
        await invalidateOwnerCache(_id.toString())

        res.json({success:true , message:"Car Removed"})
    }catch(error) {
        console.log(error.message)
        res.json({ success: false, message: error.message })
    }
}

export const getDashboardData = async(req,res)=>{
    try{
        const {_id,role} = req.user

        if(role !== 'owner'){
            return res.json({
                success:false,
                message:"Unauthorized"
            })
        }

        const dashboardData = await rememberCache(cacheKeys.ownerDashboard(_id.toString()), 90, async () => {
            const cars = await Car.find({owner:_id})
            const bookings = await Booking.find({owner:_id}).populate('car').sort({createdAt:-1})
            const pendingBookings = bookings.filter((booking) => booking.status === "pending")
            const completeBookings = bookings.filter((booking) => booking.status === "confirmed")
            const monthlyRevenue = bookings
                .filter((booking) => booking.status === 'confirmed')
                .reduce((acc,booking)=> acc + Number(booking.ownerPayout || booking.price || 0), 0)

            return {
                totalCars:cars.length,
                totalBookings : bookings.length,
                pendingBookings : pendingBookings.length,
                completeBookings: completeBookings.length,
                recentBookings: bookings.slice(0,3),
                monthlyRevenue
            }
        })
        
        res.json({success:true , dashboardData})
    }catch(error) {
        console.log(error.message)
        res.json({ success: false, message: error.message })
    }
}

export const updateUserImage = async(req,res)=>{
    try{
        const {_id} = req.user
        const imageFile = req.file

        const fileBuffer = fs.readFileSync(imageFile.path)
        const response = await imageKit.upload({
            file: fileBuffer,
            fileName: imageFile.originalname,
            folder: '/users'
        })

        const image = imageKit.url({
            path: response.filePath,
            transformation: [
                {width: '400'},
                {quality: 'auto'},
                {format: 'webp'}
            ]
        })

        await User.findByIdAndUpdate(_id,{image})
        res.json({success:true , message:"Image updated"})
    } catch(error){
        console.log(error.message)
        res.json({ success: false, message: error.message })
    }
}
