const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const { body, validationResult } = require('express-validator');

// Rate limiting placeholder - in production use express-rate-limit
const rateLimit = new Map();

router.post('/send-email', [
    body('email').isEmail().normalizeEmail(),
    body('itineraryData').notEmpty(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ status: 'error', message: 'Invalid email address' });
    }

    const { email, itineraryData, message } = req.body;

    // Simple Rate Limiting
    const now = Date.now();
    const lastSend = rateLimit.get(email) || 0;
    if (now - lastSend < 60000) { // 1 minute limit
        return res.status(429).json({ status: 'error', message: 'Please wait a minute before sending another email.' });
    }
    rateLimit.set(email, now);

    try {
        // 1. GENERATE PDF
        const doc = new PDFDocument();
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        
        return new Promise((resolve, reject) => {
            doc.on('end', async () => {
                const pdfBuffer = Buffer.concat(buffers);

                // 2. SETUP NODEMAILER
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS
                    }
                });

                // 3. BUILD EMAIL CONTENT
                const itineraryHtml = `
                    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
                        <div style="background: linear-gradient(135deg, #00e5ff, #0097a7); padding: 20px; text-align: center; color: white;">
                            <h1 style="margin: 0;">🏙️ Your Smart Itinerary</h1>
                            <p style="margin: 5px 0 0; opacity: 0.9;">From KnowYourCitys.in</p>
                        </div>
                        <div style="padding: 20px;">
                            <p>Hello,</p>
                            <p>Here is your personalized itinerary for <strong>${itineraryData.city}</strong>.</p>
                            ${message ? `<div style="padding: 10px; background: #f9f9f9; border-left: 4px solid #00e5ff; font-style: italic;">"${message}"</div>` : ''}
                            
                            <h3 style="color: #0097a7; border-bottom: 2px solid #00e5ff; padding-bottom: 5px; margin-top: 25px;">Itinerary Details</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="background: #f4f4f4;">
                                        <th style="padding: 10px; text-align: left; font-size: 0.9rem;">Day</th>
                                        <th style="padding: 10px; text-align: left; font-size: 0.9rem;">Activity</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${itineraryData.days.map(day => `
                                        <tr>
                                            <td style="padding: 10px; border-bottom: 1px solid #eee; vertical-align: top; font-weight: bold;">Day ${day.day}</td>
                                            <td style="padding: 10px; border-bottom: 1px solid #eee;">
                                                ${day.activities.map(act => `
                                                    <div style="margin-bottom: 8px;">
                                                        <span style="color: #00e5ff;">•</span> <strong>${act.time}</strong>: ${act.place}
                                                        <br/><span style="font-size: 0.8rem; color: #777;">Safety Score: ${act.safety}%</span>
                                                    </div>
                                                `).join('')}
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                            
                            <div style="margin-top: 30px; padding: 15px; background: #e0f7fa; border-radius: 8px; text-align: center;">
                                <p style="margin: 0; font-weight: bold; color: #006064;">Total Activities: ${itineraryData.totalActivities}</p>
                            </div>
                        </div>
                        <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 0.8rem; color: #888;">
                            <p style="margin: 0;">Generated by <a href="https://knowyourcitys.in" style="color: #0097a7; text-decoration: none; font-weight: bold;">KnowYourCitys.in</a> 🚀</p>
                            <p style="margin: 5px 0 0;">Your safety is our priority.</p>
                        </div>
                    </div>
                `;

                const mailOptions = {
                    from: '"Know Your City" <' + process.env.EMAIL_USER + '>',
                    to: email,
                    subject: `Your Smart Itinerary for ${itineraryData.city} 🏙️`,
                    html: itineraryHtml,
                    attachments: [
                        {
                            filename: 'itinerary.pdf',
                            content: pdfBuffer
                        }
                    ]
                };

                // 4. SEND EMAIL
                try {
                    await transporter.sendMail(mailOptions);
                    res.json({ status: 'success', message: 'Email sent successfully' });
                    resolve();
                } catch (err) {
                    console.error('Email send error:', err);
                    res.status(500).json({ status: 'error', message: 'Failed to send email' });
                    reject(err);
                }
            });

            // WRITE TO PDF
            doc.fontSize(25).fillColor('#0097a7').text(`Your Smart Itinerary: ${itineraryData.city}`, { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).fillColor('#333').text('Generated by KnowYourCitys.in', { align: 'center' });
            doc.moveDown(2);

            itineraryData.days.forEach(day => {
                doc.fontSize(16).fillColor('#00e5ff').text(`Day ${day.day}`, { underline: true });
                doc.moveDown(0.5);
                day.activities.forEach(act => {
                    doc.fontSize(12).fillColor('#333').text(`${act.time}: ${act.place}`, { indent: 20 });
                    doc.fontSize(10).fillColor('#888').text(`Safety Score: ${act.safety}%`, { indent: 40 });
                    doc.moveDown(0.3);
                });
                doc.moveDown();
            });

            doc.end();
        });

    } catch (err) {
        console.error('Itinerary error:', err);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
});

module.exports = router;
