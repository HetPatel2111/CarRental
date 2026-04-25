import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { assets } from '../assets/assets';
import Loader from '../components/Loader';
import { useAppContext } from '../contex/AppContext';
import toast from 'react-hot-toast'

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

const formatCurrency = (currency, value) => `${currency}${Number(value || 0).toLocaleString('en-IN')}`

const CarDetails = () => {
  const {id} = useParams();
  const {cars,axios,user,token,pickupDate,setPickupDate,returnDate,setReturnDate,requestLogin} = useAppContext()

  const navigate = useNavigate();
  const [car, setCar] = useState(null);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('online');
  const [pricingPreview, setPricingPreview] = useState(null);
  const [pricingError, setPricingError] = useState('');
  const [isPricingLoading, setIsPricingLoading] = useState(false);
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState('');
  const [couponFeedback, setCouponFeedback] = useState('');

  const today = new Date().toISOString().split("T")[0];


  const currency = import.meta.env.VITE_CURRENCY

  const pricingRows = pricingPreview
    ? [
        { label: `Base rent (${pricingPreview.rentalDays} days)`, value: pricingPreview.basePrice },
        { label: 'Weekend surcharge', value: pricingPreview.weekendSurcharge },
        { label: 'Festival surcharge', value: pricingPreview.festivalSurcharge },
        { label: 'Trending surcharge', value: pricingPreview.trendingSurcharge },
        { label: 'High-demand surcharge', value: pricingPreview.demandSurcharge },
        { label: 'Low-inventory surcharge', value: pricingPreview.inventorySurcharge },
        { label: 'Last-minute surcharge', value: pricingPreview.lastMinuteSurcharge },
        { label: 'Service fee', value: pricingPreview.serviceFee },
      ].filter((item) => item.value > 0)
    : []

  const requestPricingPreview = async (couponCode = appliedCouponCode) => {
    const normalizedCouponCode = couponCode.trim().toUpperCase()
    const { data } = await axios.post('/api/bookings/pricing-preview', {
      car: id,
      pickupDate,
      returnDate,
      couponCode: normalizedCouponCode
    })

    if (!data.success) {
      throw new Error(data.message || 'Unable to calculate pricing right now.')
    }

    return data.pricing
  }

  const handleSubmit = async(e) =>{
    e.preventDefault();

    if (!token) {
      toast.error('Please login to continue')
      requestLogin({ redirectPath: `/car-details/${id}` })
      return
    }

    setIsPaying(true)

    try{
      if (paymentMethod === 'offline') {
        const {data} = await axios.post('/api/bookings/create',{
          car:id,
          pickupDate,
          returnDate,
          paymentMethod:'offline',
          couponCode: appliedCouponCode
        })

        if(data.success){
          toast.success(data.message)
          navigate('/my-bookings')
        }else{
          toast.error(data.message)
        }
        setIsPaying(false)
        return
      }

      const scriptLoaded = await loadRazorpayScript()

      if (!scriptLoaded) {
        toast.error('Razorpay checkout failed to load')
        setIsPaying(false)
        return
      }

      const {data} = await axios.post('/api/bookings/create-order',{
        car:id,
        pickupDate,
        returnDate,
        couponCode: appliedCouponCode
      })

      if(!data.success){
        toast.error(data.message)
        setIsPaying(false)
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
              couponCode: appliedCouponCode,
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

  useEffect(() => {
    let isActive = true

    if (!id || !pickupDate || !returnDate) {
      setPricingPreview(null)
      setPricingError('')
      setIsPricingLoading(false)
      setShowPriceBreakdown(false)
      setCouponFeedback('')
      return () => {
        isActive = false
      }
    }

    const fetchPricingPreview = async () => {
      setIsPricingLoading(true)
      setPricingError('')

      try {
        const pricing = await requestPricingPreview(appliedCouponCode)

        if (!isActive) return
        setPricingPreview(pricing)
      } catch (error) {
        if (!isActive) return
        setPricingPreview(null)
        setPricingError(error.response?.data?.message || error.message || 'Unable to calculate pricing right now.')
        setShowPriceBreakdown(false)
      } finally {
        if (isActive) {
          setIsPricingLoading(false)
        }
      }
    }

    fetchPricingPreview()

    return () => {
      isActive = false
    }
  }, [axios, id, pickupDate, returnDate, appliedCouponCode])

  const applyCoupon = async () => {
    const normalizedCouponCode = couponInput.trim().toUpperCase()

    if (!normalizedCouponCode) {
      toast.error('Enter a coupon code first')
      return
    }

    if (!pickupDate || !returnDate) {
      toast.error('Select pickup and return dates before applying a coupon')
      return
    }

    setIsPricingLoading(true)
    setPricingError('')

    try {
      const pricing = await requestPricingPreview(normalizedCouponCode)
      setPricingPreview(pricing)
      setAppliedCouponCode(normalizedCouponCode)
      setCouponInput(normalizedCouponCode)
      setCouponFeedback(`Coupon ${normalizedCouponCode} applied`)
      toast.success(`Coupon ${normalizedCouponCode} applied`)
    } catch (error) {
      setCouponFeedback(error.response?.data?.message || error.message || 'Unable to apply coupon')
      toast.error(error.response?.data?.message || error.message || 'Unable to apply coupon')
    } finally {
      setIsPricingLoading(false)
    }
  }

  const removeCoupon = () => {
    setAppliedCouponCode('')
    setCouponInput('')
    setCouponFeedback('')
    setShowPriceBreakdown(false)
  }

  return car ? (
    <div className='px-6 md:px-16 lg:px-24 xl:px-32 mt-16'>
      <button onClick={()=> navigate(-1)} className='flex items-center gap-2 mb-6
      text-gray-500 cursor-pointer'>
        <img src={assets.arrow_icon} alt="" className='rotate-180 opacity-65'/>
        Back to all cars
      </button>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12'>
        {/* Left: Car Image & Details */}
        <div className='lg:col-span-2'>
          <img src={car.image} alt="" className='w-full h-auto md:max-h-100 object-cover rounded-xl mb-6 shadow-md'/>
          <div className='space-y-6'>
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
                <div key={text} className='flex flex-col items-center bg-light p-4 rounded-lg'>
                    <img src={icon} alt="" className='h-5 mb-2'/>
                    {text}
                </div>
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

          </div>
        </div>

        {/* Right: Booking Form */}
        <form onSubmit={handleSubmit} className='shadow-lg h-max sticky top-18 rounded-xl p-6 space-y-6
        text-gray-600'>
          <div className='rounded-2xl bg-light p-4'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <p className='text-sm text-gray-500'>Estimated total</p>
                <p className='mt-1 text-3xl font-semibold text-gray-800'>
                  {isPricingLoading
                    ? 'Calculating...'
                    : pricingPreview
                      ? formatCurrency(currency, pricingPreview.finalPrice)
                      : formatCurrency(currency, car.pricePerDay)}
                </p>
                <p className='mt-1 text-sm text-gray-500'>
                  {pricingPreview
                    ? `${pricingPreview.rentalDays} billed day${pricingPreview.rentalDays > 1 ? 's' : ''}`
                    : 'Select dates to see final total'}
                </p>
              </div>
              <p className='text-right text-sm text-gray-500'>
                {formatCurrency(currency, car.pricePerDay)}
                <span className='block text-xs text-gray-400'>base per day</span>
              </p>
            </div>
          </div>

          <hr className='border-borderColor my-6'/>

          <div className='flex flex-col gap-2'>
            <label htmlFor="pickup-date">Pick up Date</label>
            {/* <input type="date" className='border border-borderColor px-3 py-2 rounded-lg' required id ='pickup-date' min={today}/> */}
            <input type="date"  min={today} value={pickupDate}  onChange={(e) => setPickupDate(e.target.value)} className='border border-borderColor px-3 py-2 rounded-lg' required id ='pickup-date'/>
          </div>

          <div className='flex flex-col gap-2'>
            <label htmlFor="return-date">Return Date</label>
            {/* <input type="date" className='border border-borderColor px-3 py-2 rounded-lg' required id ='return-date' min={new Date().toISOString().split('T')[0]}/> */}
            <input type="date" required id="return-date"  min={pickupDate || today} value={returnDate} onChange={(e) => setReturnDate(e.target.value)} className='border border-borderColor px-3 py-2 rounded-lg'/>
          </div>

          <div className='space-y-3 rounded-2xl border border-slate-200 bg-white p-4'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <p className='text-base font-semibold text-gray-800'>Coupon code</p>
                <p className='text-sm text-gray-500'>Apply a valid coupon before payment.</p>
              </div>
              {appliedCouponCode && (
                <span className='rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700'>
                  Applied: {appliedCouponCode}
                </span>
              )}
            </div>

            <div className='flex flex-col gap-3 md:flex-row'>
              <input
                type='text'
                placeholder='Enter coupon code'
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                className='flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 uppercase outline-none'
              />
              <div className='flex gap-2'>
                <button
                  type='button'
                  onClick={applyCoupon}
                  disabled={isPricingLoading}
                  className='rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400'
                >
                  Apply
                </button>
                {appliedCouponCode && (
                  <button
                    type='button'
                    onClick={removeCoupon}
                    className='rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700'
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            {couponFeedback && (
              <p className={`text-sm ${appliedCouponCode ? 'text-emerald-600' : 'text-rose-600'}`}>
                {couponFeedback}
              </p>
            )}

            {pricingPreview?.couponMessage && appliedCouponCode && (
              <p className='text-xs text-gray-500'>{pricingPreview.couponMessage}</p>
            )}
          </div>

          {pricingError && (
            <div className='rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600'>
              {pricingError}
            </div>
          )}

          {pricingPreview && (
            <div className='rounded-2xl border border-slate-200 bg-white p-4'>
              <button
                type='button'
                onClick={() => setShowPriceBreakdown((prev) => !prev)}
                className='flex w-full items-center justify-between gap-3 text-left'
              >
                <span className='text-base font-semibold text-gray-800'>
                  {showPriceBreakdown ? 'Hide price breakdown' : 'Show price breakdown'}
                </span>
                <img
                  src={assets.arrow_icon}
                  alt=''
                  className={`h-4 transition-transform ${showPriceBreakdown ? '-rotate-90' : 'rotate-90'}`}
                />
              </button>

              {showPriceBreakdown && (
                <div className='mt-4 space-y-3 border-t border-slate-100 pt-4 text-sm'>
                  {pricingRows.map((item) => (
                    <div key={item.label} className='flex items-center justify-between gap-4'>
                      <span>{item.label}</span>
                      <span className='font-medium text-gray-800'>{formatCurrency(currency, item.value)}</span>
                    </div>
                  ))}

                  {pricingPreview.couponDiscount > 0 && (
                    <div className='flex items-center justify-between gap-4 text-emerald-600'>
                      <span>Coupon discount</span>
                      <span className='font-medium'>- {formatCurrency(currency, pricingPreview.couponDiscount)}</span>
                    </div>
                  )}

                  <div className='flex items-center justify-between gap-4 border-t border-slate-100 pt-3 text-base font-semibold text-gray-900'>
                    <span>Total payable</span>
                    <span>{formatCurrency(currency, pricingPreview.finalPrice)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className='space-y-3'>
            <p className='font-medium text-gray-800'>Payment Method</p>
            <div className='grid grid-cols-2 gap-3'>
              {[
                {value:'online', label:'Online', description:'Pay now with Razorpay'},
                {value:'offline', label:'Offline', description:'Pay at pickup'}
              ].map((method)=>(
                <label key={method.value} className={`cursor-pointer rounded-xl border p-4 transition ${paymentMethod === method.value ? 'border-primary bg-primary/5 text-primary' : 'border-borderColor text-gray-600 hover:border-primary/60'}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.value}
                    checked={paymentMethod === method.value}
                    onChange={(e)=>setPaymentMethod(e.target.value)}
                    className='sr-only'
                  />
                  <span className='block font-semibold'>{method.label}</span>
                  <span className='mt-1 block text-xs text-gray-500'>{method.description}</span>
                </label>
              ))}
            </div>
          </div>

          <button disabled={isPaying} className='w-full bg-primary hover:bg-primary-dull transition-all py-3 font-medium text-white rounded-xl cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed'>{isPaying ? 'Processing...' : paymentMethod === 'online' ? 'Pay & Book Now' : 'Request Booking'}</button>

          <p className='text-center text-sm'>{paymentMethod === 'online' ? 'Secure payment powered by Razorpay' : 'Your booking will stay pending until offline payment is confirmed.'}</p>
        </form>
      </div>
    </div>
  ) : <Loader />
}

export default CarDetails
