const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const User = require('../models/User');

// Setup the Transporter OUTSIDE the routes (matches contact.js pattern)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Register
router.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, phone, email, dob, password } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
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

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'Email does not exist. Please sign up first.' });
        }

        // Check password - ATTEMPT 1: Standard Bcrypt Comparison (Normal Flow)
        let isMatch = await bcrypt.compare(password, user.password);
        let passwordMigrated = false;

        // ATTEMPT 2: Plain-Text Fallback (Migration Flow for legacy/manual accounts)
        // If bcrypt fails, check if input password exactly matches the database's password string.
        // This usually means the password in the DB isn't a hash yet.
        if (!isMatch) {
            if (password === user.password) {
                console.log(`[SECURITY UPGRADE] User ${email} logged in with plain-text password. Migrating to Hash...`);
                
                // Automatically HASH and UPDATE the password in the background
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);
                user.password = hashedPassword;
                await user.save();
                
                console.log(`✅ User ${email} security migrated successfully.`);
                isMatch = true; 
                passwordMigrated = true;
            }
        }

        if (!isMatch) {
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

// Forgot Password
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required.' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'No account found with this email address.' });
        }

        // Generate temporary password (8 characters)
        const tempPassword = crypto.randomBytes(4).toString('hex');
        
        // We do NOT update the user password yet (to avoid locking them out if email fails)
        // We will do it inside the successful email block

        // No verify block here - matching contact.js pattern for stability

        // Send Email
        const mailOptions = {
            from: `"Know Your City" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'New Signin Password — Know Your City',
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #0a0b1a; color: #fff; padding: 40px; border-radius: 20px; max-width: 600px; margin: auto; border: 1px solid rgba(255,255,255,0.1);">
                    <h2 style="color: #00e5ff; margin-bottom: 20px;">Your New Signin Password</h2>
                    <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6;">Hello ${user.firstName},</p>
                    <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6;">As requested, your password has been reset. You can now use this <b>New Signin Password</b> to access your account:</p>
                    <div style="background: rgba(0, 229, 255, 0.1); border: 1px solid #00e5ff; padding: 15px; border-radius: 10px; text-align: center; margin: 25px 0;">
                        <span style="font-family: monospace; font-size: 24px; font-weight: 700; color: #00e5ff; letter-spacing: 2px;">${tempPassword}</span>
                    </div>
                    <p style="color: #ff5252; font-size: 14px; font-weight: 600;">Security Reminder:</p>
                    <p style="color: #94a3b8; font-size: 14px;">Log in using this password and immediately update it in your Account Settings to something you can easily remember.</p>
                    <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 30px 0;">
                    <p style="font-size: 12px; color: #64748b; text-align: center;">If you did not request this change, please contact our support team immediately.</p>
                </div>
            `
        };

        // Only update the database IF the email sends successfully
        try {
            console.log(`Attempting to send email to ${email}...`);
            await transporter.sendMail(mailOptions);
            console.log('✅ Email sent successfully');
            
            // Hash and Save the new password now that we know the user will receive it
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(tempPassword, salt);
            user.password = hashedPassword;
            await user.save();
            console.log(`✅ Password updated in database for ${email}`);

            res.status(200).json({ success: true, message: 'A new signin password has been sent to your email.' });
        } catch (mailErr) {
            console.error('❌ Email Send Error Details:', {
                message: mailErr.message,
                code: mailErr.code,
                command: mailErr.command,
                response: mailErr.response
            });
            return res.status(500).json({ 
                message: 'Could not send the email. Your password has NOT been changed.', 
                error: mailErr.message 
            });
        }
    } catch (err) {
        console.error('Forgot Password Error:', err);
        const isDBError = err.name === 'MongooseError' || err.name === 'MongoError' || err.message.includes('buffering');
        res.status(500).json({ 
            message: isDBError ? 'Database connection issue. Please try again later.' : 'Server error processing your request.', 
            error: err.message 
        });
    }
});

module.exports = router;
