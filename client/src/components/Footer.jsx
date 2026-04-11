import { Link } from "react-router-dom";
import { motion as Motion } from "motion/react";
import { assets } from "../assets/assets";

const Footer = () => {
    return (
        <Motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mt-40 px-6 text-sm text-gray-500 md:px-16 lg:px-24 xl:px-32"
        >
            <Motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex flex-wrap items-start justify-between gap-8 border-b border-borderColor pb-6"
            >
                <div>
                    <img src={assets.logo} alt="CarRental logo" className="h-8 md:h-9" />
                    <p className="mt-3 max-w-80">
                        CarRental is a full-stack final-year project focused on car discovery, booking workflows, and owner-side vehicle management.
                    </p>
                </div>

                <div className="flex flex-wrap justify-between gap-8 md:w-1/2">
                    <div>
                        <h2 className="text-base font-medium uppercase text-gray-800">Quick links</h2>
                        <ul className="mt-3 flex flex-col gap-1.5">
                            <li>
                                <Link to="/">Home</Link>
                            </li>
                            <li>
                                <Link to="/cars">Browse cars</Link>
                            </li>
                            <li>
                                <Link to="/my-bookings">My bookings</Link>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-base font-medium uppercase text-gray-800">Project stack</h2>
                        <ul className="mt-3 flex flex-col gap-1.5">
                            <li>React + Vite</li>
                            <li>Node.js + Express</li>
                            <li>MongoDB + Mongoose</li>
                            <li>JWT Authentication</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-base font-medium uppercase text-gray-800">Contact</h2>
                        <ul className="mt-3 flex flex-col gap-1.5">
                            <li>Final Year Project Showcase</li>
                            <li>Owner dashboard included</li>
                            <li>Image upload supported</li>
                            <li>Booking analytics included</li>
                        </ul>
                    </div>
                </div>
            </Motion.div>

            <div className="flex flex-col items-center justify-between gap-2 py-5 md:flex-row">
                <p>© {new Date().getFullYear()} CarRental. Academic project demo.</p>
                <div className="flex items-center gap-3">
                    <img src={assets.facebook_logo} className="h-5 w-5" alt="facebook" />
                    <img src={assets.instagram_logo} className="h-5 w-5" alt="instagram" />
                    <img src={assets.twitter_logo} className="h-5 w-5" alt="twitter" />
                    <img src={assets.gmail_logo} className="h-5 w-5" alt="gmail" />
                </div>
            </div>
        </Motion.div>
    );
};

export default Footer;
