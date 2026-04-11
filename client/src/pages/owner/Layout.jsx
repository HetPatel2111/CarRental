import { Navigate, Outlet } from "react-router-dom";
import Sidebar from "../../components/owner/Sidebar";
import NavbarOwner from "../../components/owner/NavbarOwner";
import Loader from "../../components/Loader";
import { useAppContext } from "../../hooks/useAppContext";

const Layout = () => {
    const { isOwner, authLoading } = useAppContext();

    if (authLoading) {
        return <Loader />;
    }

    if (!isOwner) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="flex flex-col">
            <NavbarOwner />
            <div className="flex">
                <Sidebar />
                <Outlet />
            </div>
        </div>
    );
};

export default Layout;
