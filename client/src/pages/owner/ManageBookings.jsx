import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import Title from "../../components/owner/Title";
import Loader from "../../components/Loader";
import EmptyState from "../../components/EmptyState";
import { useAppContext } from "../../hooks/useAppContext";
import { formatDate, getErrorMessage } from "../../utils/formatters";

const ManageBookings = () => {
    const { currency, axios } = useAppContext();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchOwnerBookings = useCallback(async () => {
        try {
            const { data } = await axios.get("/api/bookings/owner");
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
    }, [axios]);

    const changeBookingStatus = async (bookingId, status) => {
        try {
            const { data } = await axios.post("/api/bookings/change-status", { bookingId, status });

            if (data.success) {
                toast.success(data.message);
                void fetchOwnerBookings();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    useEffect(() => {
        void fetchOwnerBookings();
    }, [fetchOwnerBookings]);

    return (
        <div className="w-full px-4 pt-10 md:px-10">
            <Title
                title="Manage Bookings"
                subTitle="Track booking requests, review customer details, and update booking status."
            />

            {loading ? (
                <Loader />
            ) : bookings.length === 0 ? (
                <div className="mt-6">
                    <EmptyState
                        title="No bookings received yet"
                        description="When customers start placing booking requests, they will appear here."
                    />
                </div>
            ) : (
                <div className="mt-6 w-full overflow-x-auto rounded-md border border-borderColor">
                    <table className="min-w-187.5 w-full border-collapse text-left text-sm text-gray-600">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-3 font-medium whitespace-nowrap">Car</th>
                                <th className="p-3 font-medium whitespace-nowrap">Customer</th>
                                <th className="p-3 font-medium whitespace-nowrap">Date range</th>
                                <th className="p-3 font-medium whitespace-nowrap">Total</th>
                                <th className="p-3 font-medium whitespace-nowrap">Status</th>
                            </tr>
                        </thead>

                        <tbody>
                            {bookings.map((booking) => (
                                <tr key={booking._id} className="border-t border-borderColor text-gray-500 transition hover:bg-gray-50">
                                    <td className="p-3">
                                        <div className="flex min-w-50 items-center gap-3">
                                            <img
                                                src={booking.car?.image}
                                                alt={`${booking.car?.brand} ${booking.car?.model}`}
                                                className="h-12 w-12 rounded-md object-cover"
                                            />
                                            <p className="font-medium">
                                                {booking.car?.brand} {booking.car?.model}
                                            </p>
                                        </div>
                                    </td>

                                    <td className="p-3 whitespace-nowrap">
                                        <p className="font-medium text-gray-700">{booking.user?.name}</p>
                                        <p className="text-xs">{booking.user?.email}</p>
                                    </td>

                                    <td className="p-3 whitespace-nowrap">
                                        {formatDate(booking.pickupDate)} to {formatDate(booking.returnDate)}
                                    </td>

                                    <td className="p-3 whitespace-nowrap">
                                        {currency}
                                        {booking.price}
                                    </td>

                                    <td className="p-3 whitespace-nowrap">
                                        {booking.status === "pending" ? (
                                            <select
                                                onChange={(event) => changeBookingStatus(booking._id, event.target.value)}
                                                value={booking.status}
                                                className="rounded-md border border-borderColor px-2 py-1.5 text-gray-500 outline-none"
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="cancelled">Cancelled</option>
                                                <option value="confirmed">Confirmed</option>
                                            </select>
                                        ) : (
                                            <span
                                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                                    booking.status === "confirmed"
                                                        ? "bg-green-100 text-green-500"
                                                        : "bg-red-100 text-red-500"
                                                }`}
                                            >
                                                {booking.status}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ManageBookings;
