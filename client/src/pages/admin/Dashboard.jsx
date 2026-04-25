import React, { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-hot-toast'
import Title from '../../components/owner/Title'
import { useAppContext } from '../../contex/AppContext'

const currencyValue = (currency, value) => `${currency}${Number(value || 0).toLocaleString()}`

const StatCard = ({ label, value, tone = 'slate' }) => {
  const toneStyles = {
    slate: 'from-slate-900 to-slate-700 text-white',
    blue: 'from-blue-600 to-cyan-500 text-white',
    amber: 'from-amber-500 to-orange-500 text-white',
    emerald: 'from-emerald-500 to-teal-500 text-white',
  }

  return (
    <article className={`rounded-3xl bg-gradient-to-br p-5 shadow-sm ${toneStyles[tone] || toneStyles.slate}`}>
      <p className='text-sm opacity-80'>{label}</p>
      <p className='mt-3 text-3xl font-semibold'>{value}</p>
    </article>
  )
}

const AdminDashboard = () => {
  const { axios, currency } = useAppContext()
  const [dashboard, setDashboard] = useState(null)
  const [range, setRange] = useState('30d')
  const [loading, setLoading] = useState(true)
  const [performance, setPerformance] = useState(null)
  const [search, setSearch] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchDashboard = async (selectedRange = range) => {
    try {
      setLoading(true)
      const [{ data: dashboardData }, { data: performanceData }] = await Promise.all([
        axios.get(`/api/admin/dashboard?range=${selectedRange}`),
        axios.get('/api/user/performance-summary')
      ])

      if (dashboardData.success) {
        setDashboard(dashboardData)
        setLastUpdated(new Date())
      } else {
        toast.error(dashboardData.message)
      }

      if (performanceData.success) {
        setPerformance(performanceData.performance)
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  const metrics = dashboard?.metrics || {}
  const settlementQueue = dashboard?.settlementQueue || []
  const pricingInsights = dashboard?.pricingInsights || {}
  const query = search.trim().toLowerCase()

  const topOwners = useMemo(
    () => (dashboard?.topOwners || []).filter((owner) =>
      !query || `${owner.ownerName} ${owner.bookings}`.toLowerCase().includes(query)
    ),
    [dashboard?.topOwners, query]
  )

  const topCars = useMemo(
    () => (dashboard?.topCars || []).filter((car) =>
      !query || `${car.carName} ${car.location}`.toLowerCase().includes(query)
    ),
    [dashboard?.topCars, query]
  )

  return (
    <section className='flex-1 min-h-screen bg-slate-50 p-5 md:p-8'>
      <div className='mx-auto max-w-7xl space-y-6'>
        <div className='flex flex-col gap-4 rounded-[32px] bg-gradient-to-r from-slate-950 via-slate-900 to-blue-900 p-6 text-white shadow-lg md:flex-row md:items-end md:justify-between'>
          <div>
            <Title
              title='Admin Command Center'
              subTitle='Track platform profit, discount burn, settlement liability, pricing uplift, and owner performance from one operational dashboard.'
            />
            <p className='mt-4 text-sm text-blue-100'>{dashboard?.profitFormula}</p>
            <p className='mt-2 text-xs text-blue-200'>{lastUpdated ? `Last refresh ${lastUpdated.toLocaleTimeString('en-IN')}` : 'Waiting for first refresh'}</p>
          </div>
          <div className='flex flex-col gap-3 md:items-end'>
            <div className='flex items-center gap-2 rounded-2xl bg-white/10 p-2 backdrop-blur'>
              {['7d', '30d', '90d'].map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    setRange(option)
                    fetchDashboard(option)
                  }}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition ${range === option ? 'bg-white text-slate-900' : 'text-white/80'}`}
                >
                  {option.toUpperCase()}
                </button>
              ))}
            </div>
            <button onClick={() => fetchDashboard(range)} className='rounded-2xl border border-white/20 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10'>
              Refresh Metrics
            </button>
          </div>
        </div>

        {loading ? (
          <div className='rounded-3xl bg-white p-10 text-center text-gray-500 shadow-sm'>Loading admin metrics...</div>
        ) : (
          <>
            <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
              <StatCard label='Gross Sales' value={currencyValue(currency, metrics.totalGrossSales)} tone='blue' />
              <StatCard label='Net Platform Profit' value={currencyValue(currency, metrics.totalPlatformNetProfit)} tone='emerald' />
              <StatCard label='Owner Payout Due' value={currencyValue(currency, metrics.totalOwnerPayoutDue)} tone='amber' />
              <StatCard label='Total Discount Burn' value={currencyValue(currency, metrics.totalDiscount)} />
            </div>

            <div className='grid gap-6 xl:grid-cols-[1.1fr_0.9fr]'>
              <div className='rounded-3xl bg-white p-6 shadow-sm'>
                <div className='flex items-center justify-between gap-3'>
                  <div>
                    <h3 className='text-lg font-semibold text-slate-900'>Platform Performance</h3>
                    <p className='text-sm text-gray-500'>Live summary from the backend performance endpoint.</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${performance?.cache?.provider === 'redis' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {performance?.cache?.provider || 'memory'}
                  </span>
                </div>
                <div className='mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
                  <div className='rounded-2xl bg-slate-50 p-4'>
                    <p className='text-xs text-gray-500'>Cache Hit Rate</p>
                    <p className='mt-2 text-2xl font-semibold text-slate-900'>{performance?.cache?.hitRate || 0}%</p>
                  </div>
                  <div className='rounded-2xl bg-slate-50 p-4'>
                    <p className='text-xs text-gray-500'>Cache Writes</p>
                    <p className='mt-2 text-2xl font-semibold text-slate-900'>{performance?.cache?.writes || 0}</p>
                  </div>
                  <div className='rounded-2xl bg-slate-50 p-4'>
                    <p className='text-xs text-gray-500'>Memory Keys</p>
                    <p className='mt-2 text-2xl font-semibold text-slate-900'>{performance?.cache?.memoryKeys || 0}</p>
                  </div>
                  <div className='rounded-2xl bg-slate-50 p-4'>
                    <p className='text-xs text-gray-500'>API Uptime</p>
                    <p className='mt-2 text-2xl font-semibold text-slate-900'>{performance?.uptimeSeconds || 0}s</p>
                  </div>
                </div>
                <div className='mt-6 grid gap-4 md:grid-cols-3'>
                  <div className='rounded-2xl border border-slate-100 p-4'>
                    <p className='text-sm text-gray-500'>Service Fee Revenue</p>
                    <p className='mt-2 text-2xl font-semibold text-slate-900'>{currencyValue(currency, metrics.totalServiceFee)}</p>
                  </div>
                  <div className='rounded-2xl border border-slate-100 p-4'>
                    <p className='text-sm text-gray-500'>Surge Revenue</p>
                    <p className='mt-2 text-2xl font-semibold text-slate-900'>{currencyValue(currency, metrics.totalSurgeRevenue)}</p>
                  </div>
                  <div className='rounded-2xl border border-slate-100 p-4'>
                    <p className='text-sm text-gray-500'>Gateway Cost</p>
                    <p className='mt-2 text-2xl font-semibold text-slate-900'>{currencyValue(currency, metrics.totalGatewayFee)}</p>
                  </div>
                </div>
              </div>

              <div className='rounded-3xl bg-white p-6 shadow-sm'>
                <h3 className='text-lg font-semibold text-slate-900'>Pending Settlement Queue</h3>
                <p className='mt-1 text-sm text-gray-500'>Latest confirmed and paid bookings waiting for settlement review.</p>
                <div className='mt-5 space-y-3'>
                  {settlementQueue.length ? settlementQueue.map((booking) => (
                    <div key={booking._id} className='rounded-2xl bg-slate-50 p-4'>
                      <div className='flex items-start justify-between gap-3'>
                        <div>
                          <p className='font-semibold text-slate-900'>{booking.car?.brand} {booking.car?.model}</p>
                          <p className='text-xs text-gray-500'>{booking.owner?.name || 'Owner'} • {booking.user?.name || 'Customer'}</p>
                        </div>
                        <span className='rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700'>{booking.settlementStatus}</span>
                      </div>
                      <div className='mt-3 flex items-center justify-between text-sm'>
                        <span className='text-gray-500'>Owner payout</span>
                        <span className='font-semibold text-slate-900'>{currencyValue(currency, booking.ownerPayout)}</span>
                      </div>
                    </div>
                  )) : <p className='rounded-2xl bg-slate-50 p-4 text-sm text-gray-500'>No pending settlements in this window.</p>}
                </div>
              </div>
            </div>

            <div className='rounded-3xl bg-white p-6 shadow-sm'>
              <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
                <div>
                  <h3 className='text-lg font-semibold text-slate-900'>Operator Search</h3>
                  <p className='text-sm text-gray-500'>Search owner and car leaderboards from one control.</p>
                </div>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder='Search owner name, car name, or city'
                  className='w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none lg:max-w-md'
                />
              </div>
            </div>

            <div className='grid gap-6 xl:grid-cols-[1fr_1fr_0.9fr]'>
              <div className='rounded-3xl bg-white p-6 shadow-sm'>
                <h3 className='text-lg font-semibold text-slate-900'>Top Owners</h3>
                <div className='mt-4 space-y-3'>
                  {topOwners.length ? topOwners.map((owner) => (
                    <div key={owner.ownerId} className='flex items-center justify-between rounded-2xl bg-slate-50 p-4'>
                      <div>
                        <p className='font-semibold text-slate-900'>{owner.ownerName}</p>
                        <p className='text-xs text-gray-500'>{owner.bookings} bookings • payout {currencyValue(currency, owner.ownerPayout)}</p>
                      </div>
                      <div className='text-right'>
                        <p className='font-semibold text-emerald-600'>{currencyValue(currency, owner.netPlatformProfit)}</p>
                        <p className='text-xs text-gray-500'>Suggested bonus {currencyValue(currency, owner.recommendedIncentive)}</p>
                      </div>
                    </div>
                  )) : <p className='rounded-2xl bg-slate-50 p-4 text-sm text-gray-500'>No owners match this search.</p>}
                </div>
              </div>

              <div className='rounded-3xl bg-white p-6 shadow-sm'>
                <h3 className='text-lg font-semibold text-slate-900'>Top Cars</h3>
                <div className='mt-4 space-y-3'>
                  {topCars.length ? topCars.map((car) => (
                    <div key={car.carId} className='flex items-center justify-between rounded-2xl bg-slate-50 p-4'>
                      <div>
                        <p className='font-semibold text-slate-900'>{car.carName}</p>
                        <p className='text-xs text-gray-500'>{car.location || 'Unknown location'} • {car.bookings} bookings</p>
                      </div>
                      <div className='text-right'>
                        <p className='font-semibold text-slate-900'>{currencyValue(currency, car.grossSales)}</p>
                        <p className='text-xs text-gray-500'>Net {currencyValue(currency, car.netPlatformProfit)}</p>
                      </div>
                    </div>
                  )) : <p className='rounded-2xl bg-slate-50 p-4 text-sm text-gray-500'>No cars match this search.</p>}
                </div>
              </div>

              <div className='rounded-3xl bg-white p-6 shadow-sm'>
                <h3 className='text-lg font-semibold text-slate-900'>Pricing Uplift Mix</h3>
                <div className='mt-4 space-y-3 text-sm'>
                  <div className='flex items-center justify-between'><span className='text-gray-500'>Weekend</span><span className='font-semibold'>{currencyValue(currency, pricingInsights.weekendRevenue)}</span></div>
                  <div className='flex items-center justify-between'><span className='text-gray-500'>Festival</span><span className='font-semibold'>{currencyValue(currency, pricingInsights.festivalRevenue)}</span></div>
                  <div className='flex items-center justify-between'><span className='text-gray-500'>Trending</span><span className='font-semibold'>{currencyValue(currency, pricingInsights.trendingRevenue)}</span></div>
                  <div className='flex items-center justify-between'><span className='text-gray-500'>Demand + Inventory</span><span className='font-semibold'>{currencyValue(currency, pricingInsights.demandRevenue)}</span></div>
                  <div className='flex items-center justify-between'><span className='text-gray-500'>Last Minute</span><span className='font-semibold'>{currencyValue(currency, pricingInsights.lastMinuteRevenue)}</span></div>
                </div>
                <div className='mt-6 rounded-2xl bg-slate-50 p-4'>
                  <p className='text-sm text-gray-500'>Operational Snapshot</p>
                  <div className='mt-4 space-y-3 text-sm'>
                    <div className='flex items-center justify-between'><span className='text-gray-500'>Confirmed Bookings</span><span className='font-semibold'>{metrics.confirmedBookings || 0}</span></div>
                    <div className='flex items-center justify-between'><span className='text-gray-500'>Pending Bookings</span><span className='font-semibold'>{metrics.pendingBookings || 0}</span></div>
                    <div className='flex items-center justify-between'><span className='text-gray-500'>Cancelled Bookings</span><span className='font-semibold'>{metrics.cancelledBookings || 0}</span></div>
                    <div className='flex items-center justify-between'><span className='text-gray-500'>Settled Owner Payout</span><span className='font-semibold'>{currencyValue(currency, metrics.totalOwnerPayoutSettled)}</span></div>
                    <div className='flex items-center justify-between'><span className='text-gray-500'>Incentive Paid</span><span className='font-semibold'>{currencyValue(currency, metrics.totalIncentivePaid)}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

export default AdminDashboard
