import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";
import { useAppContext } from "../hooks/useAppContext";
import { getErrorMessage } from "../utils/formatters";

const PaymentCancel = () => {
    const { axios } = useAppContext();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const bookingId = searchParams.get("bookingId");

        if (!bookingId) {
            setLoading(false);
            return;
        }

        const cancelPayment = async () => {
            try {
                const { data } = await axios.post("/api/bookings/cancel-payment", { bookingId });
                if (data.success) {
                    toast(data.message);
                }
            } catch (error) {
                toast.error(getErrorMessage(error));
            } finally {
                setLoading(false);
            }
        };

        void cancelPayment();
    }, [axios, searchParams]);

    if (loading) {
        return <Loader />;
    }

    return (
        <div className="px-6 py-24 md:px-16 lg:px-24 xl:px-32">
            <EmptyState
                title="Payment cancelled"
                description="Your payment was cancelled and the pending booking was closed. You can return to the listing and try again anytime."
                action={
                    <Link to="/cars" className="rounded-lg bg-primary px-5 py-2 text-white">
                        Browse cars again
                    </Link>
                }
            />
        </div>
    );
};

export default PaymentCancel;
