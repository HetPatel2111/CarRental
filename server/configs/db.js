// import mongoose from 'mongoose'
// import dns from "dns";

// const connectDB = async()=>{
//     try{
//         mongoose.connection.on('connected' , ()=> console.log("database connected"))
//         await mongoose.connect(`${process.env.MONGODB_URI}/car-rental`)
//     }
//     catch(error){
//         console.log(error.message);
//     }
// }

// export default connectDB;

import mongoose from "mongoose";
import dns from "dns";

const connectDB = async ()=>{
    try {
        mongoose.connection.on("connected", ()=>{console.log("Database connected successfully.")})
        mongoose.connection.on("error", (err)=>{console.error("MongoDB connection error:", err)})

        let mongodbURI=process.env.MONGODB_URI
        const projectName='Car-Rental';
        if(!mongodbURI){
            throw new Error("MONGODB_URI environment variable not set");
        }

        mongodbURI = mongodbURI.trim();
        
        // Remove trailing slash
        if(mongodbURI.endsWith('/')){
            mongodbURI = mongodbURI.slice(0, -1);
        }

        // If using SRV format and DNS is failing, try alternative DNS resolution
        if(mongodbURI.startsWith('mongodb+srv://')){
            // Set DNS lookup to use system DNS
            dns.setServers(['8.8.8.8', '8.8.4.4']); // Google DNS as fallback
        }

        // Build final URI with database name
        let finalURI;
        if(mongodbURI.includes('?')){
            const [base, params] = mongodbURI.split('?');
            finalURI = `${base.replace(/\/+$/, '')}/${projectName}?${params}`;
        } else {
            finalURI = `${mongodbURI}/${projectName}?retryWrites=true&w=majority`;
        }

        const connectionOptions = {
            serverSelectionTimeoutMS: 15000,
            socketTimeoutMS: 45000,
        };

        console.log("Connecting to MongoDB...");
        await mongoose.connect(finalURI, connectionOptions)
    } catch (error) {
        console.error("Error connecting to MongoDB:", error.message);
        
        if(error.code === 'ECONNREFUSED' || error.message.includes('querySrv')){
            console.error("\n⚠️  DNS Resolution Issue Detected!");
            console.error("\nSOLUTION: Use Standard Connection String instead of SRV:");
            console.error("1. Go to MongoDB Atlas → Connect → Connect your application");
            console.error("2. Select 'Standard connection string' (NOT 'SRV connection string')");
            console.error("3. Copy the connection string");
            console.error("4. Replace MONGODB_URI in .env file with the standard connection string");
            console.error("5. Format should be: mongodb://username:password@host1:port,host2:port/database?options");
            console.error("\nThe standard connection string bypasses DNS SRV lookups.\n");
        }
        
        process.exit(1);
    }
}

export default connectDB;