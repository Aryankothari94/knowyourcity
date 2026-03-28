const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const Contact = require('../models/Contact');
require('dotenv').config();

// 1. Nodemailer Transporter Configuration
// Optimized for Gmail with SSL on Port 465
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, 
    auth: {
        user: process.env.EMAIL_USER, // Your Gmail (e.g., aryankothari94@gmail.com)
        pass: process.env.EMAIL_PASS  // Your 16-character Google App Password
    }
});

// 2. Professional Auto-Response Templates
const getAutoResponse = (name, subject) => {
    const base = `Hello ${name},\n\nThank you for reaching out to Know Your City Support.\n\n`;
    const footer = `\n\nOur team is currently analyzing your query. You can expect a follow-up shortly as our systems process your request.\n\nBest regards,\nKnow Your City Team`;

    let specific = "";
    switch (subject.toLowerCase()) {
        case 'support':
            specific = `We have received your Safety Data Inquiry. Our experts are gathering the latest metrics for your area.`;
            break;
        case 'feedback':
            specific = `We value your feedback! Your insights help us improve our safety mapping algorithms.`;
            break;
        case 'city':
            specific = `Your request for a new city mapping has been logged. We prioritize expansions based on community demand.`;
            break;
        default:
            specific = `We have received your message and our team will get back to you as soon as possible.`;
    }

    return base + specific + footer;
};

// 3. POST /api/contact - The Main Logic
router.post('/', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        // STEP A: Save to MongoDB Atlas
        let dbSaved = false;
        try {
            const newContact = new Contact({ name, email, subject, message });
            await newContact.save();
            dbSaved = true;
            console.log('✅ Success: Message saved to MongoDB');
        } catch (dbErr) {
            console.error('❌ Database Save Error:', dbErr);
            // We continue so the email can still be sent even if DB is slow
        }

        // STEP B: Prepare Email to You (The Admin)
        const mailOptionsToAdmin = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_RECEIVER || process.env.EMAIL_USER,
            replyTo: email,
            subject: `[KYC Alert] ${subject}: from ${name}`,
            text: `New Website Inquiry:\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}\n\nDatabase Status: ${dbSaved ? 'Saved' : 'Failed'}`
        };

        // STEP C: Prepare Auto-Response to User
        const mailOptionsToUser = {
            from: `"Know Your City Support" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `Re: Your ${subject} inquiry - Know Your City`,
            text: getAutoResponse(name, subject)
        };

        // STEP D: Execute Email Sending
        let emailsSent = false;
        try {
            await transporter.sendMail(mailOptionsToAdmin);
            await transporter.sendMail(mailOptionsToUser);
            emailsSent = true;
            console.log('✅ Success: Emails dispatched');
        } catch (mailErr) {
            console.error('❌ Nodemailer Error:', mailErr.message);
        }

        // STEP E: Final Response to Frontend
        if (emailsSent) {
            res.status(200).json({ 
                success: true, 
                message: 'Query sent! Please check your email for a confirmation.' 
            });
        } else if (dbSaved) {
            res.status(200).json({ 
                success: true, 
                message: 'Message saved locally, but email notification failed.' 
            });
        } else {
            res.status(500).json({ 
                success: false, 
                message: 'Server Error: Could not save message or send email.' 
            });
        }

    } catch (err) {
        console.error('Unexpected Route Error:', err);
        res.status(500).json({ success: false, message: 'An unexpected error occurred.' });
    }
});

module.exports = router;