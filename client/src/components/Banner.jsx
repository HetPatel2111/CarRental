import { Link } from "react-router-dom";
import { motion as Motion } from "motion/react";
import { assets } from "../assets/assets";

const Banner = () => {
    return (
        <Motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-3 flex max-w-6xl flex-col items-center justify-between overflow-hidden rounded-2xl bg-linear-to-r from-[#0558FE] to-[#A9CFFF] px-8 pt-10 md:mx-auto md:flex-row md:items-start md:pl-14"
        >
            <div className="text-white">
                <h2 className="text-3xl font-medium">Have a car to rent out?</h2>
                <p className="mt-2">Turn your vehicle into a reliable source of extra income.</p>
                <p className="max-w-130">
                    Create an owner account, add your vehicle details, and manage bookings from a dedicated dashboard.
                </p>

                <Link
                    to="/owner"
                    className="mt-4 inline-flex rounded-lg bg-white px-6 py-2 text-sm text-primary transition-all hover:bg-slate-100"
                >
                    Explore owner dashboard
                </Link>
            </div>

            <Motion.img
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                src={assets.banner_car_image}
                alt="Owner dashboard car banner"
                className="mt-10 max-h-45"
            />
        </Motion.div>
    );
};

export default Banner;
