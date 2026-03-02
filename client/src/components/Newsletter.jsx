import React from 'react'
import {motion} from 'motion/react'

const Newsletter = () => {
  return (
    <motion.div 
    initial={{opacity:0,y:30}}
    whileInView={{opacity:1,y:0}}
    transition={{duration:0.6,ease:"easeOut"}}
    viewport={{once:true,amount:0.3}}

    className="flex flex-col items-center justify-center text-center space-y-2 px-4 my-10 mb-24 md:mb-40">
    <motion.h1 
    initial={{opacity:0,y:20}}
    whileInView={{opacity:1,y:0}}
    transition={{duration:0.2,delay:0.5}}
    className="md:text-4xl text-2xl font-semibold">Never Miss a Deal!</motion.h1>

    <motion.p 
     initial={{opacity:0,y:20}}
    whileInView={{opacity:1,y:0}}
    transition={{duration:0.3,delay:0.5}}
    className="md:text-lg text-gray-500/70 pb-8">
        Subscribe to get the latest offers, new arrivals, and exclusive discounts
    </motion.p>

    <motion.form 
    initial={{opacity:0,y:20}}
    whileInView={{opacity:1,y:0}}
    transition={{duration:0.4,delay:0.5}}
    className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0 max-w-2xl w-full">
        <input
            className="border border-gray-300 rounded-md sm:h-13 h-12 sm:border-r-0 outline-none w-full sm:rounded-r-none px-3 text-gray-500"
            type="text"
            placeholder="Enter your email id"
            required
        />
        <button type="submit" className="md:px-12 px-8 sm:h-13 h-12 text-white bg-primary hover:bg-primary-dull transition-all cursor-pointer rounded-md sm:rounded-l-none">
            Subscribe
        </button>
    </motion.form>
</motion.div>
  )
}

export default Newsletter
