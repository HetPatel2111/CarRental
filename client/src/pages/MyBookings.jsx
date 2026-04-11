import { useEffect, useState } from "react";
import { motion as Motion } from "motion/react";
import toast from "react-hot-toast";
import { assets } from "../assets/assets";
import Title from "../components/Title";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";
import { useAppContext } from "../hooks/useAppContext";
import { formatDate, getErrorMessage } from "../utils/formatters";

const statusStyles = {
    confirmed: "bg-green-400/15 text-green-600",
    pending: "bg-yellow-400/15 text-yellow-700",
    cancelled: "bg-red-400/15 text-red-600",
};

const MyBookings = () => {
    const { axios, user, currency } = useAppContext();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const fetchMyBooking = async () => {
            try {
                const { data } = await axios.get("/api/bookings/user");
                if (data.success) {
                    setBookings(data.bookings);
                } else {
                    toast.error(data.message);
                }
            } catch (error) {
                toast.error(getErrorMessage(error));
            } finally {
                setLoading(false);
            }
        };

        void fetchMyBooking();
    }, [axios, user]);

    return (
        <Motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mt-16 max-w-7xl px-6 text-sm md:px-16 lg:px-24 xl:px-32 2xl:px-48"
        >
            <Title title="My Bookings" subTitle="Review your booking history and current rental requests." align="left" />

            {loading ? (
                <Loader />
            ) : bookings.length === 0 ? (
                <EmptyState
                    title="No bookings yet"
                    description="Once you reserve a car, your bookings will appear here with dates, price, and current status."
                />
            ) : (
                <div>
                    {bookings.map((booking, index) => (
                        <Motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.08 * index }}
                            key={booking._id}
                            className="mt-5 grid grid-cols-1 gap-6 rounded-lg border border-borderColor p-6 first:mt-12 md:grid-cols-4"
                        >
                            <div className="md:col-span-1">
                                <div className="mb-3 overflow-hidden rounded-md">
                                    <img
                                        src={booking.car?.image}
                                        alt={`${booking.car?.brand} ${booking.car?.model}`}
                                        className="aspect-video w-full object-cover"
                                    />
                                </div>

                                <p className="mt-2 text-lg font-medium">
                                    {booking.car?.brand} {booking.car?.model}
                                </p>

                                <p className="text-gray-500">
                                    {booking.car?.year} • {booking.car?.category} • {booking.car?.location}
                                </p>
                            </div>

                            <div className="md:col-span-2">
                                <div className="flex items-center gap-2">
                                    <p className="rounded bg-light px-3 py-1.5">Booking #{index + 1}</p>
                                    <p className={`rounded-full px-3 py-1 text-xs ${statusStyles[booking.status]}`}>
                                        {booking.status}
                                    </p>
                                </div>

                                <div className="mt-3 flex items-start gap-2">
                                    <img src={assets.calendar_icon_colored} alt="" className="mt-1 h-4 w-4" />
                                    <div>
                                        <p className="text-gray-500">Rental period</p>
                                        <p>
                                            {formatDate(booking.pickupDate)} to {formatDate(booking.returnDate)}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-3 flex items-start gap-2">
                                    <img src={assets.location_icon_colored} alt="" className="mt-1 h-4 w-4" />
                                    <div>
                                        <p className="text-gray-500">Pickup location</p>
                                        <p>{booking.car?.location}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col justify-between gap-6 md:col-span-1">
                                <div className="text-right text-sm text-gray-500">
                                    <p>Total price</p>
                                    <h1 className="text-2xl font-semibold text-primary">
                                        {currency}
                                        {booking.price}
                                    </h1>
                                    <p>Booked on {formatDate(booking.createdAt)}</p>
                                </div>
                            </div>
                        </Motion.div>
                    ))}
                </div>
            )}
        </Motion.div>
    );
};

export default MyBookings;
