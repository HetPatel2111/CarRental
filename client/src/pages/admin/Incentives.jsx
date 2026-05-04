import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import Title from '../../components/owner/Title'
import { useAppContext } from '../../contex/AppContext'

const currencyValue = (currency, value) => `${currency}${Number(value || 0).toLocaleString()}`

const segmentLabel = {
  vip: 'VIP',
  winback: 'Win-back',
  loyalty: 'Loyalty',
  first_trip: 'Second-trip push',
}

const Incentives = () => {
  const { axios, currency } = useAppContext()
  const [dashboard, setDashboard] = useState(null)
  const [range, setRange] = useState('90d')
  const [loading, setLoading] = useState(true)
  const [creatingCode, setCreatingCode] = useState('')
  const [search, setSearch] = useState('')

  const fetchDashboard = async (selectedRange = range) => {
    try {
      setLoading(true)
      const { data } = await axios.get(`/api/admin/incentives-dashboard?range=${selectedRange}`)
      if (data.success) {
        setDashboard(data)
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
    fetchDashboard()
  }, [])

  const createCoupon = async (coupon) => {
    try {
      setCreatingCode(coupon.code)
      const { data } = await axios.post('/api/admin/coupons', coupon)
      if (data.success) {
        toast.success(`Coupon ${coupon.code} created`)
        fetchDashboard(range)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    } finally {
      setCreatingCode('')
    }
  }

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase()
    const customers = dashboard?.topCustomers || []

    return customers.filter((customer) =>
      !query || [
        customer.userName,
        customer.email,
        customer.favoriteCategory,
        segmentLabel[customer.segment] || customer.segment
      ].join(' ').toLowerCase().includes(query)
    )
  }, [dashboard?.topCustomers, search])

  const metrics = dashboard?.metrics || {}
  const couponHealth = dashboard?.couponHealth || {}
  const campaignSuggestions = dashboard?.campaignSuggestions || []

  return (
    <section className='flex-1 min-h-screen bg-slate-50 p-5 md:p-8'>
      <div className='mx-auto max-w-7xl space-y-6'>
        <div className='rounded-[32px] bg-gradient-to-r from-emerald-950 via-slate-950 to-cyan-900 p-6 text-white shadow-lg'>
          <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
            <div>
              <Title
                title='Incentives and Growth'
                subTitle='Separate campaign workspace for customer rewards, retention offers, and loyalty moves without mixing it into coupon editing.'
              />
              <p className='mt-4 text-sm text-emerald-100'>Use this page to decide who should get a reward, then create the coupon from the recommendation.</p>
            </div>
            <div className='flex flex-col gap-3 md:items-end'>
              <div className='flex items-center gap-2 rounded-2xl bg-white/10 p-2 backdrop-blur'>
                {['30d', '90d'].map((option) => (
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
              <div className='flex gap-2'>
                <Link to='/admin/coupons' className='rounded-2xl border border-white/20 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10'>
                  Open Coupons
                </Link>
                <button onClick={() => fetchDashboard(range)} className='rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-900'>
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className='rounded-3xl bg-white p-10 text-center text-gray-500 shadow-sm'>Loading incentive dashboard...</div>
        ) : (
          <>
            <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
              {[
                { label: 'Active Customers', value: metrics.activeCustomers, tone: 'bg-slate-900 text-white' },
                { label: 'Repeat Customers', value: metrics.repeatCustomers, tone: 'bg-blue-600 text-white' },
                { label: 'At-Risk Customers', value: metrics.atRiskCustomers, tone: 'bg-amber-500 text-white' },
                { label: 'Suggested Budget', value: currencyValue(currency, metrics.suggestedBudget), tone: 'bg-emerald-500 text-white' }
              ].map((card) => (
                <div key={card.label} className={`rounded-3xl p-5 shadow-sm ${card.tone}`}>
                  <p className='text-sm opacity-80'>{card.label}</p>
                  <p className='mt-3 text-3xl font-semibold'>{card.value || 0}</p>
                </div>
              ))}
            </div>

            <div className='grid gap-6 xl:grid-cols-[1.1fr_0.9fr]'>
              <div className='rounded-3xl bg-white p-6 shadow-sm'>
                <div className='flex items-center justify-between gap-3'>
                  <div>
                    <h3 className='text-lg font-semibold text-slate-900'>Campaign Suggestions</h3>
                    <p className='text-sm text-gray-500'>Pre-built reward ideas based on customer behavior and booking history.</p>
                  </div>
                  <Link to='/admin/coupons' className='text-sm font-semibold text-primary'>
                    Manage all coupons
                  </Link>
                </div>
                <div className='mt-5 grid gap-4'>
                  {campaignSuggestions.map((campaign) => (
                    <article key={campaign.id} className='rounded-3xl border border-slate-100 bg-slate-50 p-5'>
                      <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                        <div>
                          <p className='text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600'>{campaign.title}</p>
                          <h4 className='mt-2 text-xl font-semibold text-slate-900'>{campaign.audienceCount} users suggested</h4>
                          <p className='mt-2 text-sm text-gray-500'>{campaign.highlight}</p>
                          <p className='mt-4 text-sm text-slate-700'>
                            Draft: <span className='font-semibold'>{campaign.coupon.code}</span> • {campaign.coupon.type} • {campaign.coupon.value}
                          </p>
                        </div>
                        <button
                          onClick={() => createCoupon(campaign.coupon)}
                          disabled={creatingCode === campaign.coupon.code}
                          className='rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60'
                        >
                          {creatingCode === campaign.coupon.code ? 'Creating...' : 'Create Campaign Coupon'}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className='rounded-3xl bg-white p-6 shadow-sm'>
                <h3 className='text-lg font-semibold text-slate-900'>Coupon Health</h3>
                <p className='mt-1 text-sm text-gray-500'>Keep incentive campaigns separate from operational dashboard metrics.</p>
                <div className='mt-5 grid gap-4'>
                  <div className='rounded-2xl bg-slate-50 p-4'>
                    <p className='text-xs text-gray-500'>Total Coupons</p>
                    <p className='mt-2 text-2xl font-semibold text-slate-900'>{couponHealth.total || 0}</p>
                  </div>
                  <div className='rounded-2xl bg-slate-50 p-4'>
                    <p className='text-xs text-gray-500'>Active Coupons</p>
                    <p className='mt-2 text-2xl font-semibold text-slate-900'>{couponHealth.active || 0}</p>
                  </div>
                  <div className='rounded-2xl bg-slate-50 p-4'>
                    <p className='text-xs text-gray-500'>Expiring in 14 Days</p>
                    <p className='mt-2 text-2xl font-semibold text-slate-900'>{couponHealth.expiringSoon || 0}</p>
                  </div>
                  <div className='rounded-2xl bg-slate-50 p-4'>
                    <p className='text-xs text-gray-500'>First Booking Offers</p>
                    <p className='mt-2 text-2xl font-semibold text-slate-900'>{couponHealth.firstBookingOffers || 0}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className='rounded-3xl bg-white p-6 shadow-sm'>
              <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
                <div>
                  <h3 className='text-lg font-semibold text-slate-900'>Top Customers To Reward</h3>
                  <p className='text-sm text-gray-500'>These users are ranked by spend and repeat behavior, with a coupon suggestion ready for admin action.</p>
                </div>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder='Search customer, email, category, or segment'
                  className='w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none lg:max-w-md'
                />
              </div>

              <div className='mt-6 overflow-x-auto'>
                <table className='min-w-full text-sm'>
                  <thead>
                    <tr className='border-b border-slate-100 text-left text-gray-500'>
                      <th className='pb-3'>Customer</th>
                      <th className='pb-3'>Performance</th>
                      <th className='pb-3'>Behavior</th>
                      <th className='pb-3'>Recommended Offer</th>
                      <th className='pb-3'>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.length ? filteredCustomers.map((customer) => (
                      <tr key={customer.userId} className='border-b border-slate-100 align-top'>
                        <td className='py-4'>
                          <p className='font-semibold text-slate-900'>{customer.userName}</p>
                          <p className='text-xs text-gray-500'>{customer.email || 'No email available'}</p>
                        </td>
                        <td className='py-4 text-gray-600'>
                          <p>{customer.bookings} bookings</p>
                          <p>Spend {currencyValue(currency, customer.totalSpend)}</p>
                          <p>Profit {currencyValue(currency, customer.netProfit)}</p>
                        </td>
                        <td className='py-4 text-gray-600'>
                          <p>{segmentLabel[customer.segment] || customer.segment}</p>
                          <p>Favorite {customer.favoriteCategory}</p>
                          <p>{customer.daysSinceLastBooking} days since last booking</p>
                        </td>
                        <td className='py-4 text-gray-600'>
                          <p className='font-semibold text-slate-900'>{customer.recommendedCoupon.code}</p>
                          <p>{customer.recommendedCoupon.type} • {customer.recommendedCoupon.value}</p>
                          <p>Min {currencyValue(currency, customer.recommendedCoupon.minBookingAmount)}</p>
                        </td>
                        <td className='py-4'>
                          <button
                            onClick={() => createCoupon(customer.recommendedCoupon)}
                            disabled={creatingCode === customer.recommendedCoupon.code}
                            className='rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-white disabled:opacity-60'
                          >
                            {creatingCode === customer.recommendedCoupon.code ? 'Creating...' : 'Create Reward Coupon'}
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan='5' className='py-10 text-center text-gray-500'>No customers match this search.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

export default Incentives
