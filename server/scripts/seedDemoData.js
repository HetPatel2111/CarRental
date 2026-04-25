import "dotenv/config"
import bcrypt from "bcrypt"
import mongoose from "mongoose"
import connectDB from "../configs/db.js"
import User from "../models/User.js"
import Car from "../models/Car.js"
import Booking from "../models/Bookings.js"
import { calculateDynamicPricing } from "../controllers/bookingController.js"
import { getOrCreatePricingConfig, seedDefaultCoupons } from "../controllers/adminController.js"

const password = "123456789"

const adminAccount = {
    name: "Het Admin",
    email: "het@admin.com",
    role: "admin",
    image: "https://i.pravatar.cc/300?img=65"
}

const demoOwners = [
    {
        key: "owner11",
        name: "Example Fleet 11",
        email: "example11@gmail.com",
        role: "owner",
        image: "https://i.pravatar.cc/300?img=31"
    },
    {
        key: "owner12",
        name: "Example Fleet 12",
        email: "example12@gmail.com",
        role: "owner",
        image: "https://i.pravatar.cc/300?img=32"
    }
]

const demoCustomers = Array.from({ length: 10 }, (_, index) => ({
    key: `customer${index + 1}`,
    name: `Demo Customer ${index + 1}`,
    email: `example${index + 1}@gmail.com`,
    role: "user",
    image: `https://i.pravatar.cc/300?img=${index + 12}`
}))

const demoCars = [
    {
        key: "ny_budget",
        ownerKey: "owner11",
        brand: "Toyota",
        model: "Innova Crysta",
        image: "https://images.unsplash.com/photo-1549924231-f129b911e442?auto=format&fit=crop&w=1200&q=80",
        buyDate: "2024-01-15",
        year: 2024,
        category: "SUV",
        seating_capacity: 7,
        fuel_type: "Diesel",
        transmission: "Automatic",
        pricePerDay: 3200,
        location: "New York",
        description: "Spacious family SUV with comfortable captain seats, highway stability, and dependable long-trip comfort."
    },
    {
        key: "ny_premium",
        ownerKey: "owner11",
        brand: "BMW",
        model: "X3",
        image: "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=80",
        buyDate: "2025-02-08",
        year: 2025,
        category: "Premium",
        seating_capacity: 5,
        fuel_type: "Petrol",
        transmission: "Automatic",
        pricePerDay: 6900,
        location: "New York",
        description: "Premium SUV with strong road presence, plush cabin materials, and refined city-to-highway performance."
    },
    {
        key: "chi_sedan",
        ownerKey: "owner11",
        brand: "Honda",
        model: "City",
        image: "https://images.unsplash.com/photo-1617469767053-3d7e7a246833?auto=format&fit=crop&w=1200&q=80",
        buyDate: "2023-11-20",
        year: 2023,
        category: "Sedan",
        seating_capacity: 5,
        fuel_type: "Petrol",
        transmission: "Automatic",
        pricePerDay: 2400,
        location: "Chicago",
        description: "Reliable sedan with roomy rear seating, smooth automatic gearbox, and strong city mileage."
    },
    {
        key: "ny_compact",
        ownerKey: "owner12",
        brand: "Kia",
        model: "Seltos",
        image: "https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=1200&q=80",
        buyDate: "2024-08-05",
        year: 2024,
        category: "SUV",
        seating_capacity: 5,
        fuel_type: "Petrol",
        transmission: "Automatic",
        pricePerDay: 2800,
        location: "New York",
        description: "Compact SUV with connected features, high seating position, and an easy-to-drive automatic setup."
    },
    {
        key: "hou_luxury",
        ownerKey: "owner12",
        brand: "Mercedes-Benz",
        model: "C-Class",
        image: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1200&q=80",
        buyDate: "2025-01-12",
        year: 2025,
        category: "Luxury",
        seating_capacity: 5,
        fuel_type: "Petrol",
        transmission: "Automatic",
        pricePerDay: 7200,
        location: "Houston",
        description: "Luxury sedan with elegant cabin design, soft ride quality, and premium chauffeur-style comfort."
    },
    {
        key: "la_adventure",
        ownerKey: "owner12",
        brand: "Mahindra",
        model: "Thar",
        image: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80",
        buyDate: "2023-09-10",
        year: 2023,
        category: "SUV",
        seating_capacity: 4,
        fuel_type: "Diesel",
        transmission: "Manual",
        pricePerDay: 3500,
        location: "Los Angeles",
        description: "Weekend-ready SUV built for scenic road trips, beach drives, and rough-surface adventures."
    }
]

const now = new Date()
now.setHours(0, 0, 0, 0)

const addDays = (baseDate, dayOffset) => {
    const date = new Date(baseDate)
    date.setDate(date.getDate() + dayOffset)
    date.setHours(0, 0, 0, 0)
    return date
}

const daysAgo = (value) => addDays(now, -value)
const daysFromNow = (value) => addDays(now, value)

const bookingScenarios = [
    {
        userKey: "customer1",
        carKey: "ny_budget",
        pickupDate: daysFromNow(1),
        returnDate: daysFromNow(2),
        createdAt: daysAgo(1),
        paymentMethod: "online",
        paymentStatus: "paid",
        status: "confirmed",
        settlementStatus: "pending",
        couponCode: "SAVE200",
        bookingSource: "web"
    },
    {
        userKey: "customer2",
        carKey: "ny_premium",
        pickupDate: daysFromNow(1),
        returnDate: daysFromNow(2),
        createdAt: daysAgo(1),
        paymentMethod: "online",
        paymentStatus: "paid",
        status: "confirmed",
        settlementStatus: "processing",
        bookingSource: "web"
    },
    {
        userKey: "customer3",
        carKey: "ny_compact",
        pickupDate: daysFromNow(1),
        returnDate: daysFromNow(2),
        createdAt: daysAgo(1),
        paymentMethod: "online",
        paymentStatus: "paid",
        status: "confirmed",
        settlementStatus: "pending",
        bookingSource: "chat"
    },
    {
        userKey: "customer4",
        carKey: "ny_budget",
        pickupDate: daysFromNow(8),
        returnDate: daysFromNow(9),
        createdAt: daysAgo(6),
        paymentMethod: "online",
        paymentStatus: "paid",
        status: "confirmed",
        settlementStatus: "settled",
        bookingSource: "web"
    },
    {
        userKey: "customer5",
        carKey: "ny_budget",
        pickupDate: daysFromNow(15),
        returnDate: daysFromNow(16),
        createdAt: daysAgo(12),
        paymentMethod: "online",
        paymentStatus: "paid",
        status: "confirmed",
        settlementStatus: "pending",
        couponCode: "SAVE200",
        bookingSource: "web"
    },
    {
        userKey: "customer6",
        carKey: "hou_luxury",
        pickupDate: new Date("2026-05-01T00:00:00.000Z"),
        returnDate: new Date("2026-05-03T00:00:00.000Z"),
        createdAt: daysAgo(3),
        paymentMethod: "online",
        paymentStatus: "paid",
        status: "confirmed",
        settlementStatus: "pending",
        couponCode: "SAVE200",
        bookingSource: "web"
    },
    {
        userKey: "customer7",
        carKey: "chi_sedan",
        pickupDate: daysFromNow(20),
        returnDate: daysFromNow(22),
        createdAt: daysAgo(18),
        paymentMethod: "offline",
        paymentStatus: "pending",
        status: "pending",
        settlementStatus: "pending",
        bookingSource: "web"
    },
    {
        userKey: "customer8",
        carKey: "la_adventure",
        pickupDate: daysFromNow(10),
        returnDate: daysFromNow(12),
        createdAt: daysAgo(10),
        paymentMethod: "online",
        paymentStatus: "failed",
        status: "cancelled",
        settlementStatus: "pending",
        bookingSource: "web"
    },
    {
        userKey: "customer9",
        carKey: "chi_sedan",
        pickupDate: daysFromNow(35),
        returnDate: daysFromNow(37),
        createdAt: daysAgo(40),
        paymentMethod: "online",
        paymentStatus: "paid",
        status: "confirmed",
        settlementStatus: "settled",
        bookingSource: "web"
    },
    {
        userKey: "customer10",
        carKey: "hou_luxury",
        pickupDate: new Date("2026-08-15T00:00:00.000Z"),
        returnDate: new Date("2026-08-16T00:00:00.000Z"),
        createdAt: daysAgo(65),
        paymentMethod: "online",
        paymentStatus: "paid",
        status: "confirmed",
        settlementStatus: "pending",
        bookingSource: "web"
    }
]

const upsertUser = async (user, hashedPassword) =>
    User.findOneAndUpdate(
        { email: user.email },
        { ...user, password: hashedPassword },
        { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
    )

const createPriceBreakdown = (pricing) => ({
    rentalDays: pricing.rentalDays,
    basePricePerDay: pricing.basePricePerDay,
    basePrice: pricing.basePrice,
    weekendSurcharge: pricing.weekendSurcharge,
    festivalSurcharge: pricing.festivalSurcharge,
    trendingSurcharge: pricing.trendingSurcharge,
    demandSurcharge: pricing.demandSurcharge,
    inventorySurcharge: pricing.inventorySurcharge,
    lastMinuteSurcharge: pricing.lastMinuteSurcharge,
    surgeAmount: pricing.surgeAmount,
    serviceFeeBase: pricing.serviceFeeBase,
    serviceFee: pricing.serviceFee,
    couponDiscount: pricing.couponDiscount,
    gatewayFee: pricing.gatewayFee,
    grossPlatformRevenue: pricing.grossPlatformRevenue,
    netPlatformProfit: pricing.netPlatformProfit,
    finalPrice: pricing.finalPrice,
    appliedRules: pricing.appliedRules
})

const configurePricingForDemo = async () => {
    const config = await getOrCreatePricingConfig()

    Object.assign(config, {
        serviceFeeBase: 69,
        serviceFeeWeekend: 40,
        serviceFeeFestival: 55,
        serviceFeeTrending: 45,
        serviceFeeDemand: 40,
        serviceFeeInventory: 30,
        serviceFeePremium: 90,
        weekendPercent: 18,
        trendingPercent: 12,
        demandPercent: 10,
        inventoryPercent: 8,
        lastMinutePercent: 7,
        trendingBookingThreshold: 2,
        demandBookingThreshold: 2,
        lowInventoryThreshold: 3,
        gatewayRate: 0.02,
        gatewayFixedFee: 3,
        paymentHoldMinutes: 20,
        festivals: [
            { name: "Labour Day Rush", startDate: new Date("2026-05-01"), endDate: new Date("2026-05-03"), surchargePercent: 20, active: true },
            { name: "Independence Day", startDate: new Date("2026-08-15"), endDate: new Date("2026-08-16"), surchargePercent: 14, active: true },
            { name: "Diwali Peak", startDate: new Date("2026-11-08"), endDate: new Date("2026-11-12"), surchargePercent: 25, active: true }
        ]
    })

    await config.save()
}

const seedDemoData = async () => {
    await connectDB()

    const hashedPassword = await bcrypt.hash(password, 10)

    const admin = await upsertUser(adminAccount, hashedPassword)
    const owners = await Promise.all(demoOwners.map((owner) => upsertUser(owner, hashedPassword)))
    const customers = await Promise.all(demoCustomers.map((customer) => upsertUser(customer, hashedPassword)))

    const ownerMap = new Map(owners.map((owner, index) => [demoOwners[index].key, owner]))
    const customerMap = new Map(customers.map((customer, index) => [demoCustomers[index].key, customer]))
    const ownerIds = owners.map((owner) => owner._id)
    const customerIds = customers.map((customer) => customer._id)

    await configurePricingForDemo()
    await seedDefaultCoupons()

    await Booking.deleteMany({
        $or: [
            { owner: { $in: ownerIds } },
            { user: { $in: customerIds } }
        ]
    })

    await Car.deleteMany({ owner: { $in: ownerIds } })

    const cars = await Car.insertMany(
        demoCars.map((car) => ({
            ...car,
            owner: ownerMap.get(car.ownerKey)._id,
            buyDate: car.buyDate ? new Date(car.buyDate) : null,
            isAvaliable: true
        }))
    )

    const carMap = new Map(cars.map((car, index) => [demoCars[index].key, car]))

    let createdBookings = 0

    for (const scenario of bookingScenarios) {
        const user = customerMap.get(scenario.userKey)
        const car = carMap.get(scenario.carKey)

        const pricing = await calculateDynamicPricing({
            carData: car,
            pickupDate: scenario.pickupDate,
            returnDate: scenario.returnDate,
            userId: user._id,
            couponCode: scenario.couponCode || ""
        })

        const booking = new Booking({
            car: car._id,
            owner: car.owner,
            user: user._id,
            pickupDate: scenario.pickupDate,
            returnDate: scenario.returnDate,
            price: pricing.finalPrice,
            couponCode: pricing.couponCode,
            ownerPayout: pricing.ownerPayout,
            platformRevenue: pricing.grossPlatformRevenue,
            incentiveAmount: scenario.incentiveAmount || 0,
            settlementStatus: scenario.settlementStatus || "pending",
            priceBreakdown: createPriceBreakdown(pricing),
            paymentMethod: scenario.paymentMethod,
            paymentStatus: scenario.paymentStatus,
            status: scenario.status,
            bookingSource: scenario.bookingSource || "web",
            paymentId: scenario.paymentStatus === "paid" ? `pay_${user._id}_${car._id}` : "",
            orderId: scenario.paymentStatus === "paid" ? `order_${user._id}_${car._id}` : "",
            paymentWindowExpiresAt: null,
            createdAt: scenario.createdAt,
            updatedAt: scenario.createdAt
        })

        await booking.save()
        createdBookings += 1
    }

    console.log("Demo data seeded successfully.")
    console.log(`Admin login: ${adminAccount.email} / ${password}`)
    console.log(`Owner login: ${demoOwners[0].email} / ${password}`)
    console.log(`Owner login: ${demoOwners[1].email} / ${password}`)
    console.log("Customer logins: example1@gmail.com to example10@gmail.com / 123456789")
    console.log(`Created ${owners.length} owners, ${customers.length} customers, ${cars.length} cars, and ${createdBookings} bookings.`)

    await mongoose.disconnect()
}

seedDemoData().catch(async (error) => {
    console.error("Failed to seed demo data:", error.message)
    await mongoose.disconnect()
    process.exit(1)
})
