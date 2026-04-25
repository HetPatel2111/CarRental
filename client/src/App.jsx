import React from 'react'
import Navbar from './components/Navbar'
import { Route, Routes, useLocation } from 'react-router-dom';
import Home from './pages/Home'
import CarDetails from './pages/CarDetails';
import Cars from './pages/Cars';
import MyBookings from './pages/MyBookings';
import Footer from './components/Footer';
import Layout from './pages/owner/Layout'
import Dashboard from './pages/owner/Dashboard';
import AddCar from './pages/owner/AddCar';
import ManageCars from './pages/owner/ManageCars';
import ManageBooking from './pages/owner/ManageBookings';
import AdminDashboard from './pages/admin/Dashboard';
import PricingRules from './pages/admin/PricingRules';
import Coupons from './pages/admin/Coupons';
import Settlements from './pages/admin/Settlements';
import Login from './components/Login';
import Chatbot from './components/Chatbot';
import {Toaster} from "react-hot-toast"
import { useAppContext } from './contex/AppContext';

const App = () => {

  const {showLogin} = useAppContext()
  const pathname = useLocation().pathname
  const isWorkspacePath = pathname.startsWith('/owner') || pathname.startsWith('/admin')

  return (
    <>
      <Toaster />
      {showLogin && <Login/>}
      {!isWorkspacePath && <Navbar/>}

      <Routes> 
        <Route path='/' element={<Home/>}/>
        <Route path='/car-details/:id' element={<CarDetails />}/>
        <Route path='/cars' element={<Cars/>}/>
        <Route path='/my-bookings' element={<MyBookings />}/>

        <Route path='/owner' element={<Layout requiredRole='owner' basePath='/owner' />}>
          <Route index element={<Dashboard />}/>
          <Route path='add-car' element={<AddCar />}/>
          <Route path='manage-cars' element={<ManageCars />}/>
          <Route path='manage-bookings' element={<ManageBooking />}/>
        </Route>

        <Route path='/admin' element={<Layout requiredRole='admin' basePath='/admin' />}>
          <Route index element={<AdminDashboard />}/>
          <Route path='pricing-rules' element={<PricingRules />}/>
          <Route path='coupons' element={<Coupons />}/>
          <Route path='settlements' element={<Settlements />}/>
        </Route>
        
        <Route />
        <Route />
        <Route />
      </Routes>

      {!isWorkspacePath && <Footer />}
      {!isWorkspacePath && <Chatbot />}
      
    </>
  )
}

export default App
