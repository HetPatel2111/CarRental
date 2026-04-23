import jwt from "jsonwebtoken"
import User from "../models/User.js";

const getBearerToken = (authHeader = "") => {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null
    }

    return authHeader.split(" ")[1]
}


// export const protect = async(req , res , next)=>{
//     const token = req.headers.authorization;

//     if(!token){
//         return res.status(401).json({
//             success:false,
//             message:"not authorized"
//         })
//     }

//     try{
//         // const userId = jwt.decode(token , process.env.JWT_SECRET)

//         // if(!userId){
//         //     return res.json({
//         //         success:false,
//         //         message:"not authorized"
//         //     })
//         // }

//         // req.user = await User.findById(decoded.id).select("-password")
//         // next();

//         const decoded = jwt.verify(token, process.env.JWT_SECRET) // ✅ verify not decode

//         if (!decoded) {
//             return res.status(401).json({ success: false, message: "Not authorized" })
//         }

//         req.user = await User.findById(decoded.id).select("-password") // ✅ decoded.id not decoded
//         next();
//     } catch(error){
//         return res.json({
//             success:false,
//             message:"not authorized"
//         })
//     }
// }

export const protect = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    const token = getBearerToken(authHeader)

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Please log in to continue."
        })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.user = await User.findById(decoded.id).select("-password")

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Your account session is no longer valid. Please log in again."
            })
        }

        next();
    } catch (error) {
        console.log("JWT Error:", error.message)
        return res.status(401).json({
            success: false,
            message: "Your session has expired. Please log in again."
        })
    }
}

export const optionalProtect = async (req, _res, next) => {
    const token = getBearerToken(req.headers.authorization)

    if (!token) {
        req.user = null
        return next()
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.user = await User.findById(decoded.id).select("-password")
    } catch (error) {
        req.user = null
        req.authError = "Your session has expired. Please log in again."
    }

    next()
}
