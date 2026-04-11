import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";
import { useAppContext } from "../hooks/useAppContext";
import { getErrorMessage } from "../utils/formatters";

const PaymentSuccess = () => {
    const { axios } = useAppContext();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [booking, setBooking] = useState(null);

    useEffect(() => {
        const sessionId = searchParams.get("session_id");

        if (!sessionId) {
            setLoading(false);
            return;
        }

        const verifyPayment = async () => {
            try {
                const { data } = await axios.get(`/api/bookings/verify-payment?session_id=${sessionId}`);
                if (data.success) {
                    setBooking(data.booking);
                    toast.success(data.message);
                } else {
                    toast.error(data.message);
                }
            } catch (error) {
                toast.error(getErrorMessage(error));
            } finally {
                setLoading(false);
            }
        };

        void verifyPayment();
    }, [axios, searchParams]);

    if (loading) {
        return <Loader />;
    }

    if (!booking) {
        return (
            <div className="px-6 py-24 md:px-16 lg:px-24 xl:px-32">
                <EmptyState
                    title="Payment could not be verified"
                    description="Please check your bookings page or try again."
                    action={
                        <Link to="/my-bookings" className="rounded-lg bg-primary px-5 py-2 text-white">
                            Go to my bookings
                        </Link>
                    }
                />
            </div>
        );
    }

    return (
        <div className="px-6 py-24 md:px-16 lg:px-24 xl:px-32">
            <EmptyState
                title="Payment successful"
                description={`Your booking for ${booking.car?.brand || "the selected car"} has been confirmed and marked as paid.`}
                action={
                    <Link to="/my-bookings" className="rounded-lg bg-primary px-5 py-2 text-white">
                        View my bookings
                    </Link>
                }
            />
        </div>
    );
};

export default PaymentSuccess;
