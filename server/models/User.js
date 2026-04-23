const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    dob: { type: Date, required: true },
    password: { type: String, required: true },
    resetOTP: { type: String }, // Hashed numeric OTP for password recovery
    resetOTPExpires: { type: Date }, // Expiration for OTP (e.g. 10-15 minutes)
    isGoogleUser: { type: Boolean, default: false }
}, { 
    timestamps: true,
    bufferCommands: false // Fail fast if DB is down
});

module.exports = mongoose.model('User', userSchema);
