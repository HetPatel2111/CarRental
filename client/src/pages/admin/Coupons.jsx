import React, { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-hot-toast'
import Title from '../../components/owner/Title'
import { useAppContext } from '../../contex/AppContext'

const emptyCoupon = {
  code: '',
  type: 'flat',
  value: 0,
  description: '',
  active: true,
  fundedBy: 'platform',
  maxDiscount: 0,
  minBookingAmount: 0,
  category: '',
  weekendOnly: false,
  firstBookingOnly: false,
  startsAt: '',
  expiresAt: '',
}

const Coupons = () => {
  const { axios } = useAppContext()
  const [coupons, setCoupons] = useState([])
  const [form, setForm] = useState(emptyCoupon)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const fetchCoupons = async () => {
    try {
      setLoading(true)
      const { data } = await axios.get('/api/admin/coupons')
      if (data.success) {
        setCoupons(data.coupons)
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
    fetchCoupons()
  }, [])

  const saveCoupon = async (event) => {
    event.preventDefault()
    try {
      const url = editingId ? `/api/admin/coupons/${editingId}` : '/api/admin/coupons'
      const method = editingId ? axios.put : axios.post
      const { data } = await method(url, form)
      if (data.success) {
        toast.success(data.message)
        setForm(emptyCoupon)
        setEditingId(null)
        fetchCoupons()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const removeCoupon = async (id) => {
    try {
      const { data } = await axios.delete(`/api/admin/coupons/${id}`)
      if (data.success) {
        toast.success(data.message)
        fetchCoupons()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const filteredCoupons = useMemo(() => {
    const query = search.trim().toLowerCase()

    return coupons.filter((coupon) => {
      const matchesQuery = !query || [
        coupon.code,
        coupon.description,
        coupon.category,
        coupon.fundedBy
      ].join(' ').toLowerCase().includes(query)

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && coupon.active) ||
        (statusFilter === 'paused' && !coupon.active)

      return matchesQuery && matchesStatus
    })
  }, [coupons, search, statusFilter])

  const summary = useMemo(() => ({
    total: coupons.length,
    active: coupons.filter((coupon) => coupon.active).length,
    platformFunded: coupons.filter((coupon) => coupon.fundedBy === 'platform').length,
    firstBooking: coupons.filter((coupon) => coupon.firstBookingOnly).length
  }), [coupons])

  return (
    <section className='flex-1 min-h-screen bg-slate-50 p-5 md:p-8'>
      <div className='mx-auto max-w-7xl space-y-6'>
        <div className='rounded-3xl bg-white p-6 shadow-sm'>
          <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
            <Title
              title='Coupons and Discounting'
              subTitle='Create platform-funded or owner-funded offers, filter promo inventory, and manage promo logic from one screen.'
            />
            <button onClick={fetchCoupons} className='rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary'>
              Refresh Coupons
            </button>
          </div>
        </div>

        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
          {[
            { label: 'Total Coupons', value: summary.total, tone: 'bg-slate-900 text-white' },
            { label: 'Active Coupons', value: summary.active, tone: 'bg-emerald-500 text-white' },
            { label: 'Platform Funded', value: summary.platformFunded, tone: 'bg-blue-600 text-white' },
            { label: 'First Booking Offers', value: summary.firstBooking, tone: 'bg-white text-slate-900 border border-slate-200' }
          ].map((card) => (
            <div key={card.label} className={`rounded-3xl p-5 shadow-sm ${card.tone}`}>
              <p className='text-sm opacity-80'>{card.label}</p>
              <p className='mt-3 text-3xl font-semibold'>{card.value}</p>
            </div>
          ))}
        </div>

        <div className='grid gap-6 xl:grid-cols-[0.95fr_1.25fr]'>
          <form onSubmit={saveCoupon} className='rounded-3xl bg-white p-6 shadow-sm'>
            <h3 className='text-lg font-semibold text-slate-900'>{editingId ? 'Edit Coupon' : 'Create Coupon'}</h3>
            <div className='mt-5 grid gap-4'>
              <input value={form.code} onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))} placeholder='Coupon code' className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none' />
              <div className='grid gap-4 md:grid-cols-2'>
                <select value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))} className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none'>
                  <option value='flat'>Flat</option>
                  <option value='percent'>Percent</option>
                </select>
                <input type='number' value={form.value} onChange={(event) => setForm((prev) => ({ ...prev, value: event.target.value }))} placeholder='Discount value' className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none' />
              </div>
              <textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} placeholder='Description' rows='3' className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none' />
              <div className='grid gap-4 md:grid-cols-2'>
                <input type='number' value={form.maxDiscount} onChange={(event) => setForm((prev) => ({ ...prev, maxDiscount: event.target.value }))} placeholder='Max discount' className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none' />
                <input type='number' value={form.minBookingAmount} onChange={(event) => setForm((prev) => ({ ...prev, minBookingAmount: event.target.value }))} placeholder='Min booking amount' className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none' />
              </div>
              <div className='grid gap-4 md:grid-cols-2'>
                <input value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))} placeholder='Category (optional)' className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none' />
                <select value={form.fundedBy} onChange={(event) => setForm((prev) => ({ ...prev, fundedBy: event.target.value }))} className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none'>
                  <option value='platform'>Platform funded</option>
                  <option value='owner'>Owner funded</option>
                  <option value='shared'>Shared</option>
                </select>
              </div>
              <div className='grid gap-4 md:grid-cols-2'>
                <input type='date' value={form.startsAt} onChange={(event) => setForm((prev) => ({ ...prev, startsAt: event.target.value }))} className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none' />
                <input type='date' value={form.expiresAt} onChange={(event) => setForm((prev) => ({ ...prev, expiresAt: event.target.value }))} className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none' />
              </div>
              <div className='grid gap-3 md:grid-cols-3 text-sm text-gray-600'>
                <label className='flex items-center gap-2'><input type='checkbox' checked={form.active} onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))} /> Active</label>
                <label className='flex items-center gap-2'><input type='checkbox' checked={form.weekendOnly} onChange={(event) => setForm((prev) => ({ ...prev, weekendOnly: event.target.checked }))} /> Weekend only</label>
                <label className='flex items-center gap-2'><input type='checkbox' checked={form.firstBookingOnly} onChange={(event) => setForm((prev) => ({ ...prev, firstBookingOnly: event.target.checked }))} /> First booking only</label>
              </div>
            </div>
            <div className='mt-6 flex gap-3'>
              <button type='submit' className='rounded-2xl bg-primary px-5 py-3 font-semibold text-white'>{editingId ? 'Update Coupon' : 'Create Coupon'}</button>
              {editingId && (
                <button type='button' onClick={() => { setEditingId(null); setForm(emptyCoupon) }} className='rounded-2xl bg-slate-100 px-5 py-3 font-semibold text-slate-700'>Cancel</button>
              )}
            </div>
          </form>

          <div className='rounded-3xl bg-white p-6 shadow-sm'>
            <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
              <h3 className='text-lg font-semibold text-slate-900'>Coupon Inventory</h3>
              <div className='flex flex-col gap-3 md:flex-row'>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder='Search code, description, or funder'
                  className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none'
                />
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none'>
                  <option value='all'>All statuses</option>
                  <option value='active'>Active</option>
                  <option value='paused'>Paused</option>
                </select>
              </div>
            </div>
            <div className='mt-5 overflow-x-auto'>
              <table className='min-w-full text-sm'>
                <thead>
                  <tr className='text-left text-gray-500'>
                    <th className='pb-3'>Code</th>
                    <th className='pb-3'>Rule</th>
                    <th className='pb-3'>Conditions</th>
                    <th className='pb-3'>Status</th>
                    <th className='pb-3'>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan='5' className='py-10 text-center text-gray-500'>Loading coupons...</td>
                    </tr>
                  ) : filteredCoupons.length ? filteredCoupons.map((coupon) => (
                    <tr key={coupon._id} className='border-t border-slate-100 align-top'>
                      <td className='py-4'>
                        <p className='font-semibold text-slate-900'>{coupon.code}</p>
                        <p className='text-xs text-gray-500'>{coupon.description}</p>
                      </td>
                      <td className='py-4 text-gray-600'>{coupon.type} • {coupon.value}</td>
                      <td className='py-4 text-gray-600'>
                        <p>Min {coupon.minBookingAmount || 0}</p>
                        <p>Max {coupon.maxDiscount || 0}</p>
                        <p>{coupon.category || 'Any category'}</p>
                      </td>
                      <td className='py-4'>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${coupon.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{coupon.active ? 'Active' : 'Paused'}</span>
                      </td>
                      <td className='py-4'>
                        <div className='flex gap-2'>
                          <button
                            onClick={() => {
                              setEditingId(coupon._id)
                              setForm({
                                ...coupon,
                                startsAt: coupon.startsAt?.split('T')[0] || '',
                                expiresAt: coupon.expiresAt?.split('T')[0] || '',
                              })
                            }}
                            className='rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700'
                          >
                            Edit
                          </button>
                          <button onClick={() => removeCoupon(coupon._id)} className='rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600'>Delete</button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan='5' className='py-10 text-center text-gray-500'>No coupons match these filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Coupons
