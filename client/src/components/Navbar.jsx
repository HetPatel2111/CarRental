import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { motion as Motion } from "motion/react";
import { assets, menuLinks } from "../assets/assets";
import { useAppContext } from "../hooks/useAppContext";

const Navbar = () => {
    const { setShowLogin, user, logout, isOwner, axios, setIsOwner } = useAppContext();
    const location = useLocation();
    const navigate = useNavigate();

    const [open, setOpen] = useState(false);
    const [searchInput, setSearchInput] = useState("");

    const changeRole = async () => {
        try {
            const { data } = await axios.post("/api/owner/change-role");
            if (data.success) {
                setIsOwner(true);
                toast.success(data.message);
                navigate("/owner");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
        }
    };

    const handleSearch = (event) => {
        event.preventDefault();
        const query = new URLSearchParams();

        if (searchInput.trim()) {
            query.set("search", searchInput.trim());
        }

        navigate(`/cars${query.toString() ? `?${query.toString()}` : ""}`);
        setOpen(false);
    };

    const handleOwnerAction = () => {
        if (!user) {
            toast.error("Please log in to access owner features.");
            setShowLogin(true);
            return;
        }

        if (isOwner) {
            navigate("/owner");
            return;
        }

        void changeRole();
    };

    return (
        <Motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className={`relative flex items-center justify-between border-b border-borderColor px-6 py-4 text-gray-600 transition-all md:px-16 lg:px-24 xl:px-32 ${
                location.pathname === "/" ? "bg-light" : "bg-white"
            }`}
        >
            <Link to="/">
                <Motion.img whileHover={{ scale: 1.05 }} src={assets.logo} alt="CarRental logo" className="h-8" />
            </Link>

            <div
                className={`right-0 z-50 flex flex-col items-start gap-4 transition-all duration-300 max-sm:fixed max-sm:top-16 max-sm:h-screen max-sm:w-full max-sm:border-t max-sm:border-borderColor max-sm:p-4 sm:flex-row sm:items-center sm:gap-8 ${
                    location.pathname === "/" ? "bg-light" : "bg-white"
                } ${open ? "max-sm:translate-x-0" : "max-sm:translate-x-full"}`}
            >
                {menuLinks.map((link) => (
                    <Link key={link.path} to={link.path} onClick={() => setOpen(false)}>
                        {link.name}
                    </Link>
                ))}

                <form
                    onSubmit={handleSearch}
                    className="hidden items-center gap-2 rounded-full border border-borderColor px-3 text-sm lg:flex"
                >
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                        className="w-full bg-transparent py-1.5 outline-none placeholder-gray-500"
                        placeholder="Search cars"
                    />
                    <button type="submit">
                        <img src={assets.search_icon} alt="search" />
                    </button>
                </form>

                <div className="flex items-start gap-6 max-sm:flex-col sm:items-center">
                    <button onClick={handleOwnerAction} className="cursor-pointer">
                        {isOwner ? "Dashboard" : "Become an owner"}
                    </button>

                    <button
                        onClick={() => {
                            if (user) {
                                logout();
                                return;
                            }

                            setShowLogin(true);
                        }}
                        className="rounded-lg bg-primary px-8 py-2 text-white transition-all hover:bg-primary-dull"
                    >
                        {user ? "Logout" : "Login"}
                    </button>
                </div>
            </div>

            <button className="cursor-pointer sm:hidden" aria-label="Menu" onClick={() => setOpen(!open)}>
                <img src={open ? assets.close_icon : assets.menu_icon} alt="menu" />
            </button>
        </Motion.div>
    );
};

export default Navbar;
