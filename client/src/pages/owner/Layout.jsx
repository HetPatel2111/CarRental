import React, { useEffect } from 'react'
import Sidebar from '../../components/owner/Sidebar'
import { Outlet } from 'react-router-dom'
import NavbarOwner from '../../components/owner/NavbarOwner'
import { useAppContext } from '../../contex/AppContext'

const Layout = () => {

  const {isOwner , user , navigate, requestLogin} = useAppContext()

  useEffect(()=>{
    if(!user){
      if (!localStorage.getItem('token')) {
        requestLogin({ redirectPath: '/owner' })
        navigate('/')
      }
      return
    }

    if(!isOwner){
      navigate('/')
    }
  }, [isOwner, navigate, requestLogin, user])

  return (
    <div className='flex flex-col'>
      <NavbarOwner />
      <div className='flex'>
          <Sidebar />
          <Outlet />
      </div>
    </div>  
  )
}

export default Layout
