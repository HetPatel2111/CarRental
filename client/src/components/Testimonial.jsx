import { motion as Motion } from "motion/react";
import Title from "./Title";
import { assets } from "../assets/assets";

const testimonials = [
    {
        name: "Emma Rodriguez",
        location: "Barcelona, Spain",
        image: assets.testimonial_image_1,
        testimonial: "The browsing and booking flow felt smooth, and the owner dashboard made the project stand out.",
    },
    {
        name: "John Smith",
        location: "New York, USA",
        image: assets.testimonial_image_2,
        testimonial: "This final-year project demonstrates a complete full-stack workflow with authentication, bookings, and admin actions.",
    },
    {
        name: "Ava Johnson",
        location: "Sydney, Australia",
        image: assets.testimonial_image_1,
        testimonial: "The interface is clean and easy to understand, especially the car details and booking sections.",
    },
];

const Testimonial = () => {
    return (
        <div className="px-6 py-28 md:px-16 lg:px-24 xl:px-44">
            <Title
                title="What Reviewers Might Notice"
                subTitle="This section showcases how trust-building content can be presented inside a polished car rental interface."
            />

            <div className="mt-18 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {testimonials.map((testimonial, index) => (
                    <Motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: index * 0.2, ease: "easeOut" }}
                        viewport={{ once: true, amount: 0.3 }}
                        key={testimonial.name}
                        className="rounded-xl bg-white p-6 shadow-lg transition-all duration-500 hover:-translate-y-1"
                    >
                        <div className="flex items-center gap-3">
                            <img className="h-12 w-12 rounded-full" src={testimonial.image} alt={testimonial.name} />
                            <div>
                                <p className="text-xl">{testimonial.name}</p>
                                <p className="text-gray-500">{testimonial.location}</p>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, starIndex) => (
                                <img key={starIndex} src={assets.star_icon} alt="star" />
                            ))}
                        </div>
                        <p className="mt-4 max-w-90 font-light text-gray-500">"{testimonial.testimonial}"</p>
                    </Motion.div>
                ))}
            </div>
        </div>
    );
};

export default Testimonial;
