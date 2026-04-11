import { useState } from "react";
import { motion as Motion } from "motion/react";
import { toast } from "react-hot-toast";
import { assets, cityList } from "../assets/assets";
import { useAppContext } from "../hooks/useAppContext";

const Hero = () => {
    const { navigate } = useAppContext();
    const [pickupLocation, setPickupLocation] = useState("");
    const [pickupDate, setPickupDate] = useState("");
    const [returnDate, setReturnDate] = useState("");

    const today = new Date().toISOString().split("T")[0];

    const handleSearch = (event) => {
        event.preventDefault();

        if (!pickupLocation || !pickupDate || !returnDate) {
            toast.error("Please complete all search fields.");
            return;
        }

        if (returnDate < pickupDate) {
            toast.error("Return date must be after the pickup date.");
            return;
        }

        const query = new URLSearchParams({
            PickupLocation: pickupLocation,
            pickupDate,
            returnDate,
        });

        navigate(`/cars?${query.toString()}`);
    };

    return (
        <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="flex min-h-screen flex-col items-center justify-center gap-14 bg-light px-6 text-center"
        >
            <Motion.h1
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="max-w-4xl text-4xl font-semibold md:text-5xl"
            >
                Book reliable cars with a clean, modern rental experience
            </Motion.h1>

            <Motion.form
                initial={{ scale: 0.95, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                onSubmit={handleSearch}
                className="flex w-full max-w-5xl flex-col items-start justify-between gap-6 rounded-3xl bg-white p-6 text-left shadow-[0px_18px_45px_rgba(15,23,42,0.12)] md:flex-row md:items-end"
            >
                <div className="grid w-full gap-5 md:grid-cols-3">
                    <div className="flex flex-col gap-2">
                        <label htmlFor="pickup-location" className="text-sm font-medium text-gray-700">
                            Pickup location
                        </label>
                        <select
                            id="pickup-location"
                            required
                            value={pickupLocation}
                            onChange={(event) => setPickupLocation(event.target.value)}
                            className="rounded-xl border border-borderColor px-4 py-3 text-sm text-gray-600 outline-none"
                        >
                            <option value="">Select location</option>
                            {cityList.map((city) => (
                                <option value={city} key={city}>
                                    {city}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label htmlFor="pickup-date" className="text-sm font-medium text-gray-700">
                            Pickup date
                        </label>
                        <input
                            id="pickup-date"
                            type="date"
                            min={today}
                            value={pickupDate}
                            onChange={(event) => setPickupDate(event.target.value)}
                            className="rounded-xl border border-borderColor px-4 py-3 text-sm text-gray-600 outline-none"
                            required
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label htmlFor="return-date" className="text-sm font-medium text-gray-700">
                            Return date
                        </label>
                        <input
                            id="return-date"
                            type="date"
                            min={pickupDate || today}
                            value={returnDate}
                            onChange={(event) => setReturnDate(event.target.value)}
                            className="rounded-xl border border-borderColor px-4 py-3 text-sm text-gray-600 outline-none"
                            required
                        />
                    </div>
                </div>

                <Motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center justify-center gap-2 rounded-full bg-primary px-9 py-3 text-white transition-all hover:bg-primary-dull"
                >
                    <img src={assets.search_icon} alt="Search" className="brightness-300" />
                    Search cars
                </Motion.button>
            </Motion.form>

            <Motion.img
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                src={assets.main_car}
                alt="Featured rental car"
                className="max-h-80"
            />
        </Motion.div>
    );
};

export default Hero;
