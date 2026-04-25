import express from 'express'
import 'dotenv/config'
import cors from 'cors'
import connectDB from './configs/db.js'
import { connectCache } from './configs/cache.js'
import userRouter from './routes/userRoutes.js'
import ownerRouter from './routes/ownerRoutes.js'
import bookingRouter from './routes/bookingsRoutes.js'
import chatRouter from './routes/chatRoutes.js'
import adminRouter from './routes/adminRoutes.js'
import systemRouter from './routes/systemRoutes.js'
import { apiLimiter, helmetMiddleware } from './middleware/security.js'

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '1mb' }));

// connect database
await connectDB()
await connectCache()

// middleware
app.use(helmetMiddleware)
app.use(cors())

app.get('/',(req,res)=>res.send("server is running"))
app.use('/api/system',systemRouter)
app.use(apiLimiter)
app.use('/api/user',userRouter)
app.use('/api/owner',ownerRouter)
app.use('/api/bookings',bookingRouter)
app.use('/api/chat',chatRouter)
app.use('/api/admin',adminRouter)

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>{
    console.log(`server running on port ${PORT}`)
})
