const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const Contact = require('../models/Contact');
require('dotenv').config();

// Nodemailer Transporter
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // Use SSL
    auth: {
        user: process.env.EMAIL_USER || 'knowyourcity000@gmail.com',
        pass: process.env.EMAIL_PASS
    }
});

// Response Templates
const getAutoResponse = (name, subject) => {
    const base = `Hello ${name},\n\nThank you for reaching out to Know Your City Support.\n\n`;
    const footer = `\n\nOur team is currently analyzing your query. You can expect a detailed follow-up within 1-2 minutes as our automated systems process the technical details of your request.\n\nBest regards,\nKnow Your City Team`;

    let specific = "";
    switch (subject) {
        case 'support':
            specific = `We have received your Safety Data Inquiry. Our experts are gathering the latest infrastructure metrics for your area to provide a comprehensive analysis.`;
            break;
        case 'feedback':
            specific = `We value your feedback! Your insights help us improve our safety mapping algorithms for everyone.`;
            break;
        case 'city':
            specific = `Your request for a new city mapping has been logged. We prioritize expansions based on community demand and data availability.`;
            break;
        case 'partnership':
            specific = `Thank you for your interest in partnering with us. We are always looking to collaborate with urban data providers and community leaders.`;
            break;
        default:
            specific = `We have received your message and will get back to you shortly.`;
    }

    return base + specific + footer;
};

// POST /api/contact
router.post('/', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        // 1. Try to Save to Database (Non-blocking for email if possible, but usually we want both)
        let dbSaved = false;
        try {
            const newContact = new Contact({ name, email, subject, message });
            await newContact.save();
            dbSaved = true;
        } catch (dbErr) {
            console.error('Database Save Error:', dbErr);
            // We continue to try sending email even if DB fails
        }

        // 2. Prepare Emails
        const mailOptionsToCompany = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER,
            replyTo: email, // Extremely important for support threads!
            subject: `[KYC Support] ${subject}: ${name}`,
            text: `Detailed Inquiry from Know Your City Website:\n\n` +
                  `--------------------------------------------\n` +
                  `Name    : ${name}\n` +
                  `Email   : ${email}\n` +
                  `Subject : ${subject}\n\n` +
                  `Message :\n${message}\n` +
                  `--------------------------------------------\n` +
                  `Timestamp: ${new Date().toLocaleString()}\n` +
                  `Database Saved: ${dbSaved}`
        };

        const mailOptionsToUser = {
            from: `"Know Your City Support" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `Re: Your ${subject} query on Know Your City`,
            text: getAutoResponse(name, subject)
        };

        // 3. Send Emails
        let emailsSent = false;
        try {
            console.log(`Attempting to send emails via ${process.env.EMAIL_USER}...`);
            const infoCompany = await transporter.sendMail(mailOptionsToCompany);
            console.log('✅ Success: Email to Company delivered (ID: ' + infoCompany.messageId + ')');
            
            const infoUser = await transporter.sendMail(mailOptionsToUser);
            console.log('✅ Success: Auto-response to User delivered (ID: ' + infoUser.messageId + ')');
            
            emailsSent = true;
        } catch (mailErr) {
            console.error('❌ Nodemailer Fatal Error:', mailErr.message);
            if (mailErr.code === 'EAUTH') {
                console.error('   -> Check your App Password in .env. Current User:', process.env.EMAIL_USER);
            }
        }

        if (emailsSent) {
            res.status(200).json({ 
                success: true, 
                message: dbSaved 
                    ? 'Your query has been sent successfully. Please check your email (and spam) for an automated response.' 
                    : 'Your query was emailed to us, but could not be saved to our database. Our team will still get back to you.'
            });
        } else {
            res.status(500).json({ 
                success: false, 
                message: dbSaved 
                    ? 'Message saved locally, but email notification failed. Please check server logs for Nodemailer errors.' 
                    : 'Fatal Error: Database save and email notification failed. Please verify your .env settings and ensure MongoDB is running.'
            });
        }
    } catch (err) {
        console.error('Contact API Unexpected Error:', err);
        res.status(500).json({ success: false, message: 'An unexpected server error occurred.' });
    }
});

module.exports = router;
