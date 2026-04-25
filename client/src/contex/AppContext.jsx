import { createContext, useCallback, useContext, useEffect, useState } from "react";
import axios from "axios"
import {toast} from "react-hot-toast"
import { useNavigate } from "react-router-dom";

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL

export const AppContext = createContext();

const getErrorMessage = (error) => {
    const responseMessage = error?.response?.data?.message

    if (responseMessage) {
        return responseMessage
    }

    if (error?.response?.status === 429) {
        return "Too many attempts for now. Please wait a few minutes and try again."
    }

    if (error?.response?.status === 401) {
        return "Please log in to continue."
    }

    return error?.message || "Something went wrong. Please try again."
}

export const AppProvider = ({children}) =>{
    
    const navigate = useNavigate()
    const currency = import.meta.env.VITE_CURRENCY

    const [token,setToken] = useState(null)
    const[user,setUser] = useState(null)
    const[isOwner,setIsOwner] = useState(false)
    const[isAdmin,setIsAdmin] = useState(false)
    const[showLogin,setShowLogin]=useState(false)
    const[loginRedirectPath,setLoginRedirectPath] = useState(null)
    const[pendingLoginAction,setPendingLoginAction] = useState(null)
    const[pickupDate,setPickupDate] = useState('')
    const[returnDate,setReturnDate] = useState('')

    const[cars,setCars] = useState([])

    // function to check if user is logged in
    const fetchUser = async()=>{
        try{
            const {data} = await axios.get('/api/user/data')
            if(data.success){
                setUser(data.user)
                setIsOwner(data.user.role === 'owner')
                setIsAdmin(data.user.role === 'admin')
            }else{
                navigate('/')
            }
        }catch(error){
            if (error?.response?.status === 401) {
                logout(false)
                setShowLogin(true)
            }
            toast.error(getErrorMessage(error))
        }
    }

     // Function to fetch all cars from server

        const fetchCars = async()=>{
            try{
                const {data} = await axios.get('/api/user/cars')
                data.success ? setCars(data.cars) : toast.error(data.message)
            }catch(error){
                toast.error(getErrorMessage(error))
            }
        }

        // Function to logout 
        const logout = (showToast = true)=>{
            localStorage.removeItem('token')
            setToken(null)
            setUser(null)
            setIsOwner(false)
            setIsAdmin(false)
            setLoginRedirectPath(null)
            setPendingLoginAction(null)
            delete axios.defaults.headers.common['Authorization']

            if (showToast) {
                toast.success("You have been logged out")
            }
        }

        const requestLogin = useCallback(({ redirectPath, onSuccess } = {}) => {
            if (redirectPath) {
                setLoginRedirectPath(redirectPath)
            }

            if (onSuccess) {
                setPendingLoginAction(() => onSuccess)
            }

            setShowLogin(true)
        }, [])

        const completeLoginRedirect = useCallback(() => {
            const redirectPath = loginRedirectPath
            const action = pendingLoginAction

            setLoginRedirectPath(null)
            setPendingLoginAction(null)

            if (redirectPath) {
                navigate(redirectPath)
            }

            if (action) {
                setTimeout(action, 0)
            }
        }, [loginRedirectPath, navigate, pendingLoginAction])

        // useEffect to retrive the token from localStorage
        // useEffect(()=>{
        //     const token = localStorage.getItem('token')
        //     setToken(token)
        //     fetchCars()
        // },[])
        useEffect(()=>{
            const storedToken = localStorage.getItem('token')
    
            if(storedToken){
                axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}` // ✅ set header immediately
                setToken(storedToken)
            }
    
            fetchCars()
        },[])

        useEffect(() => {
            const interceptorId = axios.interceptors.response.use(
                (response) => response,
                (error) => {
                    if (error?.response?.status === 401 || error?.response?.status === 429) {
                        error.message = getErrorMessage(error)
                    }

                    return Promise.reject(error)
                }
            )

            return () => {
                axios.interceptors.response.eject(interceptorId)
            }
        }, [])

        // useEffect to fetch user data when token is available
        useEffect(()=>{
            if(token){
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
                fetchUser()
            }
        },[token])
    
    const value ={
        navigate , currency,axios , user , setUser,
        token , setToken , isOwner , setIsOwner , isAdmin , setIsAdmin , fetchUser , showLogin ,
        setShowLogin , requestLogin , completeLoginRedirect , logout , fetchCars , cars , setCars,
        pickupDate , setPickupDate , returnDate , setReturnDate , getErrorMessage
    }

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    )
}

export const useAppContext = ()=>{
    return useContext(AppContext)
}
