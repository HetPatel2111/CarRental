import { Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Login from "./components/Login";
import Home from "./pages/Home";
import Cars from "./pages/Cars";
import CarDetails from "./pages/CarDetails";
import MyBookings from "./pages/MyBookings";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancel from "./pages/PaymentCancel";
import Layout from "./pages/owner/Layout";
import Dashboard from "./pages/owner/Dashboard";
import AddCar from "./pages/owner/AddCar";
import ManageCars from "./pages/owner/ManageCars";
import ManageBookings from "./pages/owner/ManageBookings";
import EmptyState from "./components/EmptyState";
import { useAppContext } from "./hooks/useAppContext";

const App = () => {
    const { showLogin } = useAppContext();
    const isOwnerPath = useLocation().pathname.startsWith("/owner");

    return (
        <>
            <Toaster position="top-right" />
            {showLogin ? <Login /> : null}
            {!isOwnerPath ? <Navbar /> : null}

            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/cars" element={<Cars />} />
                <Route path="/car-details/:id" element={<CarDetails />} />
                <Route path="/my-bookings" element={<MyBookings />} />
                <Route path="/payment/success" element={<PaymentSuccess />} />
                <Route path="/payment/cancel" element={<PaymentCancel />} />

                <Route path="/owner" element={<Layout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="add-car" element={<AddCar />} />
                    <Route path="manage-cars" element={<ManageCars />} />
                    <Route path="manage-bookings" element={<ManageBookings />} />
                </Route>

                <Route
                    path="*"
                    element={
                        <div className="px-6 py-24 md:px-16 lg:px-24 xl:px-32">
                            <EmptyState
                                title="Page not found"
                                description="The page you are looking for does not exist or may have been moved."
                            />
                        </div>
                    }
                />
            </Routes>

            {!isOwnerPath ? <Footer /> : null}
        </>
    );
};

export default App;
