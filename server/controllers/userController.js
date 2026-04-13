import User from '../models/User.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import Car from '../models/Car.js'

// Genearte JWT token
// const generateToken = (userId)=>{
//     const payload = userId
//     return jwt.sign(payload,process.env.JWT_SECRET)
// }
const generateToken = (id) => {
    console.log("JWT_SECRET used for signing:", process.env.JWT_SECRET) // 👈 add
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' })
}

// Register User
export const registerUser = async(req,res)=>{
    try{
        console.log(req.body)
        const {name,email,password} = req.body

        if(!name || !email || !password || password.length<8){
            return res.json({
                success:false,
                message:"Fill all the fields"
            })
        }

        const userExists = await User.findOne({email})
        if(userExists){
            return res.json({
                success:false,
                message:'User already exists'
            })
        }

        const hashedPassword = await bcrypt.hash(password,10)
        const user = await User.create({
            name,email,password:hashedPassword
        })

        const token = generateToken(user._id.toString())
        res.json({success:true , token})

    }catch(error){
        console.log(error.message)
        res.json({success:false , message:error.message})
    }
}


// Login User
export const loginuser = async(req,res)=>{
    try{
        const {email,password} = req.body 
        const user = await User.findOne({email})

        if(!user){
            return res.json({
                success:false,
                message:"User not found"
            })
        }

        const isMatch = await bcrypt.compare(password,user.password)

        if(!isMatch){
            return res.json({
                success:false,
                message:"Invalid Credentials"
            })
        }

        const token = generateToken(user._id.toString())
        res.json({success:true , token})

    } catch(error){
        console.log(error.message)
        res.json({success:false , message:error.message})
    }
}

// Get User data using Token(JWT)

// export const getUserData = async(req,res) =>{
//     try{
//         const {user} = req;
//         res.json({
//             success:true,
//             user
//         })
//     } catch(error){
//         console.log(error.message)
//         res.json({success:false , message:error.message})
//     }
// }
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



// Get All Cars for the Frontend
export const getCars = async(req,res)=>{
    try{
        const cars = await Car.find({isAvaliable:true})
        res.json({success:true , cars})
    }catch(error){
        console.log(error.message)
        res.json({success:false , message:error.message})
    }
}