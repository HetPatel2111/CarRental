import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { motion as Motion } from "motion/react";
import { assets } from "../assets/assets";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";
import { useAppContext } from "../hooks/useAppContext";
import { getErrorMessage } from "../utils/formatters";

const CarDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { cars, axios, token, setShowLogin, carsLoading, currency } = useAppContext();

    const [pickupDate, setPickupDate] = useState("");
    const [returnDate, setReturnDate] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const today = new Date().toISOString().split("T")[0];

    const car = useMemo(() => cars.find((item) => item._id === id) || null, [cars, id]);

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!token) {
            toast.error("Please log in before booking a car.");
            setShowLogin(true);
            return;
        }

        if (returnDate < pickupDate) {
            toast.error("Return date must be after the pickup date.");
            return;
        }

        setIsSubmitting(true);

        try {
            const { data } = await axios.post("/api/bookings/checkout-session", {
                car: id,
                pickupDate,
                returnDate,
            });

            if (data.success) {
                window.location.href = data.url;
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (carsLoading) {
        return <Loader />;
    }

    if (!car) {
        return (
            <div className="px-6 py-24 md:px-16 lg:px-24 xl:px-32">
                <EmptyState
                    title="Car not found"
                    description="The selected car may have been removed or is no longer available."
                />
            </div>
        );
    }

    return (
        <div className="mt-16 px-6 md:px-16 lg:px-24 xl:px-32">
            <button onClick={() => navigate(-1)} className="mb-6 flex cursor-pointer items-center gap-2 text-gray-500">
                <img src={assets.arrow_icon} alt="" className="rotate-180 opacity-65" />
                Back to all cars
            </button>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-12">
                <Motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="lg:col-span-2"
                >
                    <img
                        src={car.image}
                        alt={`${car.brand} ${car.model}`}
                        className="mb-6 w-full rounded-xl object-cover shadow-md md:max-h-100"
                    />

                    <div className="space-y-6">
                        <div>
                            <h1 className="text-3xl font-bold">
                                {car.brand} {car.model}
                            </h1>
                            <p className="text-lg text-gray-500">
                                {car.category} • {car.year}
                            </p>
                        </div>

                        <hr className="my-6 border-borderColor" />

                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                            {[
                                { icon: assets.users_icon, text: `${car.seating_capacity} seats` },
                                { icon: assets.fuel_icon, text: car.fuel_type },
                                { icon: assets.car_icon, text: car.transmission },
                                { icon: assets.location_icon, text: car.location },
                            ].map(({ icon, text }) => (
                                <div key={text} className="flex flex-col items-center rounded-lg bg-light p-4">
                                    <img src={icon} alt="" className="mb-2 h-5" />
                                    {text}
                                </div>
                            ))}
                        </div>

                        <div>
                            <h2 className="mb-3 text-xl font-medium">Description</h2>
                            <p className="text-gray-500">{car.description}</p>
                        </div>

                        <div>
                            <h2 className="mb-3 text-xl font-medium">Included features</h2>
                            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {["360 camera", "Bluetooth", "GPS", "Heated seats", "Rear camera"].map((item) => (
                                    <li key={item} className="flex items-center text-gray-500">
                                        <img src={assets.check_icon} alt="" className="mr-2 h-4" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </Motion.div>

                <Motion.form
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    onSubmit={handleSubmit}
                    className="sticky top-18 h-max space-y-6 rounded-xl p-6 text-gray-600 shadow-lg"
                >
                    <p className="flex items-center justify-between text-2xl font-semibold text-gray-800">
                        {currency}
                        {car.pricePerDay}
                        <span className="text-base font-normal text-gray-400">per day</span>
                    </p>

                    <hr className="my-6 border-borderColor" />

                    <div className="flex flex-col gap-2">
                        <label htmlFor="pickup-date">Pickup date</label>
                        <input
                            type="date"
                            min={today}
                            value={pickupDate}
                            onChange={(event) => setPickupDate(event.target.value)}
                            className="rounded-lg border border-borderColor px-3 py-2"
                            required
                            id="pickup-date"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label htmlFor="return-date">Return date</label>
                        <input
                            type="date"
                            required
                            id="return-date"
                            min={pickupDate || today}
                            value={returnDate}
                            onChange={(event) => setReturnDate(event.target.value)}
                            className="rounded-lg border border-borderColor px-3 py-2"
                        />
                    </div>

                    <button
                        disabled={isSubmitting}
                        className="w-full rounded-xl bg-primary py-3 font-medium text-white transition-all hover:bg-primary-dull disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {isSubmitting ? "Redirecting to payment..." : "Proceed to payment"}
                    </button>

                    <p className="text-center text-sm">Secure Stripe checkout with card payment and booking confirmation.</p>
                </Motion.form>
            </div>
        </div>
    );
};

export default CarDetails;
