import { useEffect, useMemo, useState } from "react";
import { motion as Motion } from "motion/react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import Title from "../components/Title";
import CarCard from "../components/CarCard";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";
import { assets, cityList } from "../assets/assets";
import { useAppContext } from "../hooks/useAppContext";
import { getErrorMessage } from "../utils/formatters";

const Cars = () => {
    const { cars, axios, carsLoading } = useAppContext();
    const [searchParams] = useSearchParams();

    const pickupLocation = searchParams.get("PickupLocation");
    const pickupDate = searchParams.get("pickupDate");
    const returnDate = searchParams.get("returnDate");
    const searchQuery = searchParams.get("search") || "";

    const [input, setInput] = useState(searchQuery);
    const [selectedLocation, setSelectedLocation] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [selectedTransmission, setSelectedTransmission] = useState("");
    const [sortBy, setSortBy] = useState("newest");
    const [availableCars, setAvailableCars] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);

    const isDateSearch = Boolean(pickupLocation && pickupDate && returnDate);

    useEffect(() => {
        setInput(searchQuery);
    }, [searchQuery]);

    useEffect(() => {
        if (!isDateSearch) {
            setAvailableCars([]);
            return;
        }

        const searchCarAvailability = async () => {
            setSearchLoading(true);

            try {
                const { data } = await axios.post("/api/bookings/check-availability", {
                    location: pickupLocation,
                    pickupDate,
                    returnDate,
                });

                if (data.success) {
                    setAvailableCars(data.availableCars);
                    if (data.availableCars.length === 0) {
                        toast("No cars are available for the selected dates.");
                    }
                } else {
                    toast.error(data.message);
                }
            } catch (error) {
                toast.error(getErrorMessage(error));
            } finally {
                setSearchLoading(false);
            }
        };

        void searchCarAvailability();
    }, [axios, isDateSearch, pickupDate, pickupLocation, returnDate]);

    const sourceCars = isDateSearch ? availableCars : cars;

    const categoryOptions = useMemo(
        () => [...new Set(sourceCars.map((car) => car.category).filter(Boolean))],
        [sourceCars]
    );

    const transmissionOptions = useMemo(
        () => [...new Set(sourceCars.map((car) => car.transmission).filter(Boolean))],
        [sourceCars]
    );

    const filteredCars = useMemo(() => {
        const normalizedSearch = input.trim().toLowerCase();

        const filtered = sourceCars.filter((car) => {
            const matchesSearch =
                normalizedSearch === "" ||
                [car.brand, car.model, car.category, car.transmission, car.location]
                    .join(" ")
                    .toLowerCase()
                    .includes(normalizedSearch);

            const matchesLocation = !selectedLocation || car.location === selectedLocation;
            const matchesCategory = !selectedCategory || car.category === selectedCategory;
            const matchesTransmission = !selectedTransmission || car.transmission === selectedTransmission;

            return matchesSearch && matchesLocation && matchesCategory && matchesTransmission;
        });

        const sortedCars = [...filtered];

        if (sortBy === "price-low") {
            sortedCars.sort((first, second) => first.pricePerDay - second.pricePerDay);
        } else if (sortBy === "price-high") {
            sortedCars.sort((first, second) => second.pricePerDay - first.pricePerDay);
        } else {
            sortedCars.sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt));
        }

        return sortedCars;
    }, [input, selectedCategory, selectedLocation, selectedTransmission, sortBy, sourceCars]);

    const showLoading = carsLoading || searchLoading;

    return (
        <div>
            <Motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="bg-light px-4 py-20"
            >
                <div className="mx-auto max-w-6xl">
                    <Title
                        title="Available Cars"
                        subTitle="Browse verified cars, refine the list with filters, and find the best fit for your trip."
                    />

                    {isDateSearch ? (
                        <p className="mt-4 text-center text-sm text-gray-500">
                            Showing cars in {pickupLocation} from {pickupDate} to {returnDate}
                        </p>
                    ) : null}

                    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                        <div className="flex items-center rounded-full bg-white px-4 shadow">
                            <img src={assets.search_icon} alt="" className="mr-2 h-4.5 w-4.5" />
                            <input
                                onChange={(event) => setInput(event.target.value)}
                                value={input}
                                type="text"
                                placeholder="Search make, model, category"
                                className="h-12 w-full text-gray-500 outline-none"
                            />
                        </div>

                        <select
                            value={selectedLocation}
                            onChange={(event) => setSelectedLocation(event.target.value)}
                            className="h-12 rounded-full border border-borderColor bg-white px-4 text-sm text-gray-600 outline-none"
                        >
                            <option value="">All locations</option>
                            {cityList.map((city) => (
                                <option key={city} value={city}>
                                    {city}
                                </option>
                            ))}
                        </select>

                        <select
                            value={selectedCategory}
                            onChange={(event) => setSelectedCategory(event.target.value)}
                            className="h-12 rounded-full border border-borderColor bg-white px-4 text-sm text-gray-600 outline-none"
                        >
                            <option value="">All categories</option>
                            {categoryOptions.map((category) => (
                                <option key={category} value={category}>
                                    {category}
                                </option>
                            ))}
                        </select>

                        <select
                            value={selectedTransmission}
                            onChange={(event) => setSelectedTransmission(event.target.value)}
                            className="h-12 rounded-full border border-borderColor bg-white px-4 text-sm text-gray-600 outline-none"
                        >
                            <option value="">All transmissions</option>
                            {transmissionOptions.map((transmission) => (
                                <option key={transmission} value={transmission}>
                                    {transmission}
                                </option>
                            ))}
                        </select>

                        <select
                            value={sortBy}
                            onChange={(event) => setSortBy(event.target.value)}
                            className="h-12 rounded-full border border-borderColor bg-white px-4 text-sm text-gray-600 outline-none"
                        >
                            <option value="newest">Newest first</option>
                            <option value="price-low">Price: low to high</option>
                            <option value="price-high">Price: high to low</option>
                        </select>
                    </div>
                </div>
            </Motion.div>

            <div className="mt-10 px-6 md:px-16 lg:px-24 xl:px-32">
                {showLoading ? (
                    <Loader />
                ) : filteredCars.length === 0 ? (
                    <EmptyState
                        title="No cars matched your filters"
                        description="Try changing the search term, location, category, transmission, or travel dates."
                    />
                ) : (
                    <>
                        <p className="mx-auto max-w-7xl text-gray-500 xl:px-20">
                            Showing {filteredCars.length} {filteredCars.length === 1 ? "car" : "cars"}
                        </p>

                        <div className="mx-auto mt-4 grid max-w-7xl grid-cols-1 gap-8 xl:px-20 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredCars.map((car, index) => (
                                <Motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: 0.08 * index }}
                                    key={car._id}
                                >
                                    <CarCard car={car} />
                                </Motion.div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Cars;
