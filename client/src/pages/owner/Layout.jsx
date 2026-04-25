import React, { useEffect } from 'react'
import Sidebar from '../../components/owner/Sidebar'
import { Outlet } from 'react-router-dom'
import NavbarOwner from '../../components/owner/NavbarOwner'
import { useAppContext } from '../../contex/AppContext'

const Layout = ({ requiredRole = 'owner', basePath = '/owner' }) => {

  const {isOwner , isAdmin, user , navigate, requestLogin} = useAppContext()

  useEffect(()=>{
    if(!user){
      if (!localStorage.getItem('token')) {
        requestLogin({ redirectPath: basePath })
        navigate('/')
      }
      return
    }

    const roleAllowed =
      requiredRole === 'admin' ? isAdmin : isOwner

    if(!roleAllowed){
      navigate('/')
    }
  }, [basePath, isAdmin, isOwner, navigate, requestLogin, requiredRole, user])

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
