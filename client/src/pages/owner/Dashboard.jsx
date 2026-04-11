import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { assets } from "../../assets/assets";
import Title from "../../components/owner/Title";
import Loader from "../../components/Loader";
import EmptyState from "../../components/EmptyState";
import { useAppContext } from "../../hooks/useAppContext";
import { formatDate, getErrorMessage } from "../../utils/formatters";

const Dashboard = () => {
    const { axios, isOwner, currency } = useAppContext();
    const [data, setData] = useState({
        totalCars: 0,
        totalBookings: 0,
        pendingBookings: 0,
        completeBookings: 0,
        recentBookings: [],
        monthlyRevenue: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOwner) {
            setLoading(false);
            return;
        }

        const fetchDashboardData = async () => {
            try {
                const { data } = await axios.get("/api/owner/dashboard");

                if (data.success) {
                    setData(data.dashboardData);
                } else {
                    toast.error(data.message);
                }
            } catch (error) {
                toast.error(getErrorMessage(error));
            } finally {
                setLoading(false);
            }
        };

        void fetchDashboardData();
    }, [axios, isOwner]);

    const dashboardCards = [
        { title: "Total cars", value: data.totalCars, icon: assets.carIconColored },
        { title: "Total bookings", value: data.totalBookings, icon: assets.listIconColored },
        { title: "Pending", value: data.pendingBookings, icon: assets.cautionIconColored },
        { title: "Confirmed", value: data.completeBookings, icon: assets.listIconColored },
    ];

    if (loading) {
        return <Loader />;
    }

    return (
        <div className="flex-1 px-4 pt-10 md:mx-10">
            <Title
                title="Owner Dashboard"
                subTitle="Monitor listed cars, booking requests, confirmations, and current-month revenue."
            />

            <div className="my-8 grid max-w-4xl gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {dashboardCards.map((card) => (
                    <div
                        key={card.title}
                        className="flex items-center justify-between rounded-md border border-borderColor p-4"
                    >
                        <div>
                            <h1 className="text-xs text-gray-500">{card.title}</h1>
                            <p className="text-lg font-semibold">{card.value}</p>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <img src={card.icon} alt="" className="h-4 w-4" />
                        </div>
                    </div>
                ))}
            </div>

            <div className="mb-8 flex flex-wrap items-start gap-6">
                <div className="w-full max-w-lg rounded-md border border-borderColor p-4 md:p-6">
                    <h1 className="text-lg font-medium">Recent bookings</h1>
                    <p className="text-gray-500">Latest customer booking activity</p>

                    {data.recentBookings.length === 0 ? (
                        <div className="mt-4">
                            <EmptyState
                                title="No recent bookings"
                                description="Once customers create bookings, the latest ones will appear here."
                            />
                        </div>
                    ) : (
                        data.recentBookings.map((booking) => (
                            <div key={booking._id} className="mt-4 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="hidden h-12 w-12 items-center justify-center rounded-full bg-primary/10 md:flex">
                                        <img src={assets.listIconColored} alt="" className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p>
                                            {booking.car?.brand} {booking.car?.model}
                                        </p>
                                        <p className="text-sm text-gray-500">{formatDate(booking.createdAt)}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 font-medium">
                                    <p className="text-sm text-gray-500">
                                        {currency}
                                        {booking.price}
                                    </p>
                                    <p className="rounded-full border border-borderColor px-3 py-0.5 text-sm">
                                        {booking.status}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="mb-6 w-full rounded-md border border-borderColor p-4 md:max-w-xs md:p-6">
                    <h1 className="text-lg font-medium">Monthly revenue</h1>
                    <p className="text-gray-500">Revenue from confirmed bookings this month</p>
                    <p className="mt-6 text-3xl font-semibold text-primary">
                        {currency}
                        {data.monthlyRevenue}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
