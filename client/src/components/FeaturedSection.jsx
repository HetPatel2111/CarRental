import { motion as Motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import Title from "./Title";
import { assets } from "../assets/assets";
import CarCard from "./CarCard";
import { useAppContext } from "../hooks/useAppContext";
import Loader from "./Loader";

const FeaturedSection = () => {
    const navigate = useNavigate();
    const { cars, carsLoading } = useAppContext();

    return (
        <Motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center px-6 py-24 md:px-16 lg:px-24 xl:px-32"
        >
            <Motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                <Title
                    title="Featured vehicles"
                    subTitle="Explore a curated selection of premium cars available for your next trip."
                />
            </Motion.div>

            {carsLoading ? (
                <Loader />
            ) : (
                <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {cars.slice(0, 6).map((car) => (
                        <CarCard key={car._id} car={car} />
                    ))}
                </div>
            )}

            <Motion.button
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                onClick={() => {
                    navigate("/cars");
                    scrollTo(0, 0);
                }}
                className="mt-16 flex items-center justify-center gap-2 rounded-md border border-borderColor px-6 py-2 hover:bg-gray-50"
            >
                Explore all cars <img src={assets.arrow_icon} alt="arrow" />
            </Motion.button>
        </Motion.div>
    );
};

export default FeaturedSection;
