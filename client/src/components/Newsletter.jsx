import { motion as Motion } from "motion/react";

const Newsletter = () => {
    return (
        <Motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            viewport={{ once: true, amount: 0.3 }}
            className="my-10 mb-40 flex flex-col items-center justify-center space-y-2 px-4 text-center"
        >
            <Motion.h1
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.5 }}
                className="text-2xl font-semibold md:text-4xl"
            >
                Stay updated with new listings
            </Motion.h1>

            <Motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.5 }}
                className="pb-8 text-gray-500/70 md:text-lg"
            >
                This demo section shows how a newsletter CTA could be placed in a real product landing page.
            </Motion.p>

            <Motion.form
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 }}
                className="flex h-12 w-full max-w-2xl items-center justify-between md:h-13"
            >
                <input
                    className="h-full w-full rounded-l-md rounded-r-none border border-r-0 border-gray-300 px-3 text-gray-500 outline-none"
                    type="email"
                    placeholder="Enter your email"
                    required
                />
                <button
                    type="submit"
                    className="h-full rounded-l-none rounded-r-md bg-primary px-8 text-white transition-all hover:bg-primary-dull md:px-12"
                >
                    Subscribe
                </button>
            </Motion.form>
        </Motion.div>
    );
};

export default Newsletter;
