import express from "express"
import { getCars, getUserData, loginuser, registerUser } from "../controllers/userController.js"
import { getPerformanceSummary } from "../controllers/systemController.js"
import { protect } from "../middleware/auth.js"
import { authLimiter } from "../middleware/security.js"


const userRouter = express.Router()

userRouter.post('/register',authLimiter,registerUser)
userRouter.post('/login',authLimiter,loginuser) 
userRouter.get('/data',protect,getUserData)
userRouter.get('/cars',getCars)
userRouter.get('/performance-summary',getPerformanceSummary)


export default userRouter
