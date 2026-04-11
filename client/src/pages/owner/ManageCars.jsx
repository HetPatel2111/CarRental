import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { assets } from "../../assets/assets";
import Title from "../../components/owner/Title";
import Loader from "../../components/Loader";
import EmptyState from "../../components/EmptyState";
import { useAppContext } from "../../hooks/useAppContext";
import { getErrorMessage } from "../../utils/formatters";

const ManageCars = () => {
    const { isOwner, axios, currency } = useAppContext();
    const [cars, setCars] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchOwnerCars = useCallback(async () => {
        try {
            const { data } = await axios.get("/api/owner/cars");
            if (data.success) {
                setCars(data.cars);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    }, [axios]);

    const toggleAvailability = async (carId) => {
        try {
            const { data } = await axios.post("/api/owner/toggle-car", { carId });
            if (data.success) {
                toast.success(data.message);
                void fetchOwnerCars();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    const deleteCar = async (carId) => {
        const confirmDelete = window.confirm("Are you sure you want to remove this car?");

        if (!confirmDelete) {
            return;
        }

        try {
            const { data } = await axios.post("/api/owner/delete-car", { carId });
            if (data.success) {
                toast.success(data.message);
                void fetchOwnerCars();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    useEffect(() => {
        if (!isOwner) {
            setLoading(false);
            return;
        }

        void fetchOwnerCars();
    }, [fetchOwnerCars, isOwner]);

    return (
        <div className="w-full px-4 pt-10 md:px-10">
            <Title
                title="Manage Cars"
                subTitle="Review listed cars, update availability, and remove inactive vehicles."
            />

            {loading ? (
                <Loader />
            ) : cars.length === 0 ? (
                <div className="mt-6">
                    <EmptyState
                        title="No cars listed yet"
                        description="Add your first car from the owner panel to start receiving booking requests."
                    />
                </div>
            ) : (
                <div className="mt-6 w-full overflow-x-auto rounded-md border border-borderColor">
                    <table className="w-full border-collapse text-left text-sm text-gray-600">
                        <thead>
                            <tr>
                                <th className="p-3 font-medium">Car</th>
                                <th className="p-3 font-medium">Category</th>
                                <th className="p-3 font-medium">Price</th>
                                <th className="p-3 font-medium">Status</th>
                                <th className="p-3 font-medium">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cars.map((car) => (
                                <tr key={car._id} className="border-t border-borderColor">
                                    <td className="flex items-center gap-3 p-3">
                                        <img
                                            src={car.image}
                                            alt={`${car.brand} ${car.model}`}
                                            className="h-12 w-12 rounded-md object-cover"
                                        />
                                        <div>
                                            <p className="font-medium">
                                                {car.brand} {car.model}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {car.seating_capacity} seats • {car.transmission}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="p-3">{car.category}</td>
                                    <td className="p-3">
                                        {currency} {car.pricePerDay}
                                    </td>
                                    <td className="p-3">
                                        <span
                                            className={`rounded-full px-3 py-1 text-xs ${
                                                car.isAvaliable ? "bg-green-100 text-green-500" : "bg-red-100 text-red-500"
                                            }`}
                                        >
                                            {car.isAvaliable ? "Available" : "Unavailable"}
                                        </span>
                                    </td>
                                    <td className="flex items-center gap-3 p-3">
                                        <button type="button" onClick={() => toggleAvailability(car._id)}>
                                            <img
                                                src={car.isAvaliable ? assets.eye_close_icon : assets.eye_icon}
                                                alt="toggle availability"
                                                className="cursor-pointer"
                                            />
                                        </button>
                                        <button type="button" onClick={() => deleteCar(car._id)}>
                                            <img src={assets.delete_icon} alt="delete car" className="cursor-pointer" />
                                        </button>
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

export default ManageCars;
