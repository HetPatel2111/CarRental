import jwt from "jsonwebtoken"
import User from "../models/User.js";


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

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "Not authorized" })
    }

    try {
        const token = authHeader.split(" ")[1]
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.user = await User.findById(decoded.id).select("-password")
        next();
    } catch (error) {
        console.log("JWT Error:", error.message)
        return res.status(401).json({ success: false, message: "Invalid token" })
    }
}