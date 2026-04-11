import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { toast } from "react-hot-toast";
import { assets, ownerMenuLinks } from "../../assets/assets";
import { useAppContext } from "../../hooks/useAppContext";
import { getErrorMessage } from "../../utils/formatters";

const Sidebar = () => {
    const { user, axios, fetchUser } = useAppContext();
    const location = useLocation();
    const [image, setImage] = useState(null);
    const previewUrl = useMemo(() => (image ? URL.createObjectURL(image) : ""), [image]);

    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const updateImage = async () => {
        if (!image) {
            return;
        }

        try {
            const formData = new FormData();
            formData.append("image", image);

            const { data } = await axios.post("/api/owner/update-image", formData);

            if (data.success) {
                await fetchUser();
                toast.success(data.message);
                setImage(null);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    return (
        <div className="relative min-h-screen w-full max-w-13 border-r border-borderColor pt-8 text-sm md:flex md:max-w-60 md:flex-col md:items-center">
            <div className="group relative">
                <label htmlFor="image">
                    <img
                        src={
                            previewUrl ||
                            user?.image ||
                            "https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=300"
                        }
                        alt="Profile"
                        className="mx-auto h-9 w-9 rounded-full md:h-14 md:w-14"
                    />
                    <input
                        type="file"
                        id="image"
                        accept="image/*"
                        hidden
                        onChange={(event) => setImage(event.target.files?.[0] || null)}
                    />

                    <div className="absolute inset-0 hidden cursor-pointer items-center justify-center rounded-full bg-black/10 group-hover:flex">
                        <img src={assets.edit_icon} alt="" />
                    </div>
                </label>
            </div>

            {image ? (
                <button
                    className="absolute right-0 top-0 flex cursor-pointer gap-1 bg-primary/10 p-2 text-primary"
                    onClick={updateImage}
                >
                    Save <img src={assets.check_icon} alt="" width={13} />
                </button>
            ) : null}

            <p className="mt-2 text-base max-md:hidden">{user?.name}</p>

            <div className="w-full">
                {ownerMenuLinks.map((link) => (
                    <NavLink
                        key={link.path}
                        to={link.path}
                        className={`relative flex w-full items-center gap-2 py-3 pl-4 first:mt-6 ${
                            link.path === location.pathname ? "bg-primary/10 text-primary" : "text-gray-600"
                        }`}
                    >
                        <img src={link.path === location.pathname ? link.coloredIcon : link.icon} alt={link.name} />
                        <span className="max-md:hidden">{link.name}</span>
                        <div
                            className={`${link.path === location.pathname ? "bg-primary" : ""} absolute right-0 h-8 w-1.5 rounded-l`}
                        />
                    </NavLink>
                ))}
            </div>
        </div>
    );
};

export default Sidebar;
