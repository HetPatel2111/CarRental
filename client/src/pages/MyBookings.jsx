import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { assets } from '../assets/assets'
import Title from '../components/Title'
import { useAppContext } from '../contex/AppContext'
import toast from 'react-hot-toast'

const formatDate = (date) => {
  if (!date) return 'N/A'

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(date))
}

const getRentalDays = (pickupDate, returnDate) => {
  const start = new Date(pickupDate)
  const end = new Date(returnDate)
  const diff = end - start

  if (Number.isNaN(diff) || diff < 0) return 0

  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1
}

const getStatusStyle = (status) => {
  if (status === 'confirmed') return 'bg-emerald-100 text-emerald-700'
  if (status === 'cancelled') return 'bg-rose-100 text-rose-700'

  return 'bg-amber-100 text-amber-700'
}

const buildMonthlySeries = (bookings) => {
  const monthMap = new Map()

  bookings.forEach((booking) => {
    const date = new Date(booking.createdAt)
    if (Number.isNaN(date.getTime())) return

    const label = date.toLocaleString('en-IN', { month: 'short' })
    monthMap.set(label, (monthMap.get(label) || 0) + Number(booking.price || 0))
  })

  return Array.from(monthMap.entries()).slice(-6).map(([label, value]) => ({ label, value }))
}

const MiniLineChart = ({ data }) => {
  const maxValue = Math.max(...data.map((item) => item.value), 1)
  const points = data.map((item, index) => {
    const x = data.length === 1 ? 160 : (index / (data.length - 1)) * 320
    const y = 120 - (item.value / maxValue) * 90
    return `${x},${y}`
  }).join(' ')

  return (
    <div className='mt-5'>
      <svg viewBox='0 0 320 140' className='h-44 w-full overflow-visible'>
        <defs>
          <linearGradient id='bookingLine' x1='0' y1='0' x2='1' y2='0'>
            <stop offset='0%' stopColor='#2563EB' />
            <stop offset='100%' stopColor='#14B8A6' />
          </linearGradient>
        </defs>
        {[30, 60, 90, 120].map((y) => (
          <line key={y} x1='0' x2='320' y1={y} y2={y} stroke='#E2E8F0' strokeWidth='1' />
        ))}
        <polyline points={points} fill='none' stroke='url(#bookingLine)' strokeLinecap='round' strokeLinejoin='round' strokeWidth='5' />
        {data.map((item, index) => {
          const x = data.length === 1 ? 160 : (index / (data.length - 1)) * 320
          const y = 120 - (item.value / maxValue) * 90

          return (
            <g key={item.label}>
              <circle cx={x} cy={y} r='5' fill='#2563EB' stroke='white' strokeWidth='3' />
              <text x={x} y='138' textAnchor='middle' className='fill-slate-500 text-[11px]'>{item.label}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

const MyBookings = () => {
  const { axios, user, token, currency, navigate, requestLogin } = useAppContext()
  const [bookings, setBookings] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)

  const fetchmyBooking = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await axios.get('/api/bookings/user')
      if (data.success) {
        setBookings(data.bookings)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }, [axios])

  useEffect(() => {
    if (user) {
      fetchmyBooking()
      return
    }

    if (!token && !localStorage.getItem('token')) {
      requestLogin({ redirectPath: '/my-bookings' })
    }

    setLoading(false)
  }, [fetchmyBooking, requestLogin, token, user])

  const dashboard = useMemo(() => {
    const confirmedBookings = bookings.filter((booking) => booking.status === 'confirmed')
    const pendingBookings = bookings.filter((booking) => booking.status === 'pending')
    const cancelledBookings = bookings.filter((booking) => booking.status === 'cancelled')
    const totalSpend = bookings.reduce((total, booking) => total + Number(booking.price || 0), 0)
    const confirmedSpend = confirmedBookings.reduce((total, booking) => total + Number(booking.price || 0), 0)
    const rentalDays = bookings.reduce((total, booking) => total + getRentalDays(booking.pickupDate, booking.returnDate), 0)
    const uniqueCars = new Set(bookings.map((booking) => booking.car?._id).filter(Boolean)).size
    const monthlySeries = buildMonthlySeries(bookings)

    return {
      confirmedBookings,
      pendingBookings,
      cancelledBookings,
      totalSpend,
      confirmedSpend,
      rentalDays,
      uniqueCars,
      monthlySeries: monthlySeries.length > 0 ? monthlySeries : [{ label: 'Now', value: 0 }]
    }
  }, [bookings])

  const stats = [
    { label: 'Total spend', value: `${currency}${dashboard.totalSpend}`, detail: 'All booking transactions', icon: assets.listIconColored },
    { label: 'Paid earnings', value: `${currency}${dashboard.confirmedSpend}`, detail: 'Confirmed rental value', icon: assets.dashboardIconColored },
    { label: 'Rental days', value: dashboard.rentalDays, detail: 'Days reserved by you', icon: assets.calendar_icon_colored },
    { label: 'Cars used', value: dashboard.uniqueCars, detail: 'Unique vehicles in history', icon: assets.carIconColored }
  ]

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'transactions', label: 'Transactions' },
    { id: 'history', label: 'Car History' }
  ]

  return (
    <div className='mx-auto mt-10 max-w-7xl px-4 text-sm text-slate-700 sm:px-6 lg:px-8'>
      <section className='relative overflow-hidden rounded-[2rem] bg-slate-950 px-5 py-8 text-white shadow-2xl shadow-slate-200 sm:px-8 lg:px-10'>
        <div className='absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/40 blur-3xl' />
        <div className='absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-teal-400/30 blur-2xl' />

        <div className='relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center'>
          <div>
            <p className='mb-3 inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-blue-100 ring-1 ring-white/15'>
              Personal rental dashboard
            </p>
            <Title
              title={`Welcome${user?.name ? `, ${user.name.split(' ')[0]}` : ''}`}
              subTitle='Track your earnings value, booking payments, transaction history, and every car you have rented from one modern dashboard.'
              align='left'
            />
            <div className='mt-6 flex flex-wrap gap-3'>
              <button onClick={() => navigate('/cars')} className='rounded-full bg-white px-5 py-2.5 font-medium text-slate-950 transition hover:bg-blue-50'>
                Book another car
              </button>
              <button onClick={() => setActiveTab('transactions')} className='rounded-full border border-white/30 px-5 py-2.5 font-medium text-white transition hover:bg-white/10'>
                View transactions
              </button>
            </div>
          </div>

          <div className='rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-blue-100'>Confirmed value</p>
                <h2 className='mt-1 text-4xl font-semibold'>{currency}{dashboard.confirmedSpend}</h2>
              </div>
              <div className='rounded-2xl bg-emerald-400/20 px-4 py-2 text-sm font-semibold text-emerald-100'>
                {dashboard.confirmedBookings.length} active
              </div>
            </div>
            <div className='mt-6 grid grid-cols-3 gap-3 text-center'>
              <div className='rounded-2xl bg-white/10 p-3'>
                <p className='text-2xl font-semibold'>{bookings.length}</p>
                <p className='text-xs text-blue-100'>Bookings</p>
              </div>
              <div className='rounded-2xl bg-white/10 p-3'>
                <p className='text-2xl font-semibold'>{dashboard.pendingBookings.length}</p>
                <p className='text-xs text-blue-100'>Pending</p>
              </div>
              <div className='rounded-2xl bg-white/10 p-3'>
                <p className='text-2xl font-semibold'>{dashboard.cancelledBookings.length}</p>
                <p className='text-xs text-blue-100'>Cancelled</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className='mt-8 flex flex-wrap gap-3 rounded-full bg-light p-2'>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full px-5 py-2.5 font-medium transition ${activeTab === tab.id ? 'bg-white text-primary shadow' : 'text-slate-500 hover:text-slate-900'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className='mt-10 rounded-3xl border border-borderColor p-10 text-center text-gray-500'>Loading your dashboard...</div>
      ) : bookings.length === 0 ? (
        <div className='mt-10 rounded-3xl border border-dashed border-borderColor bg-light p-10 text-center'>
          <h2 className='text-2xl font-semibold text-slate-900'>No booking history yet</h2>
          <p className='mt-2 text-gray-500'>Once you book a car, your spend summary, transactions, and car history will appear here.</p>
          <button onClick={() => navigate('/cars')} className='mt-6 rounded-full bg-primary px-6 py-3 font-medium text-white transition hover:bg-primary-dull'>
            Explore cars
          </button>
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <div className='mt-8 grid gap-6 lg:grid-cols-[1fr_380px]'>
              <div>
                <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
                  {stats.map((stat) => (
                    <div
                      key={stat.label}
                      className='rounded-3xl border border-borderColor bg-white p-5 shadow-sm'
                    >
                      <div className='flex items-center justify-between'>
                        <div className='rounded-2xl bg-primary/10 p-3'>
                          <img src={stat.icon} alt='' className='h-5 w-5' />
                        </div>
                        <span className='text-xs font-medium text-emerald-600'>Live</span>
                      </div>
                      <p className='mt-5 text-sm text-gray-500'>{stat.label}</p>
                      <h3 className='mt-1 text-2xl font-semibold text-slate-950'>{stat.value}</h3>
                      <p className='mt-1 text-xs text-gray-400'>{stat.detail}</p>
                    </div>
                  ))}
                </div>

                <div className='mt-6 rounded-3xl border border-borderColor bg-white p-6 shadow-sm'>
                  <div className='flex items-center justify-between gap-4'>
                    <div>
                      <h2 className='text-xl font-semibold text-slate-950'>Monthly transaction trend</h2>
                      <p className='text-gray-500'>Your recent rental payment movement</p>
                    </div>
                    <span className='rounded-full bg-blue-50 px-4 py-2 text-xs font-medium text-primary'>Last 6 months</span>
                  </div>
                  <MiniLineChart data={dashboard.monthlySeries} />
                </div>
              </div>

              <aside className='rounded-3xl border border-borderColor bg-white p-6 shadow-sm'>
                <div className='flex items-center justify-between'>
                  <div>
                    <h2 className='text-xl font-semibold text-slate-950'>Upcoming & recent</h2>
                    <p className='text-gray-500'>Latest rental activity</p>
                  </div>
                  <img src={assets.calendar_icon_colored} alt='' className='h-6 w-6' />
                </div>
                <div className='mt-5 space-y-4'>
                  {bookings.slice(0, 5).map((booking) => (
                    <div key={booking._id} className='flex gap-3 rounded-2xl bg-light p-3'>
                      <img src={booking.car?.image} alt='' className='h-16 w-20 rounded-xl object-cover' />
                      <div className='min-w-0 flex-1'>
                        <p className='truncate font-semibold text-slate-900'>{booking.car?.brand} {booking.car?.model}</p>
                        <p className='text-xs text-gray-500'>{formatDate(booking.pickupDate)} to {formatDate(booking.returnDate)}</p>
                        <div className='mt-2 flex items-center justify-between gap-2'>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusStyle(booking.status)}`}>{booking.status}</span>
                          <span className='font-semibold text-primary'>{currency}{booking.price}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className='mt-8 overflow-hidden rounded-3xl border border-borderColor bg-white shadow-sm'>
              <div className='border-b border-borderColor p-6'>
                <h2 className='text-xl font-semibold text-slate-950'>Transaction history</h2>
                <p className='text-gray-500'>All booking payments and status changes in one place</p>
              </div>
              <div className='overflow-x-auto'>
                <table className='min-w-200 w-full text-left text-sm'>
                  <thead className='bg-light text-gray-500'>
                    <tr>
                      <th className='p-4 font-medium'>Transaction</th>
                      <th className='p-4 font-medium'>Car</th>
                      <th className='p-4 font-medium'>Booking Date</th>
                      <th className='p-4 font-medium'>Rental Period</th>
                      <th className='p-4 font-medium'>Payment</th>
                      <th className='p-4 font-medium'>Method</th>
                      <th className='p-4 font-medium'>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking, index) => (
                      <tr key={booking._id} className='border-t border-borderColor'>
                        <td className='p-4 font-medium text-slate-900'>#{String(index + 1).padStart(3, '0')}</td>
                        <td className='p-4'>
                          <div className='flex items-center gap-3'>
                            <img src={booking.car?.image} alt='' className='h-12 w-14 rounded-xl object-cover' />
                            <div>
                              <p className='font-medium text-slate-900'>{booking.car?.brand} {booking.car?.model}</p>
                              <p className='text-xs text-gray-500'>{booking.car?.category} - {booking.car?.location}</p>
                            </div>
                          </div>
                        </td>
                        <td className='p-4 text-gray-500'>{formatDate(booking.createdAt)}</td>
                        <td className='p-4 text-gray-500'>{formatDate(booking.pickupDate)} - {formatDate(booking.returnDate)}</td>
                        <td className='p-4 font-semibold text-primary'>{currency}{booking.price}</td>
                        <td className='p-4'>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${booking.paymentMethod === 'online' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                            {booking.paymentMethod || 'offline'} - {booking.paymentStatus || 'pending'}
                          </span>
                        </td>
                        <td className='p-4'>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(booking.status)}`}>{booking.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className='mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3'>
              {bookings.map((booking) => (
                <article key={booking._id} className='overflow-hidden rounded-3xl border border-borderColor bg-white shadow-sm'>
                  <img src={booking.car?.image} alt='' className='h-48 w-full object-cover' />
                  <div className='p-5'>
                    <div className='flex items-start justify-between gap-3'>
                      <div>
                        <h2 className='text-xl font-semibold text-slate-950'>{booking.car?.brand} {booking.car?.model}</h2>
                        <p className='text-gray-500'>{booking.car?.year} - {booking.car?.category} - {booking.car?.location}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(booking.status)}`}>{booking.status}</span>
                    </div>
                    <div className='mt-5 grid grid-cols-2 gap-3 text-sm'>
                      <div className='rounded-2xl bg-light p-3'>
                        <p className='text-gray-500'>Rental days</p>
                        <p className='font-semibold text-slate-950'>{getRentalDays(booking.pickupDate, booking.returnDate)} days</p>
                      </div>
                      <div className='rounded-2xl bg-light p-3'>
                        <p className='text-gray-500'>Total paid</p>
                        <p className='font-semibold text-primary'>{currency}{booking.price}</p>
                      </div>
                    </div>
                    <p className='mt-4 text-gray-500'>{booking.car?.description}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default MyBookings
