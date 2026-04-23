import React, { useCallback, useEffect, useState } from 'react'
import Title from '../../components/owner/Title'
import {useAppContext} from '../../contex/AppContext'
import toast from 'react-hot-toast'

const ManageBookings = () => {

  const {currency , axios} = useAppContext()
  
  const [bookings , setBookings] = useState([])

  const fetchOwnerBookings = useCallback(async()=>{
    try{
      const {data} = await axios.get('/api/bookings/owner')
      data.success ? setBookings(data.bookings) : toast.error(data.message)
    } catch(error){
      toast.error(error.message)
    }
  }, [axios])

  const changeBookingStatus = async(bookingId , status)=>{
    try{
      const {data} = await axios.post('/api/bookings/change-status' , {bookingId,status})
      
      if(data.success){
        toast.success(data.message)
        fetchOwnerBookings()
      }else{
         toast.error(data.message)
      }
    } catch(error){
      toast.error(error.message)
    }
  }

  useEffect(()=>{
    const timerId = setTimeout(fetchOwnerBookings, 0)
    return () => clearTimeout(timerId)
  },[fetchOwnerBookings])
  
  return (
    <div className='px-4 pt-10 md:px-10 w-full'>
      <Title 
        title="Manage Bookings" 
        subTitle="Track all customer bookings, approve or cancel requests, and manage booking statuses."
      />

      {/* Responsive Wrapper */}
      <div className='w-full mt-6'>
        <div className='w-full overflow-x-auto rounded-md border border-borderColor'>
          
          <table className='min-w-187.5 w-full border-collapse text-left text-sm text-gray-600'>
            
            <thead className='bg-gray-50'>
              <tr>
                <th className='p-3 font-medium whitespace-nowrap'>Car</th>
                <th className='p-3 font-medium whitespace-nowrap'>Date Range</th>
                <th className='p-3 font-medium whitespace-nowrap'>Total</th>
                <th className='p-3 font-medium whitespace-nowrap'>Payment</th>
                <th className='p-3 font-medium whitespace-nowrap'>Actions</th>
              </tr>
            </thead>

            <tbody>
              {bookings.map((booking,index) => (
                <tr key={index} className='border-t border-borderColor text-gray-500 hover:bg-gray-50 transition'>
                  
                  <td className='p-3'>
                    <div className='flex items-center gap-3 min-w-50'>
                      <img 
                        src={booking.car.image} 
                        alt="" 
                        className='h-12 w-12 rounded-md object-cover'
                      />
                      <p className='font-medium'>
                        {booking.car.brand} {booking.car.model}
                      </p>
                    </div>
                  </td>   

                  <td className='p-3 whitespace-nowrap'>
                    {booking.pickupDate.split('T')[0]} to {booking.returnDate.split('T')[0]}
                  </td>

                  <td className='p-3 whitespace-nowrap'>
                    {currency}{booking.price}
                  </td>

                  <td className='p-3 whitespace-nowrap'>
                    <span className={`px-3 py-1 rounded-full text-xs ${booking.paymentMethod === 'online' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                      {booking.paymentMethod || 'offline'} - {booking.paymentStatus || 'pending'}
                    </span>
                  </td>

                  <td className='p-3 whitespace-nowrap'>
                    {booking.status === 'pending' ? (
                      <select 
                        onChange={e => changeBookingStatus(booking._id , e.target.value)} 
                        value={booking.status} 
                        className='px-2 py-1.5 text-gray-500 border border-borderColor rounded-md outline-none'
                      >
                        <option value="pending">Pending</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="confirmed">Confirmed</option>
                      </select>
                    ) : (
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        booking.status === 'confirmed' 
                        ? 'bg-green-100 text-green-500'
                        : 'bg-red-100 text-red-500'
                      }`}>
                        {booking.status}
                      </span>
                    )}
                  </td>

                </tr>
              ))}
            </tbody>

          </table>

        </div>
      </div>

    </div>
  )
}

export default ManageBookings




// import React, { useEffect, useState } from 'react'
// import Title from '../../components/owner/Title'
// import {useAppContext} from '../../contex/AppContext'
// import toast from 'react-hot-toast'

// const ManageBookings = () => {

//   const {currency , axios} = useAppContext()
  
//   const [bookings , setBookings] = useState([])

//   const fetchOwnerBookings = async()=>{
//     try{
//       const {data} = await axios.get('/api/bookings/owner')
//       data.success ? setBookings(data.bookings) : toast.error(data.message)
//     } catch(error){
//       toast.error(error.message)
//     }
//   }

//   const changeBookingStatus = async(bookingId , status)=>{
//     try{
//       const {data} = await axios.post('/api/bookings/change-status' , {bookingId,status})
      
//       if(data.success){
//         toast.success(data.message)
//         fetchOwnerBookings()
//       }else{
//          toast.error(data.message)
//       }
//     } catch(error){
//       toast.error(error.message)
//     }
//   }

//   useEffect(()=>{
//     fetchOwnerBookings()
//   },[])
  
//   return (
//     <div className='px-4 pt-10 md:px-10 w-full'>
//       <Title title="Manage Bookings" subTitle="Track all customer bookings, approve
//       or cancel requests , and manage booking statuses."/>

//       <div className='max-w-3xl w-full rounded-md overflow-hidden border 
//       borderColor mt-6'>

//         <table className='w-full border-collapse text-left text-sm text-gray-600'>
//           <thead>
//             <tr>
//               <th className='p-3 font-medium'>Car</th>
//               <th className='p-3 font-medium '>Date Range</th>
//               <th className='p-3 font-medium'>Total</th>
//               <th className='p-3 font-medium '>Payment</th>
//               <th className='p-3 font-medium'>Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {bookings.map((booking,index) => (
//               <tr key={index} className='border-t border-borderColor text-gray-500'>
              
//               <td className='p-3 flex items-center gap-3'>
//                 <img src={booking.car.image} alt="" className='h-12 w-12
//                 aspect-square rounded-md object-cover'/>
//                 <p className='font-medium '>{booking.car.brand} {booking.car.model}</p>
//               </td>   

//               <td className='p-3'>
//                 {booking.pickupDate.split('T')[0]} to {booking.returnDate.split('T')[0]}
//               </td>

//               <td className='p-3'>{currency}{booking.price}</td>

//               <td className='p-3'>
//                 <span className='bg-gray-100 px-3 py-1 rounded-full
//                 text-xs'>offline</span>
//               </td>

//               <td className='p-3'>
//                 {booking.status === 'pending' ? (
//                   <select onChange={e => changeBookingStatus(booking._id , e.target.value)} value={booking.status} className='px-2 py-1.5 mt-1
//                   text-gray-500 border border-borderColor rounded-md
//                   outline-none'>
//                     <option value="pending">Pending</option>
//                     <option value="cancelled">Cancelled</option>
//                     <option value="confirmed">Confirmed</option>
//                   </select>
//                 ):(
//                   <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
//                     booking.status === 'confirmed' ? 'bg-green-100 text-green-500'
//                     : 'bg-red-100 text-red-500'}`}>
//                       {booking.status}
//                   </span>
//                 )}
//               </td>

//               </tr>
//             ))}
//           </tbody>

//         </table>

//       </div>
//     </div>
//   )
// }

// export default ManageBookings
