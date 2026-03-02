import React, { useState } from 'react'
import { assets, cityList } from '../assets/assets'
import {useAppContext} from "../contex/AppContext"
import {motion} from 'motion/react'

const Hero = () => {

  const [PickupLocation , setPickupLocation] = useState('');

  const {pickupDate , setPickupDate , returnDate , setReturnDate , navigate} = useAppContext();

  const handleSearch = (e)=>{
    e.preventDefault()
    navigate('/cars?PickupLocation=' + PickupLocation + '&pickupDate=' + pickupDate + '&returnDate=' + returnDate)
  }
  
  const today = new Date().toISOString().split("T")[0];
//    const [pickupDate, setPickupDate] = useState("");
//   const [returnDate, setReturnDate] = useState("");

  return (
    <motion.div 
    initial={{opacity:0}}
    animate={{opacity:1}}
    transition={{duration:0.8}}
    className='min-h-screen flex flex-col items-center justify-center gap-10 sm:gap-14 bg-light text-center px-4 sm:px-6 pt-24 pb-10'>
        <h1
        initial={{y:50,opacity:0}}
        animate={{y:0,opacity:1}}
        transition={{duration:0.8 , delay:0.2}} 
        className='text-3xl sm:text-4xl md:text-5xl font-semibold max-w-2xl'>Luxury cars on Rent</h1>

        <motion.form 
        initial={{scale:0.95 , opacity:0 , y:50}}
        animate={{scale:1,opacity:1,y:0}}
        transition={{duration:0.6 ,delay:0.4}}

        onSubmit={handleSearch} className='flex flex-col md:flex-row items-start md:items-center
        justify-between p-5 sm:p-6 rounded-2xl md:rounded-full w-full max-w-sm md:max-w-5xl 
        bg-white shadow-[0px_8px_20px_rgba(0,0,0,0.1)]'>

            <div className='flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10 md:ml-8 w-full'>
                <div className='flex flex-col items-start gap-2'>
                    <select required value={PickupLocation} onChange={(e)=>setPickupLocation(e.target.value)}>
                        <option value="">Pickup Location</option>
                        {cityList.map((city)=> <option value={city} key={city}>{city}</option>)}
                    </select>

                    <p className='px-1 text-sm text-gray-500'>{PickupLocation ? 
                    PickupLocation : 'Please select location'}</p>
                </div>
                <div className='flex flex-col items-start gap-2'>
                        <label htmlFor="pickup-date">Pick-up Date</label>
                        <input value={pickupDate} onChange={e=>setPickupDate(e.target.value)}  type="date" id="pickup-date" min={today}   className='text-sm text-gray-500' required/>
                </div>
                <div className='flex flex-col items-start gap-2'>
                        <label htmlFor="return-date">Return Date</label>
                        <input value={returnDate} onChange={e=>setReturnDate(e.target.value)} type="date" id="return-date"  min={pickupDate || today}  className='text-sm text-gray-500' required/>
                </div>
            </div>
                <motion.button
                whileHover={{scale:1.05}}
                whileTap={{scale:0.95}}
                className='flex items-center justify-center gap-1 px-9 py-3
                    mt-4 md:mt-0 w-full md:w-auto bg-primary hover:bg-primary-dull text-white rounded-full
                    cursor-pointer'>
                        <img src={assets.search_icon} alt="Search" className='brightness-300'/>
                    Search
                </motion.button>

        </motion.form>

        <motion.img
        initial={{y:100,opacity:0}}
        animate={{y:0,opacity:1}}
        transition={{duration:0.8,delay:0.6}}
        src={assets.main_car} alt="car" className='max-h-56 sm:max-h-74 w-full max-w-3xl object-contain' />
    </motion.div>
  )
}

export default Hero
