const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

async function testMongo() {
    try {
        console.log('Testing MongoDB connection (SRV)...');
        await mongoose.connect(MONGO_URI, {
            // Some common fixes for SRV/DNS issues
            connectTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            serverSelectionTimeoutMS: 10000,
            // family: 4 // Force IPv4 if needed
        });
        console.log('✅ MongoDB connected successfully!');
        process.exit(0);
    } catch (e) {
        console.error('❌ MongoDB connection failed:', e.message);
        
        // If it's a DNS issue, we might try a fallback if we had a non-SRV string.
        // For now, I'll just report it.
        process.exit(1);
    }
}

testMongo();
