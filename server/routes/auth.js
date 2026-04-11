const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const User = require('../models/User');

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

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid password.' });
        }

        res.status(200).json({ message: 'Login successful', user: { firstName: user.firstName, email: user.email } });
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
        
        // Hash temporary password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(tempPassword, salt);
        
        // Update user password
        user.password = hashedPassword;
        await user.save();

        // Setup Email Transporter (more robust config for Gmail)
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            tls: {
                rejectUnauthorized: false
            }
        });

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

        try {
            await transporter.sendMail(mailOptions);
        } catch (mailErr) {
            console.error('Email Send Error:', mailErr);
            return res.status(500).json({ 
                message: 'Your password was reset, but we could not send the email. Please contact support.', 
                error: mailErr.message 
            });
        }

        res.status(200).json({ success: true, message: 'A temporary password has been sent to your email.' });
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
