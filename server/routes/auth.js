const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const User = require('../models/User');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client("808171982330-2hrbreabki0uj3aluob8vhbsecnu00ob.apps.googleusercontent.com");

// Setup the Transporter with high-speed optimization
const transporter = nodemailer.createTransport({
    service: 'gmail',
    pool: true,
    family: 4,    // STRICT IPv4 only to avoid ENETUNREACH IPv6 timeout
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    },
    connectionTimeout: 40000, 
    greetingTimeout: 40000
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

        // Validation Regex
        const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;

        // Email Validation: Only @gmail.com allowed
        if (!email || !emailRegex.test(email)) {
            console.log(`[SIGNUP BLOCKED] Invalid/Non-Gmail address: ${email}`);
            return res.status(400).json({ message: 'Only genuine Google accounts (@gmail.com) are accepted.' });
        }

        // Phone Validation
        if (!phone || !phoneRegex.test(phone.replace(/\s+/g, ''))) {
            console.log(`[SIGNUP BLOCKED] Invalid phone number: ${phone}`);
            return res.status(400).json({ message: 'Please enter a valid phone number.' });
        }

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
            password: hashedPassword,
            isVerified: false 
        });

        // GENERATE SIGNUP OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const saltOTP = await bcrypt.genSalt(10);
        newUser.loginOTP = await bcrypt.hash(otp, saltOTP);
        newUser.loginOTPExpires = Date.now() + 15 * 60 * 1000; 
        
        await newUser.save();

        // Send Email
        const mailOptions = {
            from: `"Know Your City" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Verify Your Account — Know Your City',
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #0a0b1a; color: #fff; padding: 40px; border-radius: 20px; max-width: 600px; margin: auto; border: 1px solid rgba(255,255,255,0.1);">
                    <h2 style="color: #00e5ff; margin-bottom: 20px;">Account Verification</h2>
                    <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6;">Hello ${firstName},</p>
                    <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6;">Welcome to Know Your City! Please use the following code to verify your email and complete your registration:</p>
                    <div style="background: rgba(0, 229, 255, 0.1); border: 1px solid #00e5ff; padding: 15px; border-radius: 10px; text-align: center; margin: 25px 0;">
                        <span style="font-family: monospace; font-size: 32px; font-weight: 700; color: #00e5ff; letter-spacing: 5px;">${otp}</span>
                    </div>
                </div>
            `
        };
        await transporter.sendMail(mailOptions);

        res.status(201).json({ 
            verificationRequired: true, 
            email, 
            message: 'Verification code sent to your email.' 
        });
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

        // Validation Regex
        const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
        if (!email || !emailRegex.test(email)) {
            return res.status(400).json({ message: 'Only genuine Google accounts (@gmail.com) are accepted.' });
        }

        // Use a case-insensitive regex for email lookup
        const user = await User.findOne({ email: { $regex: new RegExp('^' + email + '$', 'i') } });
        if (!user) {
            console.log(`[LOGIN ATTEMPT] Email not found: ${email}`);
            return res.status(404).json({ message: 'Email does not exist. Please sign up first.' });
        }

        if (user.isVerified === false) {
            // Send new OTP for verification if they try to login but aren't verified
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const salt = await bcrypt.genSalt(10);
            user.loginOTP = await bcrypt.hash(otp, salt);
            user.loginOTPExpires = Date.now() + 15 * 60 * 1000;
            await user.save();

            const mailOptions = {
                from: `"Know Your City" <${process.env.EMAIL_USER}>`,
                to: user.email,
                subject: 'Complete Your Verification — Know Your City',
                html: `<div style="..."><p>Your verification code is: <b>${otp}</b></p></div>`
            };
            await transporter.sendMail(mailOptions);
            
            return res.status(403).json({ 
                verificationRequired: true, 
                email: user.email, 
                message: 'Account not verified. A new code has been sent to your email.' 
            });
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
            message: 'Login successful', 
            user: { firstName: user.firstName, email: user.email } 
        });
    } catch (err) {
        if (err.name === 'MongooseServerSelectionError' || err.message.includes('buffering')) {
            return res.status(503).json({ message: 'Database is currently unavailable. Please try again later.' });
        }
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Verify Signup/Login OTP
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({ email: { $regex: new RegExp('^' + email + '$', 'i') } });

        if (!user || !user.loginOTP || !user.loginOTPExpires) {
            return res.status(400).json({ message: 'Invalid or expired session.' });
        }

        if (Date.now() > user.loginOTPExpires) {
            return res.status(400).json({ message: 'Verification code expired.' });
        }

        const isMatch = await bcrypt.compare(otp, user.loginOTP);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid verification code.' });
        }

        // Mark as verified and clear OTP
        user.isVerified = true;
        user.loginOTP = undefined;
        user.loginOTPExpires = undefined;
        await user.save();

        res.status(200).json({ 
            message: 'Authentication successful', 
            user: { firstName: user.firstName, email: user.email } 
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error during verification.' });
    }
});

// Google Sign-In
router.post('/google', async (req, res) => {
    try {
        const { token } = req.body;
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: "808171982330-2hrbreabki0uj3aluob8vhbsecnu00ob.apps.googleusercontent.com",
        });
        const payload = ticket.getPayload();
        const { email, given_name, family_name, picture, sub } = payload;

        // Check if user exists
        let user = await User.findOne({ email: { $regex: new RegExp('^' + email + '$', 'i') } });

        if (!user) {
            // Create new user if doesn't exist
            user = new User({
                firstName: given_name,
                lastName: family_name || '',
                email: email,
                phone: 'GOOGLE_USER',
                dob: new Date('1900-01-01'),
                password: await bcrypt.hash(sub, 10),
                isGoogleUser: true,
                isVerified: true // Google users are pre-verified by Google
            });
            await user.save();
        }

        res.status(200).json({
            message: 'Google login successful',
            user: { firstName: user.firstName, email: user.email }
        });
    } catch (err) {
        console.error('Google Auth Error:', err.message);
        res.status(400).json({ message: 'Google authentication failed', error: err.message });
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
