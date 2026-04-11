import mongoose from "mongoose";
import dns from "dns";

const connectDB = async () => {
    try {
        mongoose.connection.on("connected", () => {
            console.log("Database connected successfully.");
        });

        mongoose.connection.on("error", (error) => {
            console.error("MongoDB connection error:", error);
        });

        let mongodbURI = process.env.MONGODB_URI?.trim();
        const databaseName = "Car-Rental";

        if (!mongodbURI) {
            throw new Error("MONGODB_URI environment variable is not set.");
        }

        if (mongodbURI.endsWith("/")) {
            mongodbURI = mongodbURI.slice(0, -1);
        }

        if (mongodbURI.startsWith("mongodb+srv://")) {
            dns.setServers(["8.8.8.8", "8.8.4.4"]);
        }

        const finalURI = mongodbURI.includes("?")
            ? `${mongodbURI.split("?")[0].replace(/\/+$/, "")}/${databaseName}?${mongodbURI.split("?")[1]}`
            : `${mongodbURI}/${databaseName}?retryWrites=true&w=majority`;

        await mongoose.connect(finalURI, {
            serverSelectionTimeoutMS: 15000,
            socketTimeoutMS: 45000,
        });
    } catch (error) {
        console.error("Error connecting to MongoDB:", error.message);
        process.exit(1);
    }
};

export default connectDB;
