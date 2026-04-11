const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const User = require('../models/User');

// Setup the Transporter with high-speed optimization
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // Use SSL for Port 465
    pool: true,   // Keeps connections open for instant sending
    family: 4,    // FORCE IPv4 to avoid ENETUNREACH IPv6 timeout (Render bug)
    maxConnections: 5,
    maxMessages: 100,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    },
    connectionTimeout: 10000, // 10 seconds (don't wait minutes)
    greetingTimeout: 10000
});

// Verify connection configuration on startup (Logs to Render console)
transporter.verify(function (error, success) {
    if (error) {
        console.error('❌ SMTP Connection Error:', error.message);
    } else {
        console.log('✅ SMTP Server set up successfully');
    }
});

// Register
router.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, phone, email, dob, password } = req.body;

        // Check if user exists
        // Case-insensitive check to see if email already exists
        const existingUser = await User.findOne({ email: { $regex: new RegExp('^' + email + '$', 'i') } });
        if (existingUser) {
            console.log(`[SIGNUP BLOCKED] Email already exists (Case-Insensitive): ${email}`);
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const newUser = new User({ 
            firstName, 
            lastName, 
            phone, 
            email, 
            dob, 
            password: hashedPassword 
        });
        await newUser.save();

        res.status(201).json({ message: 'User registered successfully', user: { firstName, email } });
    } catch (err) {
        if (err.name === 'MongooseServerSelectionError' || err.message.includes('buffering')) {
            return res.status(503).json({ message: 'Registration database is temporarily unreachable. Please try again soon.' });
        }
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Use a case-insensitive regex for email lookup to account for different capitalization
        const user = await User.findOne({ email: { $regex: new RegExp('^' + email + '$', 'i') } });
        if (!user) {
            console.log(`[LOGIN ATTEMPT] Email not found: ${email}`);
            return res.status(404).json({ message: 'Email does not exist. Please sign up first.' });
        }

        // Check password - ATTEMPT 1: Standard Bcrypt Comparison (Normal Flow)
        let isMatch = await bcrypt.compare(password, user.password);
        let passwordMigrated = false;

        // ATTEMPT 2: Plain-Text Fallback (Migration Flow for legacy/manual accounts)
        // Includes .trim() check to handle accidental hidden spaces
        if (!isMatch) {
            const inputPass = password.trim();
            const dbPass = user.password.trim();
            
            if (inputPass === dbPass) {
                console.log(`[SECURITY UPGRADE] User ${email} logged in with plain-text password. Migrating to Hash...`);
                
                // Automatically HASH and UPDATE the password in the background
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt); // Use original untrimmed password for hashing
                user.password = hashedPassword;
                await user.save();
                
                console.log(`✅ User ${email} security migrated successfully.`);
                isMatch = true; 
                passwordMigrated = true;
            }
        }

        if (!isMatch) {
            // DIAGNOSTIC LOG: Print lengths to help identify mismatch without exposing the password
            console.log(`[LOGIN FAIL] User: ${email} | Input Length: ${password.length} | DB Length: ${user.password.length}`);
            return res.status(400).json({ message: 'Invalid password.' });
        }

        res.status(200).json({ 
            message: passwordMigrated ? 'Login successful (Security Securely Migrated)' : 'Login successful', 
            user: { firstName: user.firstName, email: user.email } 
        });
    } catch (err) {
        if (err.name === 'MongooseServerSelectionError' || err.message.includes('buffering')) {
            return res.status(503).json({ message: 'Database is currently unavailable. Please try again later.' });
        }
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Forgot Password — Request OTP
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required.' });
        }

        // Case-insensitive lookup for reliability
        const user = await User.findOne({ email: { $regex: new RegExp('^' + email + '$', 'i') } });
        if (!user) {
            return res.status(404).json({ message: 'No account found with this email address.' });
        }

        // Generate 6-digit numeric OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store hashed OTP and 15-minute expiration
        const salt = await bcrypt.genSalt(10);
        const hashedOTP = await bcrypt.hash(otp, salt);
        user.resetOTP = hashedOTP;
        user.resetOTPExpires = Date.now() + 15 * 60 * 1000; // 15 Minutes
        await user.save();

        // Send Email
        const mailOptions = {
            from: `"Know Your City" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Password Recovery Code — Know Your City',
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #0a0b1a; color: #fff; padding: 40px; border-radius: 20px; max-width: 600px; margin: auto; border: 1px solid rgba(255,255,255,0.1);">
                    <h2 style="color: #00e5ff; margin-bottom: 20px;">Password Recovery</h2>
                    <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6;">Hello ${user.firstName},</p>
                    <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6;">You requested a password reset. Use the following 6-digit code to reset your password. This code is valid for <b>15 minutes</b>:</p>
                    <div style="background: rgba(0, 229, 255, 0.1); border: 1px solid #00e5ff; padding: 15px; border-radius: 10px; text-align: center; margin: 25px 0;">
                        <span style="font-family: monospace; font-size: 32px; font-weight: 700; color: #00e5ff; letter-spacing: 5px;">${otp}</span>
                    </div>
                    <p style="color: #94a3b8; font-size: 14px;">If you did not request this, please ignore this email or contact support if you have concerns.</p>
                    <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 30px 0;">
                    <p style="font-size: 12px; color: #64748b; text-align: center;">&copy; 2026 Know Your City. All rights reserved.</p>
                </div>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
            res.status(200).json({ success: true, message: 'Recovery code sent to your email.' });
        } catch (mailErr) {
            console.error('Email Error:', mailErr.message);
            // DEBUG: Send specific error to user for troubleshooting
            return res.status(500).json({ 
                message: `Email Error: ${mailErr.message}`,
                code: mailErr.code,
                diagnostic: 'Please check your Render Environment Variables for EMAIL_PASS.'
            });
        }
    } catch (err) {
        res.status(500).json({ message: 'Server error processing your request.', error: err.message });
    }
});

// Reset Password — Verify OTP and Update Password
router.post('/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        // Case-insensitive lookup for consistency
        const user = await User.findOne({ email: { $regex: new RegExp('^' + email + '$', 'i') } });
        if (!user || !user.resetOTP || !user.resetOTPExpires) {
            return res.status(400).json({ message: 'Invalid or expired recovery session.' });
        }

        // Check expiration
        if (Date.now() > user.resetOTPExpires) {
            return res.status(400).json({ message: 'Recovery code has expired.' });
        }

        // Verify OTP
        const isOTPValid = await bcrypt.compare(otp, user.resetOTP);
        if (!isOTPValid) {
            return res.status(400).json({ message: 'Invalid recovery code.' });
        }

        // High-security password update
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        user.password = hashedPassword;
        
        // Clear OTP fields
        user.resetOTP = undefined;
        user.resetOTPExpires = undefined;
        await user.save();

        res.status(200).json({ success: true, message: 'Password updated successfully. You can now login.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error updating password.', error: err.message });
    }
});

module.exports = router;
