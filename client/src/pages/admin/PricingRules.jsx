import React, { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-hot-toast'
import Title from '../../components/owner/Title'
import { useAppContext } from '../../contex/AppContext'

const defaultFestival = { name: '', startDate: '', endDate: '', surchargePercent: 0, active: true }

const PricingRules = () => {
  const { axios } = useAppContext()
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchConfig = async () => {
    try {
      setLoading(true)
      const { data } = await axios.get('/api/admin/pricing-config')
      if (data.success) {
        setConfig({
          ...data.pricingConfig,
          festivals: (data.pricingConfig.festivals || []).map((festival) => ({
            ...festival,
            startDate: festival.startDate?.split('T')[0] || '',
            endDate: festival.endDate?.split('T')[0] || '',
          })),
        })
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
    fetchConfig()
  }, [])

  const updateField = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }))
  }

  const updateFestival = (index, field, value) => {
    setConfig((prev) => ({
      ...prev,
      festivals: prev.festivals.map((festival, currentIndex) =>
        currentIndex === index ? { ...festival, [field]: value } : festival
      ),
    }))
  }

  const saveConfig = async (event) => {
    event.preventDefault()
    try {
      const { data } = await axios.put('/api/admin/pricing-config', config)
      if (data.success) {
        toast.success(data.message)
        fetchConfig()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const pricingPreview = useMemo(() => {
    if (!config) return null

    const averageMarkup =
      Number(config.weekendPercent || 0) +
      Number(config.trendingPercent || 0) +
      Number(config.demandPercent || 0) +
      Number(config.inventoryPercent || 0) +
      Number(config.lastMinutePercent || 0)

    const averageFee =
      Number(config.serviceFeeBase || 0) +
      Number(config.serviceFeeWeekend || 0) +
      Number(config.serviceFeeFestival || 0)

    return {
      activeFestivals: (config.festivals || []).filter((festival) => festival.active !== false).length,
      averageMarkup,
      averageFee
    }
  }, [config])

  if (loading) {
    return <section className='flex-1 min-h-screen bg-slate-50 p-8'><div className='rounded-3xl bg-white p-10 text-center text-gray-500'>Loading pricing controls...</div></section>
  }

  return (
    <section className='flex-1 min-h-screen bg-slate-50 p-5 md:p-8'>
      <div className='mx-auto max-w-6xl space-y-6'>
        <div className='rounded-3xl bg-white p-6 shadow-sm'>
          <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
            <Title
              title='Pricing Rules'
              subTitle='Control weekend, festival, trending, demand, service fee, payment hold, and gateway assumptions without touching server code.'
            />
            <button onClick={fetchConfig} className='rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary'>
              Refresh Rules
            </button>
          </div>
        </div>

        <div className='grid gap-4 md:grid-cols-3'>
          <div className='rounded-3xl bg-slate-900 p-5 text-white shadow-sm'>
            <p className='text-sm opacity-80'>Active Festivals</p>
            <p className='mt-3 text-3xl font-semibold'>{pricingPreview?.activeFestivals || 0}</p>
          </div>
          <div className='rounded-3xl bg-blue-600 p-5 text-white shadow-sm'>
            <p className='text-sm opacity-80'>Markup Stack</p>
            <p className='mt-3 text-3xl font-semibold'>{pricingPreview?.averageMarkup || 0}%</p>
          </div>
          <div className='rounded-3xl bg-white p-5 text-slate-900 shadow-sm border border-slate-200'>
            <p className='text-sm text-gray-500'>Base+Seasonal Fee Mix</p>
            <p className='mt-3 text-3xl font-semibold'>{pricingPreview?.averageFee || 0}</p>
          </div>
        </div>

        <form onSubmit={saveConfig} className='space-y-6'>
          <div className='grid gap-6 xl:grid-cols-2'>
            <div className='rounded-3xl bg-white p-6 shadow-sm'>
              <h3 className='text-lg font-semibold text-slate-900'>Markup Rules</h3>
              <div className='mt-5 grid gap-4 md:grid-cols-2'>
                {[
                  ['weekendPercent', 'Weekend %'],
                  ['trendingPercent', 'Trending %'],
                  ['demandPercent', 'Demand %'],
                  ['inventoryPercent', 'Low inventory %'],
                  ['lastMinutePercent', 'Last-minute %'],
                  ['trendingBookingThreshold', 'Trending threshold'],
                  ['demandBookingThreshold', 'Demand threshold'],
                  ['lowInventoryThreshold', 'Low inventory threshold'],
                ].map(([field, label]) => (
                  <label key={field} className='text-sm text-gray-600'>
                    <span className='mb-2 block'>{label}</span>
                    <input
                      type='number'
                      value={config?.[field] ?? 0}
                      onChange={(event) => updateField(field, event.target.value)}
                      className='w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none'
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className='rounded-3xl bg-white p-6 shadow-sm'>
              <h3 className='text-lg font-semibold text-slate-900'>Fee and Hold Rules</h3>
              <div className='mt-5 grid gap-4 md:grid-cols-2'>
                {[
                  ['serviceFeeBase', 'Base service fee'],
                  ['serviceFeeWeekend', 'Weekend fee add'],
                  ['serviceFeeFestival', 'Festival fee add'],
                  ['serviceFeeTrending', 'Trending fee add'],
                  ['serviceFeeDemand', 'Demand fee add'],
                  ['serviceFeeInventory', 'Inventory fee add'],
                  ['serviceFeePremium', 'Premium fee add'],
                  ['gatewayRate', 'Gateway rate'],
                  ['gatewayFixedFee', 'Gateway fixed fee'],
                  ['paymentHoldMinutes', 'Payment hold minutes'],
                ].map(([field, label]) => (
                  <label key={field} className='text-sm text-gray-600'>
                    <span className='mb-2 block'>{label}</span>
                    <input
                      type='number'
                      step={field === 'gatewayRate' ? '0.01' : '1'}
                      value={config?.[field] ?? 0}
                      onChange={(event) => updateField(field, event.target.value)}
                      className='w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none'
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className='rounded-3xl bg-white p-6 shadow-sm'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <h3 className='text-lg font-semibold text-slate-900'>Festival Calendar</h3>
                <p className='text-sm text-gray-500'>These dates automatically apply seasonal price uplifts.</p>
              </div>
              <button
                type='button'
                onClick={() => setConfig((prev) => ({ ...prev, festivals: [...(prev.festivals || []), defaultFestival] }))}
                className='rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white'
              >
                Add Festival
              </button>
            </div>

            <div className='mt-5 space-y-4'>
              {(config?.festivals || []).map((festival, index) => (
                <div key={`${festival.name}-${index}`} className='grid gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-5'>
                  <input value={festival.name} onChange={(event) => updateFestival(index, 'name', event.target.value)} placeholder='Festival name' className='rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none' />
                  <input type='date' value={festival.startDate} onChange={(event) => updateFestival(index, 'startDate', event.target.value)} className='rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none' />
                  <input type='date' value={festival.endDate} onChange={(event) => updateFestival(index, 'endDate', event.target.value)} className='rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none' />
                  <input type='number' value={festival.surchargePercent} onChange={(event) => updateFestival(index, 'surchargePercent', event.target.value)} placeholder='Surcharge %' className='rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none' />
                  <div className='flex items-center gap-3'>
                    <label className='flex items-center gap-2 text-sm text-gray-600'>
                      <input type='checkbox' checked={festival.active !== false} onChange={(event) => updateFestival(index, 'active', event.target.checked)} />
                      Active
                    </label>
                    <button
                      type='button'
                      onClick={() => setConfig((prev) => ({ ...prev, festivals: prev.festivals.filter((_, currentIndex) => currentIndex !== index) }))}
                      className='rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600'
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button type='submit' className='rounded-2xl bg-primary px-6 py-3 font-semibold text-white shadow-sm'>Save Pricing Rules</button>
        </form>
      </div>
    </section>
  )
}

export default PricingRules
