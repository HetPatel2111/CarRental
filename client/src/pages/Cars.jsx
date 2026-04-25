import React, { useEffect, useMemo, useState } from 'react'
import Title from '../components/Title'
import { assets } from '../assets/assets'
import CarCard from '../components/CarCard'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {useAppContext} from "../contex/AppContext"
import toast from 'react-hot-toast'
import {motion} from 'motion/react'

const Cars = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const pickupLocation = searchParams.get('PickupLocation')
  const pickupDate = searchParams.get('pickupDate')
  const returnDate = searchParams.get('returnDate')
  const queryText = searchParams.get('q') || ''
  const recommendedIds = (searchParams.get('recommendedIds') || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)

  const {cars,axios} = useAppContext()

  const [input,setInput] = useState(queryText)
  const [sourceCars,setSourceCars] = useState([])
  const [loading,setLoading] = useState(false)

  const isSearchData = pickupLocation && pickupDate && returnDate
  const chatFilters = useMemo(() => ({
    location: searchParams.get('location') || pickupLocation || '',
    category: searchParams.get('category') || '',
    transmission: searchParams.get('transmission') || '',
    fuelType: searchParams.get('fuelType') || '',
    minSeats: Number(searchParams.get('minSeats') || 0),
    maxPrice: Number(searchParams.get('maxPrice') || 0),
    sortBy: searchParams.get('sortBy') || '',
  }), [searchParams, pickupLocation])

  useEffect(() => {
    setInput(queryText)
  }, [queryText])

  const searchCarAvailability = async()=>{
    try{
      setLoading(true)
      const {data} = await axios.post('/api/bookings/check-availability',
      {location:pickupLocation , pickupDate , returnDate})

      if(data.success){
        setSourceCars(data.availableCars)
        if(data.availableCars.length === 0){
          toast('No cars available')
        }
        return null
      }

      toast.error(data.message || 'Unable to check car availability')
      setSourceCars([])
    }catch(error){
      toast.error(error.message)
      setSourceCars([])
    } finally {
      setLoading(false)
    }
  }

  const fetchFilteredCars = async () => {
    try {
      setLoading(true)
      const params = {}

      if (input.trim()) params.q = input.trim()
      if (chatFilters.location) params.location = chatFilters.location
      if (chatFilters.category) params.category = chatFilters.category
      if (chatFilters.transmission) params.transmission = chatFilters.transmission
      if (chatFilters.fuelType) params.fuelType = chatFilters.fuelType
      if (chatFilters.minSeats) params.minSeats = chatFilters.minSeats
      if (chatFilters.maxPrice) params.maxPrice = chatFilters.maxPrice
      if (chatFilters.sortBy) params.sortBy = chatFilters.sortBy

      const { data } = await axios.get('/api/user/cars', { params })

      if (data.success) {
        setSourceCars(data.cars)
      } else {
        toast.error(data.message || 'Unable to search cars')
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{
    if(isSearchData){
      searchCarAvailability()
      return
    }

    fetchFilteredCars()
  },[cars, isSearchData, pickupLocation, pickupDate, returnDate, input, chatFilters.location, chatFilters.category, chatFilters.transmission, chatFilters.fuelType, chatFilters.minSeats, chatFilters.maxPrice, chatFilters.sortBy])

  const filteredCars = useMemo(() => {
    if (recommendedIds.length === 0) {
      return sourceCars
    }

    return sourceCars.filter((car) => recommendedIds.includes(car._id))
  }, [sourceCars, recommendedIds])

  const activeFilters = [
    chatFilters.location && `Location: ${chatFilters.location}`,
    chatFilters.category && `Category: ${chatFilters.category}`,
    chatFilters.transmission && `Transmission: ${chatFilters.transmission}`,
    chatFilters.fuelType && `Fuel: ${chatFilters.fuelType}`,
    chatFilters.minSeats && `Seats: ${chatFilters.minSeats}+`,
    chatFilters.maxPrice && `Budget: INR ${chatFilters.maxPrice}`,
    pickupDate && returnDate && `Dates: ${pickupDate} to ${returnDate}`,
    recommendedIds.length > 0 && `Recommended matches`,
  ].filter(Boolean)

  return (
    <div>
      <motion.div 
      initial={{opacity:0,y:30}}
      animate={{opacity:1,y:0}}
      transition={{duration:0.6,ease:'easeOut'}}

      className='flex flex-col items-center py-20 bg-light max-md:px-4'>
        <Title title='Available Cars' subTitle='Browse our selection of premium
        vehicles avaliable for your next adventure'/>

        <motion.div 
        initial={{opacity:0,y:20}}
        animate={{opacity:1,y:0}}
        transition={{duration:0.5,delay:0.3}}
        className='flex items-center bg-white px-4 mt-6 max-w-140 w-full h-12 rounded-full shadow'>
          <img src={assets.search_icon} alt="" className='w-4.5 h-4.5 mr-2' />
          <input onChange={(e)=> setInput(e.target.value)} value={input} type="text" placeholder='Search by make, model or features' className='w-full h-full outline-none text-gray-500'/>
          <img src={assets.filter_icon} alt="" className='w-4.5 h-4.5 ml-2' />
        </motion.div>
      </motion.div>

      <motion.div 
      initial={{opacity:0}}
      animate={{opacity:1}}
      transition={{duration:0.5,delay:0.6}}
      className='px-6 md:px-16 lg:px-24 xl:px-32 mt-10'>
        <p className='text-gray-500 xl:px-20 max-w-7xl mx-auto'>Showing {filteredCars.length} Cars</p>
        {loading && <p className='mt-3 text-sm text-gray-400 xl:px-20 max-w-7xl mx-auto'>Refreshing search results...</p>}

        {activeFilters.length > 0 && (
          <div className='mt-4 flex flex-wrap items-center gap-3 xl:px-20 max-w-7xl mx-auto'>
            {activeFilters.map((filter)=>(
              <span key={filter} className='rounded-full bg-light px-4 py-2 text-sm text-gray-600'>
                {filter}
              </span>
            ))}

            <button
              onClick={() => navigate('/cars')}
              className='rounded-full border border-borderColor px-4 py-2 text-sm text-gray-600 transition hover:border-primary hover:text-primary'
            >
              Clear Filters
            </button>
          </div>
        )}

        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-4
        xl:px-20 max-w-7xl mx-auto'>
          {filteredCars.map((car,index)=>(
            <motion.div 
            initial={{opacity:0,y:20}}
            animate={{opacity:1,y:0}}
            transition={{duration:0.4,delay:0.1*index}}
            key={index}>
              <CarCard car={car}/>
            </motion.div>
          ))}
        </div>

        {filteredCars.length === 0 && (
          <div className='mt-10 rounded-3xl bg-light px-6 py-10 text-center xl:px-20 max-w-4xl mx-auto'>
            <p className='text-xl font-medium text-gray-700'>No cars match these filters yet.</p>
            <p className='mt-2 text-sm text-gray-500'>Try adjusting the budget, dates, city, or use the chatbot to broaden the search.</p>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default Cars
