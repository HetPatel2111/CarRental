import React, { useEffect, useMemo, useState } from 'react'
import { assets } from '../../assets/assets'
import Title from '../../components/owner/Title'
import { useAppContext } from '../../contex/AppContext'
import toast from 'react-hot-toast'

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null

const ManageCars = () => {
  const { isOwner, axios, currency } = useAppContext()
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const fetchOwnerCars = async () => {
    try {
      setLoading(true)
      const { data } = await axios.get('/api/owner/cars')
      if (data.success) {
        setCars(data.cars)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleAvailability = async (carId) => {
    try {
      const { data } = await axios.post('/api/owner/toggle-car', { carId })
      if (data.success) {
        toast.success(data.message)
        fetchOwnerCars()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const deleteCar = async (carId) => {
    try {
      const confirmed = window.confirm('Are you sure you want to delete this car?')
      if (!confirmed) return

      const { data } = await axios.post('/api/owner/delete-car', { carId })
      if (data.success) {
        toast.success(data.message)
        fetchOwnerCars()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(() => {
    if (isOwner) {
      fetchOwnerCars()
    }
  }, [isOwner])

  const categories = useMemo(
    () => ['all', ...new Set(cars.map((car) => car.category).filter(Boolean))],
    [cars]
  )

  const filteredCars = useMemo(() => {
    const query = search.trim().toLowerCase()

    return cars.filter((car) => {
      const matchesQuery = !query || [
        car.brand,
        car.model,
        car.category,
        car.location,
        car.transmission,
        car.fuel_type
      ].join(' ').toLowerCase().includes(query)

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'available' && car.isAvaliable) ||
        (statusFilter === 'unavailable' && !car.isAvaliable)

      const matchesCategory = categoryFilter === 'all' || car.category === categoryFilter

      return matchesQuery && matchesStatus && matchesCategory
    })
  }, [cars, search, statusFilter, categoryFilter])

  const summary = useMemo(() => ({
    total: cars.length,
    available: cars.filter((car) => car.isAvaliable).length,
    unavailable: cars.filter((car) => !car.isAvaliable).length,
    avgPrice: cars.length ? Math.round(cars.reduce((sum, car) => sum + Number(car.pricePerDay || 0), 0) / cars.length) : 0
  }), [cars])

  return (
    <div className='w-full bg-slate-50 px-4 py-8 md:px-10'>
      <div className='rounded-[28px] bg-white p-6 shadow-sm'>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
          <Title
            title='Manage Cars'
            subTitle='Search inventory, monitor listing health, and quickly toggle availability before bookings are affected.'
          />
          <button
            onClick={fetchOwnerCars}
            className='rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary'
          >
            Refresh Inventory
          </button>
        </div>
      </div>

      <div className='mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        {[
          { label: 'Total Cars', value: summary.total, tone: 'bg-slate-900 text-white' },
          { label: 'Available Now', value: summary.available, tone: 'bg-emerald-500 text-white' },
          { label: 'Unavailable', value: summary.unavailable, tone: 'bg-amber-500 text-white' },
          { label: 'Avg Daily Price', value: `${currency}${summary.avgPrice}`, tone: 'bg-white text-slate-900 border border-slate-200' }
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
            placeholder='Search by model, category, city, or transmission'
            className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none'
          />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none'>
            <option value='all'>All statuses</option>
            <option value='available'>Available only</option>
            <option value='unavailable'>Unavailable only</option>
          </select>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none'>
            {categories.map((category) => (
              <option key={category} value={category}>{category === 'all' ? 'All categories' : category}</option>
            ))}
          </select>
        </div>

        <div className='mt-6 overflow-x-auto'>
          <table className='min-w-full text-left text-sm text-gray-600'>
            <thead className='border-b border-slate-100 text-gray-500'>
              <tr>
                <th className='pb-4 font-medium'>Car</th>
                <th className='pb-4 font-medium'>Location</th>
                <th className='pb-4 font-medium'>Pricing</th>
                <th className='pb-4 font-medium'>Status</th>
                <th className='pb-4 font-medium'>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan='5' className='py-10 text-center text-gray-500'>Loading inventory...</td>
                </tr>
              ) : filteredCars.length ? filteredCars.map((car) => (
                <tr key={car._id} className='border-b border-slate-100 align-top'>
                  <td className='py-4'>
                    <div className='flex items-center gap-3'>
                      <img src={car.image} alt='' className='h-14 w-14 rounded-2xl object-cover' />
                      <div>
                        <p className='font-semibold text-slate-900'>{car.brand} {car.model}</p>
                        <p className='text-xs text-gray-500'>
                          {car.category} • {car.seating_capacity} seats • {car.transmission}
                        </p>
                        <p className='text-xs text-gray-400'>
                          {formatDate(car.buyDate) ? `Bought ${formatDate(car.buyDate)}` : `Fuel ${car.fuel_type}`}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className='py-4'>
                    <p className='font-medium text-slate-900'>{car.location}</p>
                    <p className='text-xs text-gray-500'>{car.year}</p>
                  </td>
                  <td className='py-4'>
                    <p className='font-semibold text-slate-900'>{currency}{car.pricePerDay}</p>
                    <p className='text-xs text-gray-500'>per day</p>
                  </td>
                  <td className='py-4'>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${car.isAvaliable ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                      {car.isAvaliable ? 'Available' : 'Unavailable'}
                    </span>
                  </td>
                  <td className='py-4'>
                    <div className='flex items-center gap-2'>
                      <button
                        onClick={() => toggleAvailability(car._id)}
                        className='rounded-2xl bg-slate-100 p-3 transition hover:bg-slate-200'
                        title='Toggle availability'
                      >
                        <img src={car.isAvaliable ? assets.eye_close_icon : assets.eye_icon} alt='' className='h-4 w-4' />
                      </button>
                      <button
                        onClick={() => deleteCar(car._id)}
                        className='rounded-2xl bg-rose-50 p-3 transition hover:bg-rose-100'
                        title='Delete car'
                      >
                        <img src={assets.delete_icon} alt='' className='h-4 w-4' />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan='5' className='py-10 text-center text-gray-500'>No cars match these filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default ManageCars
