import { Link } from "react-router-dom";
import { assets } from "../../assets/assets";
import { useAppContext } from "../../hooks/useAppContext";

const NavbarOwner = () => {
    const { user } = useAppContext();

    return (
        <div className="relative flex items-center justify-between border-b border-borderColor px-6 py-4 text-gray-500 transition-all md:px-10">
            <Link to="/">
                <img src={assets.logo} alt="CarRental logo" className="h-7" />
            </Link>
            <p>Welcome, {user?.name || "Owner"}</p>
        </div>
    );
};

export default NavbarOwner;
