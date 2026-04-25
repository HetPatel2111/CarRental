import React, { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-hot-toast'
import Title from '../../components/owner/Title'
import { useAppContext } from '../../contex/AppContext'

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '--'

const Settlements = () => {
  const { axios, currency } = useAppContext()
  const [bookings, setBookings] = useState([])
  const [historyBookings, setHistoryBookings] = useState([])
  const [incentives, setIncentives] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('active')
  const [search, setSearch] = useState('')

  const fetchSettlements = async () => {
    try {
      setLoading(true)
      const { data } = await axios.get('/api/admin/settlements')
      if (data.success) {
        const activeBookings = data.activeBookings || data.bookings || []
        const settledHistory = data.historyBookings || []

        setBookings(activeBookings)
        setHistoryBookings(settledHistory)
        setIncentives(
          [...activeBookings, ...settledHistory].reduce((accumulator, booking) => {
            accumulator[booking._id] = booking.incentiveAmount || 0
            return accumulator
          }, {})
        )
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettlements()
  }, [])

  const updateSettlement = async (bookingId, settlementStatus) => {
    try {
      const { data } = await axios.patch(`/api/admin/settlements/${bookingId}`, { settlementStatus })
      if (data.success) {
        toast.success(data.message)
        fetchSettlements()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const applyIncentive = async (bookingId) => {
    try {
      const { data } = await axios.patch(`/api/admin/incentives/${bookingId}`, {
        incentiveAmount: incentives[bookingId] || 0,
      })
      if (data.success) {
        toast.success(data.message)
        fetchSettlements()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const visibleBookings = useMemo(() => {
    const query = search.trim().toLowerCase()
    const source = activeTab === 'active' ? bookings : historyBookings

    return source.filter((booking) =>
      !query || [
        booking.owner?.name,
        booking.user?.name,
        booking.car?.brand,
        booking.car?.model
      ].join(' ').toLowerCase().includes(query)
    )
  }, [activeTab, bookings, historyBookings, search])

  const summary = useMemo(() => ({
    active: bookings.length,
    history: historyBookings.length,
    payoutDue: bookings.reduce((sum, booking) => sum + Number(booking.ownerPayout || 0), 0),
    incentives: bookings.reduce((sum, booking) => sum + Number(booking.incentiveAmount || 0), 0)
  }), [bookings, historyBookings])

  return (
    <section className='flex-1 min-h-screen bg-slate-50 p-5 md:p-8'>
      <div className='mx-auto max-w-7xl space-y-6'>
        <div className='rounded-3xl bg-white p-6 shadow-sm'>
          <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
            <Title
              title='Settlements and Incentives'
              subTitle='Review paid bookings, move owner settlements through pending to settled, and assign incentive bonuses while keeping profit math updated.'
            />
            <button onClick={fetchSettlements} className='rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary'>
              Refresh Queue
            </button>
          </div>
        </div>

        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
          {[
            { label: 'Open Items', value: summary.active, tone: 'bg-amber-500 text-white' },
            { label: 'Settlement History', value: summary.history, tone: 'bg-emerald-500 text-white' },
            { label: 'Owner Payout Due', value: `${currency}${summary.payoutDue}`, tone: 'bg-slate-900 text-white' },
            { label: 'Current Incentives', value: `${currency}${summary.incentives}`, tone: 'bg-white text-slate-900 border border-slate-200' }
          ].map((card) => (
            <div key={card.label} className={`rounded-3xl p-5 shadow-sm ${card.tone}`}>
              <p className='text-sm opacity-80'>{card.label}</p>
              <p className='mt-3 text-3xl font-semibold'>{card.value}</p>
            </div>
          ))}
        </div>

        <div className='rounded-3xl bg-white p-6 shadow-sm'>
          <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
            <div className='flex items-center gap-2 rounded-2xl bg-slate-100 p-2'>
              {[
                { key: 'active', label: 'Active Queue' },
                { key: 'history', label: 'History' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${activeTab === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder='Search owner, customer, or car'
              className='w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none lg:max-w-md'
            />
          </div>

          <div className='mt-6 overflow-x-auto'>
            <table className='min-w-full text-sm'>
              <thead>
                <tr className='border-b border-slate-100 text-left text-gray-500'>
                  <th className='pb-3'>Booking</th>
                  <th className='pb-3'>Owner</th>
                  <th className='pb-3'>Financials</th>
                  <th className='pb-3'>Settlement</th>
                  <th className='pb-3'>Incentive</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan='5' className='py-10 text-center text-gray-500'>Loading settlement queue...</td>
                  </tr>
                ) : visibleBookings.length ? visibleBookings.map((booking) => (
                  <tr key={booking._id} className='border-b border-slate-100 align-top'>
                    <td className='py-4'>
                      <p className='font-semibold text-slate-900'>{booking.car?.brand} {booking.car?.model}</p>
                      <p className='text-xs text-gray-500'>{formatDate(booking.pickupDate)} to {formatDate(booking.returnDate)}</p>
                      <p className='text-xs text-gray-500'>{booking.user?.name || 'Customer'}</p>
                    </td>
                    <td className='py-4'>
                      <p className='font-semibold text-slate-900'>{booking.owner?.name || 'Owner'}</p>
                      <p className='text-xs text-gray-500'>{booking.owner?.email || 'No email'}</p>
                    </td>
                    <td className='py-4 text-gray-600'>
                      <p>Customer paid: <span className='font-semibold text-slate-900'>{currency}{booking.price}</span></p>
                      <p>Owner payout: <span className='font-semibold text-slate-900'>{currency}{booking.ownerPayout}</span></p>
                      <p>Net profit: <span className='font-semibold text-emerald-600'>{currency}{booking.priceBreakdown?.netPlatformProfit || 0}</span></p>
                    </td>
                    <td className='py-4'>
                      {activeTab === 'active' ? (
                        <select
                          value={booking.settlementStatus}
                          onChange={(event) => updateSettlement(booking._id, event.target.value)}
                          className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 outline-none'
                        >
                          <option value='pending'>Pending</option>
                          <option value='processing'>Processing</option>
                          <option value='settled'>Settled</option>
                        </select>
                      ) : (
                        <span className='rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700'>Settled</span>
                      )}
                    </td>
                    <td className='py-4'>
                      {activeTab === 'active' ? (
                        <div className='flex items-center gap-2'>
                          <input
                            type='number'
                            value={incentives[booking._id] ?? 0}
                            onChange={(event) => setIncentives((prev) => ({ ...prev, [booking._id]: event.target.value }))}
                            className='w-28 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 outline-none'
                          />
                          <button onClick={() => applyIncentive(booking._id)} className='rounded-2xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white'>Apply</button>
                        </div>
                      ) : (
                        <span className='font-semibold text-slate-900'>{currency}{booking.incentiveAmount || 0}</span>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan='5' className='py-10 text-center text-gray-500'>No settlement records match this filter.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Settlements
