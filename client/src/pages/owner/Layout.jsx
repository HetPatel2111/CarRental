import React, { useEffect } from 'react'
import Sidebar from '../../components/owner/Sidebar'
import { Outlet } from 'react-router-dom'
import NavbarOwner from '../../components/owner/NavbarOwner'
import { useAppContext } from '../../contex/AppContext'

const Layout = () => {

  const {isOwner , navigate} = useAppContext()

  useEffect(()=>{
    if(!isOwner){
      navigate('/')
    }
  })

  return (
    <div className='flex flex-col'>
      <NavbarOwner />
      <div className='flex min-h-[calc(100vh-65px)]'>
          <Sidebar />
          <div className='flex-1 min-w-0'>
            <Outlet />
          </div>
      </div>
    </div>  
  )
}

export default Layout
