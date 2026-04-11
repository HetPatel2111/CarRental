import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 8,
    },
    role: {
        type: String,
        default: 'user',
        enum: ['user', 'owner'],
    },
    image: {
        type: String,
        default: ''
    }
}, { timestamps: true })

userSchema.index({ email: 1 }, { unique: true })

const User = mongoose.model('User', userSchema)

export default User
