import "dotenv/config"
import bcrypt from "bcrypt"
import mongoose from "mongoose"
import connectDB from "../configs/db.js"
import User from "../models/User.js"
import Car from "../models/Car.js"
import Booking from "../models/Bookings.js"

const password = "123456789"

const demoOwner = {
    name: "Demo Fleet Owner",
    email: "owner@example.com",
    role: "owner",
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80"
}

const demoUsers = Array.from({ length: 10 }, (_, index) => ({
    name: `Demo Customer ${index + 1}`,
    email: `example${index + 1}@gmail.com`,
    role: "user",
    image: `https://i.pravatar.cc/300?img=${index + 12}`
}))

const demoCars = [
    {
        brand: "Toyota",
        model: "Corolla",
        image: "https://images.unsplash.com/photo-1623869675781-80aa31012a5a?auto=format&fit=crop&w=1200&q=80",
        year: 2022,
        category: "Sedan",
        seating_capacity: 5,
        fuel_type: "Petrol",
        transmission: "Automatic",
        pricePerDay: 1800,
        location: "New York",
        description: "Comfortable city sedan with smooth automatic transmission, generous boot space, and excellent mileage."
    },
    {
        brand: "Honda",
        model: "Civic",
        image: "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1200&q=80",
        year: 2021,
        category: "Sedan",
        seating_capacity: 5,
        fuel_type: "Petrol",
        transmission: "Manual",
        pricePerDay: 2100,
        location: "Chicago",
        description: "Sporty sedan with responsive handling, premium interiors, and reliable daily-drive comfort."
    },
    {
        brand: "Hyundai",
        model: "Creta",
        image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1200&q=80",
        year: 2023,
        category: "SUV",
        seating_capacity: 5,
        fuel_type: "Diesel",
        transmission: "Automatic",
        pricePerDay: 2600,
        location: "Houston",
        description: "Feature-rich SUV with elevated seating, strong diesel performance, and family-friendly cabin space."
    },
    {
        brand: "Mahindra",
        model: "Thar",
        image: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80",
        year: 2022,
        category: "SUV",
        seating_capacity: 4,
        fuel_type: "Diesel",
        transmission: "Manual",
        pricePerDay: 3000,
        location: "Los Angeles",
        description: "Adventure-ready SUV built for weekend trips, rough roads, and open-air driving experiences."
    },
    {
        brand: "BMW",
        model: "X5",
        image: "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=80",
        year: 2024,
        category: "Luxury SUV",
        seating_capacity: 5,
        fuel_type: "Hybrid",
        transmission: "Automatic",
        pricePerDay: 7200,
        location: "New York",
        description: "Luxury performance SUV with premium leather seating, panoramic roof, and advanced safety systems."
    },
    {
        brand: "Mercedes-Benz",
        model: "C-Class",
        image: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1200&q=80",
        year: 2023,
        category: "Luxury Sedan",
        seating_capacity: 5,
        fuel_type: "Petrol",
        transmission: "Automatic",
        pricePerDay: 6500,
        location: "Chicago",
        description: "Executive sedan with elegant cabin design, refined ride quality, and premium comfort features."
    },
    {
        brand: "Kia",
        model: "Seltos",
        image: "https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=1200&q=80",
        year: 2022,
        category: "SUV",
        seating_capacity: 5,
        fuel_type: "Petrol",
        transmission: "Automatic",
        pricePerDay: 2500,
        location: "Houston",
        description: "Smart compact SUV with connected features, roomy seating, and confident highway manners."
    },
    {
        brand: "Ford",
        model: "Mustang",
        image: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80",
        year: 2020,
        category: "Sports",
        seating_capacity: 4,
        fuel_type: "Petrol",
        transmission: "Automatic",
        pricePerDay: 8000,
        location: "Los Angeles",
        description: "Iconic sports car with powerful acceleration, bold styling, and an exciting grand touring feel."
    },
    {
        brand: "Tesla",
        model: "Model 3",
        image: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=1200&q=80",
        year: 2024,
        category: "Electric",
        seating_capacity: 5,
        fuel_type: "Electric",
        transmission: "Automatic",
        pricePerDay: 5600,
        location: "New York",
        description: "Electric sedan with instant torque, minimalist cabin, long range, and advanced driver assistance."
    },
    {
        brand: "Audi",
        model: "Q7",
        image: "https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&w=1200&q=80",
        year: 2023,
        category: "Luxury SUV",
        seating_capacity: 7,
        fuel_type: "Diesel",
        transmission: "Automatic",
        pricePerDay: 7600,
        location: "Chicago",
        description: "Seven-seat luxury SUV with refined cabin space, confident road presence, and premium ride comfort."
    }
]

const getDate = (dayOffset) => {
    const date = new Date()
    date.setDate(date.getDate() + dayOffset)
    date.setHours(0, 0, 0, 0)
    return date
}

const upsertUser = async (user, hashedPassword) => {
    return User.findOneAndUpdate(
        { email: user.email },
        { ...user, password: hashedPassword },
        { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
    )
}

const seedDemoData = async () => {
    await connectDB()

    const hashedPassword = await bcrypt.hash(password, 10)
    const owner = await upsertUser(demoOwner, hashedPassword)
    const users = await Promise.all(demoUsers.map((user) => upsertUser(user, hashedPassword)))

    await Car.deleteMany({ owner: owner._id })

    const cars = await Car.insertMany(
        demoCars.map((car) => ({
            ...car,
            owner: owner._id,
            isAvaliable: true
        }))
    )

    await Booking.deleteMany({
        user: { $in: users.map((user) => user._id) },
        owner: owner._id
    })

    const bookings = users.map((user, index) => {
        const car = cars[index]
        const pickupDate = getDate(index + 2)
        const returnDate = getDate(index + 5)
        const days = Math.ceil((returnDate - pickupDate) / (1000 * 60 * 60 * 24))

        return {
            car: car._id,
            owner: owner._id,
            user: user._id,
            pickupDate,
            returnDate,
            status: "pending",
            price: car.pricePerDay * days,
            paymentMethod: index % 2 === 0 ? "online" : "offline",
            paymentStatus: "pending"
        }
    })

    await Booking.insertMany(bookings)

    console.log("Demo data seeded successfully.")
    console.log(`Owner login: ${demoOwner.email} / ${password}`)
    console.log("Customer logins: example1@gmail.com to example10@gmail.com / 123456789")
    console.log(`Created ${users.length} users, ${cars.length} cars, and ${bookings.length} pending bookings.`)

    await mongoose.disconnect()
}

seedDemoData().catch(async (error) => {
    console.error("Failed to seed demo data:", error.message)
    await mongoose.disconnect()
    process.exit(1)
})
