const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const Contact = require('../models/Contact');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS 
    }
});

router.post('/', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        // Save to Database
        const newContact = new Contact({ name, email, subject, message });
        await newContact.save();

        // Send Email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER, 
            replyTo: email,
            subject: `[KYC Support] ${subject}: ${name}`,
            text: `Message from ${name} (${email}):\n\n${message}`
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ success: true, message: "Message sent successfully!" });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ success: false, message: "Server error. Please try again." });
    }
});

module.exports = router;