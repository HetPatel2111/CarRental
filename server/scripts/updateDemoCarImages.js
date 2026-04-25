import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../configs/db.js";
import Car from "../models/Car.js";

const imageUpdates = [
    {
        brand: "Toyota",
        model: "Innova Crysta",
        image: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Toyota%20Innova%20Crysta.jpg"
    },
    {
        brand: "Honda",
        model: "City",
        year: 2023,
        category: "Sedan",
        image: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Honda%20City%201.5%20S%202023.jpg"
    }
];

const updateDemoCarImages = async () => {
    await connectDB();

    let updatedCount = 0;

    for (const update of imageUpdates) {
        const { image, ...filter } = update;
        const result = await Car.updateMany(filter, { $set: { image } });
        updatedCount += result.modifiedCount;
        console.log(`Updated ${result.modifiedCount} car image(s) for ${filter.brand} ${filter.model}.`);
    }

    console.log(`Finished updating demo car images. Total modified documents: ${updatedCount}.`);
    await mongoose.disconnect();
};

updateDemoCarImages().catch(async (error) => {
    console.error("Failed to update demo car images:", error.message);
    await mongoose.disconnect();
    process.exit(1);
});
