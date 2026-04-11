import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import AppContext from "./app-context";

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

export const AppProvider = ({ children }) => {
    const navigate = useNavigate();
    const currency = import.meta.env.VITE_CURRENCY || "$";

    const [token, setTokenState] = useState(() => localStorage.getItem("token"));
    const [user, setUser] = useState(null);
    const [isOwner, setIsOwner] = useState(false);
    const [showLogin, setShowLogin] = useState(false);
    const [cars, setCars] = useState([]);
    const [authLoading, setAuthLoading] = useState(Boolean(localStorage.getItem("token")));
    const [carsLoading, setCarsLoading] = useState(true);

    const applyAuthToken = useCallback((nextToken) => {
        if (nextToken) {
            axios.defaults.headers.common.Authorization = `Bearer ${nextToken}`;
            return;
        }

        delete axios.defaults.headers.common.Authorization;
    }, []);

    const setToken = useCallback(
        (nextToken) => {
            if (nextToken) {
                localStorage.setItem("token", nextToken);
            } else {
                localStorage.removeItem("token");
            }

            setTokenState(nextToken);
            applyAuthToken(nextToken);
        },
        [applyAuthToken]
    );

    const fetchCars = useCallback(async () => {
        setCarsLoading(true);

        try {
            const { data } = await axios.get("/api/user/cars");
            if (data.success) {
                setCars(data.cars);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        } finally {
            setCarsLoading(false);
        }
    }, []);

    const logout = useCallback(
        (message = "You have been logged out") => {
            setToken(null);
            setUser(null);
            setIsOwner(false);
            setShowLogin(false);

            if (message) {
                toast.success(message);
            }

            navigate("/");
        },
        [navigate, setToken]
    );

    const fetchUser = useCallback(async () => {
        if (!token) {
            setUser(null);
            setIsOwner(false);
            setAuthLoading(false);
            return;
        }

        setAuthLoading(true);

        try {
            applyAuthToken(token);
            const { data } = await axios.get("/api/user/data");

            if (data.success) {
                setUser(data.user);
                setIsOwner(data.user.role === "owner");
                return;
            }

            setToken(null);
            setUser(null);
            setIsOwner(false);
        } catch (error) {
            setToken(null);
            setUser(null);
            setIsOwner(false);
            toast.error(error.response?.data?.message || "Session expired. Please log in again.");
        } finally {
            setAuthLoading(false);
        }
    }, [applyAuthToken, setToken, token]);

    useEffect(() => {
        applyAuthToken(token);
    }, [applyAuthToken, token]);

    useEffect(() => {
        void fetchCars();
    }, [fetchCars]);

    useEffect(() => {
        void fetchUser();
    }, [fetchUser]);

    const value = {
        navigate,
        currency,
        axios,
        user,
        setUser,
        token,
        setToken,
        isOwner,
        setIsOwner,
        fetchUser,
        showLogin,
        setShowLogin,
        logout,
        fetchCars,
        cars,
        setCars,
        authLoading,
        carsLoading,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
