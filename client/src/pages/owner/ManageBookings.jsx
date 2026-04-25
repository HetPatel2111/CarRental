import React, { useEffect, useMemo, useState } from 'react'
import Title from '../../components/owner/Title'
import { useAppContext } from '../../contex/AppContext'
import toast from 'react-hot-toast'

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '--'

const ManageBookings = () => {
  const { currency, axios } = useAppContext()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')

  const fetchOwnerBookings = async () => {
    try {
      setLoading(true)
      const { data } = await axios.get('/api/bookings/owner')
      data.success ? setBookings(data.bookings) : toast.error(data.message)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const changeBookingStatus = async (bookingId, status) => {
    try {
      const { data } = await axios.post('/api/bookings/change-status', { bookingId, status })
      if (data.success) {
        toast.success(data.message)
        fetchOwnerBookings()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(() => {
    fetchOwnerBookings()
  }, [])

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase()

    return bookings.filter((booking) => {
      const matchesQuery = !query || [
        booking.user?.name,
        booking.user?.email,
        booking.car?.brand,
        booking.car?.model,
        booking.car?.location
      ].join(' ').toLowerCase().includes(query)

      const matchesStatus = statusFilter === 'all' || booking.status === statusFilter
      const matchesPayment =
        paymentFilter === 'all' ||
        (paymentFilter === 'online' && booking.paymentMethod === 'online') ||
        (paymentFilter === 'offline' && booking.paymentMethod !== 'online')

      return matchesQuery && matchesStatus && matchesPayment
    })
  }, [bookings, search, statusFilter, paymentFilter])

  const summary = useMemo(() => ({
    total: bookings.length,
    pending: bookings.filter((booking) => booking.status === 'pending').length,
    confirmed: bookings.filter((booking) => booking.status === 'confirmed').length,
    revenue: bookings
      .filter((booking) => booking.status === 'confirmed')
      .reduce((sum, booking) => sum + Number(booking.price || 0), 0)
  }), [bookings])

  return (
    <div className='w-full bg-slate-50 px-4 py-8 md:px-10'>
      <div className='rounded-[28px] bg-white p-6 shadow-sm'>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
          <Title
            title='Manage Bookings'
            subTitle='Filter incoming requests, review payment state, and handle confirmations from one operator-friendly screen.'
          />
          <button
            onClick={fetchOwnerBookings}
            className='rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary'
          >
            Refresh Bookings
          </button>
        </div>
      </div>

      <div className='mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        {[
          { label: 'Total Requests', value: summary.total, tone: 'bg-slate-900 text-white' },
          { label: 'Pending Actions', value: summary.pending, tone: 'bg-amber-500 text-white' },
          { label: 'Confirmed Trips', value: summary.confirmed, tone: 'bg-emerald-500 text-white' },
          { label: 'Confirmed Revenue', value: `${currency}${summary.revenue}`, tone: 'bg-white text-slate-900 border border-slate-200' }
        ].map((card) => (
          <div key={card.label} className={`rounded-3xl p-5 shadow-sm ${card.tone}`}>
            <p className='text-sm opacity-80'>{card.label}</p>
            <p className='mt-3 text-3xl font-semibold'>{card.value}</p>
          </div>
        ))}
      </div>

      <div className='mt-6 rounded-3xl bg-white p-6 shadow-sm'>
        <div className='grid gap-4 lg:grid-cols-[1.4fr_0.8fr_0.8fr]'>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder='Search customer, car, or city'
            className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none'
          />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none'>
            <option value='all'>All statuses</option>
            <option value='pending'>Pending</option>
            <option value='confirmed'>Confirmed</option>
            <option value='cancelled'>Cancelled</option>
          </select>
          <select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)} className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none'>
            <option value='all'>All payments</option>
            <option value='online'>Online</option>
            <option value='offline'>Offline</option>
          </select>
        </div>

        <div className='mt-6 overflow-x-auto'>
          <table className='min-w-full text-left text-sm text-gray-600'>
            <thead className='border-b border-slate-100 text-gray-500'>
              <tr>
                <th className='pb-4 font-medium'>Booking</th>
                <th className='pb-4 font-medium'>Trip Window</th>
                <th className='pb-4 font-medium'>Amount</th>
                <th className='pb-4 font-medium'>Payment</th>
                <th className='pb-4 font-medium'>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan='5' className='py-10 text-center text-gray-500'>Loading bookings...</td>
                </tr>
              ) : filteredBookings.length ? filteredBookings.map((booking) => (
                <tr key={booking._id} className='border-b border-slate-100 align-top'>
                  <td className='py-4'>
                    <div className='flex items-center gap-3'>
                      <img src={booking.car?.image} alt='' className='h-14 w-14 rounded-2xl object-cover' />
                      <div>
                        <p className='font-semibold text-slate-900'>{booking.car?.brand} {booking.car?.model}</p>
                        <p className='text-xs text-gray-500'>{booking.user?.name || 'Customer'} • {booking.user?.email || 'No email'}</p>
                        <p className='text-xs text-gray-400'>{booking.car?.location || 'No location'}</p>
                      </div>
                    </div>
                  </td>
                  <td className='py-4'>
                    <p className='font-medium text-slate-900'>{formatDate(booking.pickupDate)}</p>
                    <p className='text-xs text-gray-500'>to {formatDate(booking.returnDate)}</p>
                  </td>
                  <td className='py-4'>
                    <p className='font-semibold text-slate-900'>{currency}{booking.price}</p>
                    <p className='text-xs text-gray-500'>owner payout {currency}{booking.ownerPayout || booking.price}</p>
                  </td>
                  <td className='py-4'>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${booking.paymentMethod === 'online' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                      {booking.paymentMethod || 'offline'} • {booking.paymentStatus || 'pending'}
                    </span>
                  </td>
                  <td className='py-4'>
                    {booking.status === 'pending' ? (
                      <select
                        onChange={(event) => changeBookingStatus(booking._id, event.target.value)}
                        value={booking.status}
                        className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 outline-none'
                      >
                        <option value='pending'>Pending</option>
                        <option value='confirmed'>Confirm</option>
                        <option value='cancelled'>Cancel</option>
                      </select>
                    ) : (
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        booking.status === 'confirmed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-600'
                      }`}>
                        {booking.status}
                      </span>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan='5' className='py-10 text-center text-gray-500'>No bookings match these filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default ManageBookings
