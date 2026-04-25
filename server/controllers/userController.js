import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import Car from '../models/Car.js'
import { cacheKeys } from '../configs/cacheKeys.js'
import { hashCacheKeyPart, rememberCache } from '../configs/cache.js'

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' })

const normalizeString = (value) => String(value || '').trim()

const buildCarFilters = (query = {}) => ({
    q: normalizeString(query.q),
    location: normalizeString(query.location),
    category: normalizeString(query.category),
    transmission: normalizeString(query.transmission),
    fuelType: normalizeString(query.fuelType),
    maxPrice: Number(query.maxPrice || 0),
    minSeats: Number(query.minSeats || 0),
    sortBy: normalizeString(query.sortBy)
})

const buildCarMatchStage = (filters) => {
    const match = { isAvaliable: true }

    if (filters.location) match.location = { $regex: new RegExp(filters.location, 'i') }
    if (filters.category) match.category = { $regex: new RegExp(`^${filters.category}$`, 'i') }
    if (filters.transmission) match.transmission = { $regex: new RegExp(filters.transmission, 'i') }
    if (filters.fuelType) match.fuel_type = { $regex: new RegExp(`^${filters.fuelType}$`, 'i') }
    if (filters.maxPrice) match.pricePerDay = { $lte: filters.maxPrice }
    if (filters.minSeats) match.seating_capacity = { $gte: filters.minSeats }

    return match
}

const getSortStage = (sortBy) => {
    if (sortBy === 'priceAsc') return { pricePerDay: 1, createdAt: -1 }
    if (sortBy === 'priceDesc') return { pricePerDay: -1, createdAt: -1 }
    if (sortBy === 'newest') return { year: -1, createdAt: -1 }
    return { createdAt: -1 }
}

const searchCars = async (filters) => {
    const match = buildCarMatchStage(filters)
    const sort = getSortStage(filters.sortBy)
    const hasSearchText = Boolean(filters.q)
    const atlasSearchIndex = process.env.MONGODB_SEARCH_INDEX || 'cars_search'

    if (hasSearchText && process.env.ENABLE_ATLAS_SEARCH === 'true') {
        try {
            const atlasResults = await Car.aggregate([
                {
                    $search: {
                        index: atlasSearchIndex,
                        text: {
                            query: filters.q,
                            path: ['brand', 'model', 'category', 'location', 'description', 'transmission', 'fuel_type'],
                            fuzzy: { maxEdits: 1, prefixLength: 1 }
                        }
                    }
                },
                { $match: match },
                { $addFields: { searchScore: { $meta: 'searchScore' } } },
                { $sort: filters.sortBy ? sort : { searchScore: -1, createdAt: -1 } }
            ])

            return atlasResults
        } catch (error) {
            console.log('Atlas Search unavailable, falling back to Mongo query:', error.message)
        }
    }

    if (hasSearchText) {
        match.$or = [
            { brand: { $regex: new RegExp(filters.q, 'i') } },
            { model: { $regex: new RegExp(filters.q, 'i') } },
            { category: { $regex: new RegExp(filters.q, 'i') } },
            { location: { $regex: new RegExp(filters.q, 'i') } },
            { description: { $regex: new RegExp(filters.q, 'i') } },
            { transmission: { $regex: new RegExp(filters.q, 'i') } },
            { fuel_type: { $regex: new RegExp(filters.q, 'i') } }
        ]
    }

    return Car.find(match).sort(sort)
}

export const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body

        if (!name || !email || !password || password.length < 8) {
            return res.json({
                success: false,
                message: "Fill all the fields"
            })
        }

        const userExists = await User.findOne({ email })
        if (userExists) {
            return res.json({
                success: false,
                message: 'User already exists'
            })
        }

        const hashedPassword = await bcrypt.hash(password, 10)
        const user = await User.create({
            name,
            email,
            password: hashedPassword
        })

        const token = generateToken(user._id.toString())
        res.json({ success: true, token })
    } catch (error) {
        console.log(error.message)
        res.json({ success: false, message: error.message })
    }
}

export const loginuser = async (req, res) => {
    try {
        const { email, password } = req.body
        const user = await User.findOne({ email })

        if (!user) {
            return res.json({
                success: false,
                message: "User not found"
            })
        }

        const isMatch = await bcrypt.compare(password, user.password)

        if (!isMatch) {
            return res.json({
                success: false,
                message: "Invalid Credentials"
            })
        }

        const token = generateToken(user._id.toString())
        res.json({ success: true, token })
    } catch (error) {
        console.log(error.message)
        res.json({ success: false, message: error.message })
    }
}

export const getUserData = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password')

        res.status(200).json({
            success: true,
            user
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const getCars = async (req, res) => {
    try {
        const filters = buildCarFilters(req.query)
        const hasFilters = Object.values(filters).some((value) => value !== '' && value !== 0)
        const cacheKey = hasFilters
            ? cacheKeys.carsSearch(hashCacheKeyPart(filters))
            : cacheKeys.carsList('public')

        const cars = await rememberCache(cacheKey, 120, () => searchCars(filters))
        res.json({ success: true, cars })
    } catch (error) {
        console.log(error.message)
        res.json({ success: false, message: error.message })
    }
}
