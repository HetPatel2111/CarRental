import React, { useEffect, useMemo, useState } from 'react'
import { assets } from '../../assets/assets'
import Title from '../../components/owner/Title'
import { useAppContext } from '../../contex/AppContext'
import toast from 'react-hot-toast'

const formatDate = (date) => {
  if (!date) return 'N/A'

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(date))
}

const getStatusStyle = (status) => {
  if (status === 'confirmed') return 'bg-emerald-100 text-emerald-700'
  if (status === 'cancelled') return 'bg-rose-100 text-rose-700'
  return 'bg-amber-100 text-amber-700'
}

const buildRevenueBars = (bookings) => {
  const monthMap = new Map()

  bookings
    .filter((booking) => booking.status === 'confirmed')
    .forEach((booking) => {
      const date = new Date(booking.createdAt)
      if (Number.isNaN(date.getTime())) return

      const label = date.toLocaleString('en-IN', { month: 'short' })
      monthMap.set(label, (monthMap.get(label) || 0) + Number(booking.price || 0))
    })

  return Array.from(monthMap.entries()).slice(-6).map(([label, value]) => ({ label, value }))
}

const Dashboard = () => {
  const { axios, isOwner, currency } = useAppContext()
  const [data, setData] = useState({
    totalCars: 0,
    totalBookings: 0,
    pendingBookings: 0,
    completeBookings: 0,
    recentBookings: [],
    monthlyRevenue: 0
  })
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const [{ data: dashboardResponse }, { data: bookingsResponse }] = await Promise.all([
        axios.get('/api/owner/dashboard'),
        axios.get('/api/bookings/owner')
      ])

      if (dashboardResponse.success) {
        setData(dashboardResponse.dashboardData)
      } else {
        toast.error(dashboardResponse.message)
      }

      if (bookingsResponse.success) {
        setBookings(bookingsResponse.bookings)
        setLastUpdated(new Date())
      } else {
        toast.error(bookingsResponse.message)
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOwner) {
      fetchDashboardData()
    }
  }, [isOwner])

  const insights = useMemo(() => {
    const confirmedBookings = bookings.filter((booking) => booking.status === 'confirmed')
    const pendingBookings = bookings.filter((booking) => booking.status === 'pending')
    const totalRevenue = confirmedBookings.reduce((total, booking) => total + Number(booking.price || 0), 0)
    const averageBooking = confirmedBookings.length ? Math.round(totalRevenue / confirmedBookings.length) : 0
    const carRevenue = confirmedBookings.reduce((summary, booking) => {
      const carId = booking.car?._id || booking.car?.model || booking._id
      const existing = summary[carId] || {
        car: booking.car,
        revenue: 0,
        bookings: 0
      }

      existing.revenue += Number(booking.price || 0)
      existing.bookings += 1
      summary[carId] = existing
      return summary
    }, {})
    const topCars = Object.values(carRevenue).sort((a, b) => b.revenue - a.revenue).slice(0, 4)
    const revenueBars = buildRevenueBars(bookings)

    return {
      confirmedBookings,
      pendingBookings,
      totalRevenue,
      averageBooking,
      topCars,
      revenueBars: revenueBars.length > 0 ? revenueBars : [{ label: 'Now', value: 0 }]
    }
  }, [bookings])

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase()

    return bookings.filter((booking) => {
      const matchesQuery = !query || [
        booking.user?.name,
        booking.user?.email,
        booking.car?.brand,
        booking.car?.model,
        booking.car?.category
      ].join(' ').toLowerCase().includes(query)

      const matchesStatus = statusFilter === 'all' || booking.status === statusFilter
      return matchesQuery && matchesStatus
    })
  }, [bookings, search, statusFilter])

  const maxRevenue = Math.max(...insights.revenueBars.map((bar) => bar.value), 1)
  const dashboardCards = [
    { title: 'Total Revenue', value: `${currency}${insights.totalRevenue || data.monthlyRevenue}`, detail: 'Confirmed earnings', icon: assets.dashboardIconColored },
    { title: 'Total Cars', value: data.totalCars, detail: 'Cars listed by you', icon: assets.carIconColored },
    { title: 'Bookings', value: data.totalBookings, detail: 'All customer requests', icon: assets.listIconColored },
    { title: 'Pending', value: insights.pendingBookings.length || data.pendingBookings, detail: 'Need attention', icon: assets.cautionIconColored }
  ]

  return (
    <div className='w-full flex-1 bg-slate-50 px-4 py-8 md:px-10'>
      <section className='relative overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl shadow-slate-200 md:p-8'>
        <div className='absolute -right-16 -top-20 h-72 w-72 rounded-full bg-primary/35 blur-3xl' />
        <div className='absolute bottom-0 left-1/2 h-28 w-28 rounded-full bg-emerald-400/25 blur-2xl' />
        <div className='relative grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end'>
          <div>
            <p className='mb-3 inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-blue-100 ring-1 ring-white/15'>
              Owner command center
            </p>
            <Title
              title='Advanced Dashboard'
              subTitle='Monitor earnings, booking health, and car-wise rental activity from a more interactive owner workspace.'
            />
            <p className='mt-4 text-xs text-blue-200'>{lastUpdated ? `Last refresh ${lastUpdated.toLocaleTimeString('en-IN')}` : 'Waiting for first refresh'}</p>
          </div>
          <div className='rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur'>
            <p className='text-blue-100'>Average confirmed booking</p>
            <h2 className='mt-2 text-4xl font-semibold'>{currency}{insights.averageBooking}</h2>
            <p className='mt-3 text-sm text-blue-100'>{insights.confirmedBookings.length} confirmed bookings are generating owner revenue.</p>
            <button onClick={fetchDashboardData} className='mt-4 rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20'>
              Refresh Dashboard
            </button>
          </div>
        </div>
      </section>

      <div className='my-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        {dashboardCards.map((card) => (
          <div key={card.title} className='rounded-3xl border border-borderColor bg-white p-5 shadow-sm'>
            <div className='flex items-center justify-between'>
              <div className='rounded-2xl bg-primary/10 p-3'>
                <img src={card.icon} alt='' className='h-5 w-5' />
              </div>
              <span className='rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500'>Live</span>
            </div>
            <p className='mt-5 text-sm text-gray-500'>{card.title}</p>
            <h3 className='mt-1 text-2xl font-semibold text-slate-950'>{card.value}</h3>
            <p className='mt-1 text-xs text-gray-400'>{card.detail}</p>
          </div>
        ))}
      </div>

      <div className='grid gap-6 xl:grid-cols-[1fr_420px]'>
        <div className='rounded-3xl border border-borderColor bg-white p-6 shadow-sm'>
          <div className='flex flex-wrap items-center justify-between gap-4'>
            <div>
              <h2 className='text-xl font-semibold text-slate-950'>Earning analytics</h2>
              <p className='text-gray-500'>Confirmed revenue trend by month</p>
            </div>
            <span className='rounded-full bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-700'>
              {currency}{insights.totalRevenue} collected
            </span>
          </div>

          <div className='mt-8 flex h-64 items-end gap-4'>
            {insights.revenueBars.map((bar) => (
              <div key={bar.label} className='flex h-full flex-1 flex-col justify-end gap-3'>
                <div
                  className='min-h-4 rounded-t-2xl bg-gradient-to-t from-primary to-teal-400 shadow-lg shadow-blue-100 transition-all'
                  style={{ height: `${Math.max((bar.value / maxRevenue) * 100, 8)}%` }}
                  title={`${currency}${bar.value}`}
                />
                <div className='text-center'>
                  <p className='text-xs font-medium text-slate-500'>{bar.label}</p>
                  <p className='text-xs text-gray-400'>{currency}{bar.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className='rounded-3xl border border-borderColor bg-white p-6 shadow-sm'>
          <div className='flex items-center justify-between'>
            <div>
              <h2 className='text-xl font-semibold text-slate-950'>Car history</h2>
              <p className='text-gray-500'>Best performing listed cars</p>
            </div>
            <img src={assets.carIconColored} alt='' className='h-6 w-6' />
          </div>

          <div className='mt-5 space-y-4'>
            {insights.topCars.length === 0 ? (
              <p className='rounded-2xl bg-light p-5 text-center text-gray-500'>No confirmed car earnings yet.</p>
            ) : insights.topCars.map((item) => (
              <div key={item.car?._id || item.car?.model} className='flex gap-3 rounded-2xl bg-light p-3'>
                <img src={item.car?.image} alt='' className='h-16 w-20 rounded-xl object-cover' />
                <div className='min-w-0 flex-1'>
                  <p className='truncate font-semibold text-slate-900'>{item.car?.brand} {item.car?.model}</p>
                  <p className='text-xs text-gray-500'>{item.bookings} bookings • {item.car?.location}</p>
                  <p className='mt-2 font-semibold text-primary'>{currency}{item.revenue}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <div className='mt-6 overflow-hidden rounded-3xl border border-borderColor bg-white shadow-sm'>
        <div className='border-b border-borderColor p-6'>
          <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
            <div>
              <h2 className='text-xl font-semibold text-slate-950'>Transaction history</h2>
              <p className='text-gray-500'>Latest booking payments and customer activity</p>
            </div>
            <div className='flex flex-col gap-3 md:flex-row'>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder='Search customer or car'
                className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none'
              />
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none'>
                <option value='all'>All statuses</option>
                <option value='pending'>Pending</option>
                <option value='confirmed'>Confirmed</option>
                <option value='cancelled'>Cancelled</option>
              </select>
            </div>
          </div>
        </div>
        <div className='overflow-x-auto'>
          <table className='min-w-200 w-full text-left text-sm'>
            <thead className='bg-light text-gray-500'>
              <tr>
                <th className='p-4 font-medium'>Customer</th>
                <th className='p-4 font-medium'>Car</th>
                <th className='p-4 font-medium'>Date</th>
                <th className='p-4 font-medium'>Amount</th>
                <th className='p-4 font-medium'>Payment</th>
                <th className='p-4 font-medium'>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan='6' className='p-8 text-center text-gray-500'>Loading transactions...</td>
                </tr>
              ) : filteredBookings.length ? filteredBookings.slice(0, 10).map((booking) => (
                <tr key={booking._id} className='border-t border-borderColor'>
                  <td className='p-4'>
                    <p className='font-medium text-slate-900'>{booking.user?.name || 'Customer'}</p>
                    <p className='text-xs text-gray-500'>{booking.user?.email || 'No email'}</p>
                  </td>
                  <td className='p-4'>
                    <div className='flex items-center gap-3'>
                      <img src={booking.car?.image} alt='' className='h-12 w-14 rounded-xl object-cover' />
                      <div>
                        <p className='font-medium text-slate-900'>{booking.car?.brand} {booking.car?.model}</p>
                        <p className='text-xs text-gray-500'>{booking.car?.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className='p-4 text-gray-500'>{formatDate(booking.createdAt)}</td>
                  <td className='p-4 font-semibold text-primary'>{currency}{booking.price}</td>
                  <td className='p-4'>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${booking.paymentMethod === 'online' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                      {booking.paymentMethod || 'offline'} • {booking.paymentStatus || 'pending'}
                    </span>
                  </td>
                  <td className='p-4'>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(booking.status)}`}>{booking.status}</span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan='6' className='p-8 text-center text-gray-500'>No transactions match these filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
