const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('❌ Error: MONGO_URI is missing in .env file.');
    process.exit(1);
}

async function clearUsers() {
    try {
        console.log('🔄 Connecting to MongoDB to clear all users...');
        await mongoose.connect(MONGO_URI);
        
        const User = require('./models/User');
        
        const count = await User.countDocuments();
        console.log(`📊 Found ${count} user(s) in the database.`);
        
        if (count > 0) {
            await User.deleteMany({});
            console.log('✅ All users have been permanently deleted from the database.');
        } else {
            console.log('ℹ️ No users found to delete.');
        }
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Error clearing users:', err.message);
        process.exit(1);
    }
}

clearUsers();
