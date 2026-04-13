import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { assets } from '../assets/assets';
import Loader from '../components/Loader';
import { useAppContext } from '../contex/AppContext';
import toast from 'react-hot-toast'
import {motion} from 'motion/react'

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })

const CarDetails = () => {
  const {id} = useParams();
  const {cars,axios,user,token,pickupDate,setPickupDate,returnDate,setReturnDate} = useAppContext()

  const navigate = useNavigate();
  const [car, setCar] = useState(null);
  const [isPaying, setIsPaying] = useState(false);

  const today = new Date().toISOString().split("T")[0];


  const currency = import.meta.env.VITE_CURRENCY

  const handleSubmit = async(e) =>{
    e.preventDefault();

    if (!token) {
      toast.error('Please login to continue')
      navigate('/')
      return
    }

    setIsPaying(true)

    try{
      const scriptLoaded = await loadRazorpayScript()

      if (!scriptLoaded) {
        toast.error('Razorpay checkout failed to load')
        return
      }

      const {data} = await axios.post('/api/bookings/create-order',{
        car:id,
        pickupDate,
        returnDate
      })

      if(!data.success){
        toast.error(data.message)
        return
      }

      const options = {
        key: data.key,
        amount: data.order.amount,
        currency: data.order.currency,
        name: 'CarRental',
        description: `${car.brand} ${car.model} booking payment`,
        order_id: data.order.id,
        handler: async (response) => {
          try {
            const verification = await axios.post('/api/bookings/verify-payment', {
              car: id,
              pickupDate,
              returnDate,
              ...response
            })

            if (verification.data.success) {
              toast.success(verification.data.message)
              navigate('/my-bookings')
            } else {
              toast.error(verification.data.message)
            }
          } catch (error) {
            toast.error(error.response?.data?.message || error.message)
          } finally {
            setIsPaying(false)
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || ''
        },
        theme: {
          color: '#0f766e'
        },
        modal: {
          ondismiss: () => {
            setIsPaying(false)
            toast.error('Payment cancelled')
          }
        }
      }

      const razorpay = new window.Razorpay(options)
      razorpay.open()
    }catch(error){
      toast.error(error.response?.data?.message || error.message)
      setIsPaying(false)
    }
  }

  useEffect(()=>{
    setCar(cars.find(car => car._id == id))
  },[cars , id])

  return car ? (
    <div className='px-6 md:px-16 lg:px-24 xl:px-32 mt-16'>
      <button onClick={()=> navigate(-1)} className='flex items-center gap-2 mb-6
      text-gray-500 cursor-pointer'>
        <img src={assets.arrow_icon} alt="" className='rotate-180 opacity-65'/>
        Back to all cars
      </button>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12'>
        {/* Left: Car Image & Details */}
        <motion.div 
        initial={{opacity:0,y:30}}
        animate={{opacity:1,y:0}}
        transition={{duration:0.6}}
        className='lg:col-span-2'>
          <motion.img 
          initial={{opacity:0,scale:0.98}}
          animate={{opacity:1,scale:1}}
          transition={{duration:0.5}}
          src={car.image} alt="" className='w-full h-auto md:max-h-100 object-cover rounded-xl mb-6 shadow-md'/>
          <motion.div 
          initial={{opacity:0}}
          animate={{opacity:1}}
          transition={{duration:0.5,delay:0.2}}
          className='space-y-6'>
            <div>
              <h1 className='text-3xl font-bold'>{car.brand}{car.model}</h1>
              <p className='text-gray-500 text-lg'>{car.category} {car.year}</p>
            </div>
            <hr className='border-borderColor my-6'/>

            <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
              {[
                {icon: assets.users_icon , text: `${car.seating_capacity} Seats`},
                {icon: assets.fuel_icon , text: car.fuel_type},
                {icon: assets.car_icon , text: car.transmission},
                {icon: assets.location_icon , text: car.location},
              ].map(({icon,text})=>(
                <motion.div 
                initial={{opacity:0,y:10}}
                animate={{opacity:1,y:0}}
                transition={{duration:0.4,}}
                key={text} className='flex flex-col items-center bg-light p-4 rounded-lg'>
                    <img src={icon} alt="" className='h-5 mb-2'/>
                    {text}
                </motion.div>
              ))}
            </div>

              {/* {Description} */}
              <div>
                <h1 className='text-xl font-medium mb-3'>Description</h1>
                <p className='text-gray-500'>{car.description}</p>
              </div>

              {/* {Features} */}
              <div>
                <h1 className='text-xl font-medium mb-3'>Features</h1>
                <ul className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                  {
                    ["360 Camera" , "Bluetooth" , "GPS" , "Heated Seats" , "Rear View Mirror"].map((item)=>(
                      <li key={item} className='flex items-center text-gray-500'>
                        <img src={assets.check_icon} alt="" className='h-4 mr-2' />
                        {item}
                      </li>
                    ))
                  }
                </ul>
              </div>

          </motion.div>
        </motion.div>

        {/* Right: Booking Form */}
        <motion.form 
        initial={{opacity:0,y:30}}
        animate={{opacity:1,y:0}}
        transition={{duration:0.6,delay:0.3}}
        onSubmit={handleSubmit} className='shadow-lg h-max sticky top-18 rounded-xl p-6 space-y-6
        text-gray-600'>
          <p className='flex items-center justify-between text-2xl text-gray-800
          font-semibold'>{currency}{car.pricePerDay} <span className='text-base text-gray-400 font-normal'>Per day</span>
          </p>

          <hr className='border-borderColor my-6'/>

          <div className='flex flex-col gap-2'>
            <label htmlFor="pickup-date">Pick up Date</label>
            {/* <input type="date" className='border border-borderColor px-3 py-2 rounded-lg' required id ='pickup-date' min={today}/> */}
            <input type="date"  min={today} value={pickupDate}  onChange={(e) => setPickupDate(e.target.value)} className='border border-borderColor px-3 py-2 rounded-lg' required id ='pickup-date'/>
          </div>

          <div className='flex flex-col gap-2'>
            <label htmlFor="return-date">Pick up Date</label>
            {/* <input type="date" className='border border-borderColor px-3 py-2 rounded-lg' required id ='return-date' min={new Date().toISOString().split('T')[0]}/> */}
            <input type="date" required id="return-date"  min={pickupDate || today} value={returnDate} onChange={(e) => setReturnDate(e.target.value)} className='border border-borderColor px-3 py-2 rounded-lg'/>
          </div>

          <button disabled={isPaying} className='w-full bg-primary hover:bg-primary-dull transition-all py-3 font-medium text-white rounded-xl cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed'>{isPaying ? 'Processing...' : 'Pay & Book Now'}</button>

          <p className='text-center text-sm'>Secure payment powered by Razorpay</p>
        </motion.form>
      </div>
    </div>
  ) : <Loader />
}

export default CarDetails
