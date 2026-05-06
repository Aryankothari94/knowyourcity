const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const { body, validationResult } = require('express-validator');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

// Retry Helper for Gemini
async function generateWithRetry(prompt, retries = 3, delay = 2000) {
    for (let i = 0; i < retries; i++) {
        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text().trim();
        } catch (err) {
            const isRetryable = err.message.includes('503') || err.message.includes('500') || err.message.includes('high demand');
            if (isRetryable && i < retries - 1) {
                console.log(`Gemini busy (503/500). Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw err;
        }
    }
}

// Route: POST /api/itinerary/generate
router.post('/generate', async (req, res) => {
    const { 
        city, duration, budget, interests, 
        travelMode, timeAvailability, safetyPreference, pace 
    } = req.body;

    if (!city) return res.status(400).json({ status: 'error', message: 'City is required' });

    try {
        const prompt = `
        Generate a highly detailed and accurate city itinerary for **${city}**.
        
        USER INPUTS:
        - Duration: ${duration}
        - Budget: ${budget}
        - Interests: ${interests.join(', ')}
        - Travel Mode: ${travelMode}
        - Time Availability: ${timeAvailability}
        - Safety Preference: ${safetyPreference}
        - Pace: ${pace}

        RESPONSE RULES:
        1. Provide a professional, engaging itinerary.
        2. Format as a valid JSON object.
        3. Include "city", "summary", "totalDays", and a "days" array.
        4. Each day should have a "dayNumber" and "activities" array.
        5. Each activity must have "time", "place", "description", "costEstimate", and "safetyScore" (out of 100).
        6. Ensure places are real and relevant to ${city}.
        7. The tone should be helpful and safety-conscious.
        
        OUTPUT FORMAT (Respond ONLY with JSON):
        {
          "city": "${city}",
          "summary": "...",
          "totalDays": ${duration},
          "days": [
            {
              "dayNumber": 1,
              "activities": [
                { "time": "09:00 AM", "place": "...", "description": "...", "costEstimate": "...", "safetyScore": 95 }
              ]
            }
          ]
        }
        `;

        let text = await generateWithRetry(prompt);
        
        // Clean up markdown
        if (text.startsWith('```json')) text = text.replace(/^```json/, '').replace(/```$/, '');
        else if (text.startsWith('```')) text = text.replace(/^```/, '').replace(/```$/, '');

        try {
            const itinerary = JSON.parse(text);
            res.json({ status: 'success', data: itinerary });
        } catch (parseErr) {
            console.error('JSON Parse Error. Raw text:', text);
            // Fallback: If JSON fails, it might be due to trailing commas or markdown.
            // We'll try to find the first '{' and last '}'
            const startIdx = text.indexOf('{');
            const endIdx = text.lastIndexOf('}');
            if (startIdx !== -1 && endIdx !== -1) {
                try {
                    const cleaned = text.substring(startIdx, endIdx + 1);
                    const itinerary = JSON.parse(cleaned);
                    return res.json({ status: 'success', data: itinerary });
                } catch (e) {}
            }
            throw new Error('AI returned an invalid format. Please try again.');
        }

    } catch (err) {
        console.error('Gemini Generation Error:', err);
        res.status(500).json({ status: 'error', message: err.message || 'Failed to generate itinerary.' });
    }
});

// Route: POST /api/itinerary/send-email
router.post('/send-email', [
    body('email').isEmail().normalizeEmail(),
    body('itineraryData').notEmpty(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ status: 'error', message: 'Invalid email address' });
    }

    const { email, itineraryData, message } = req.body;

    try {
        // 1. GENERATE PDF
        const doc = new PDFDocument({ margin: 50 });
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        
        return new Promise((resolve, reject) => {
            doc.on('end', async () => {
                const pdfBuffer = Buffer.concat(buffers);

                const transporter = nodemailer.createTransport({
                    host: 'smtp.gmail.com',
                    port: 465,
                    secure: true,
                    family: 4,
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS
                    }
                });

                const emailHtml = `
                    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; max-width: 700px; margin: 0 auto; border: 1px solid #ddd; border-radius: 12px; overflow: hidden;">
                        <div style="background: #0f172a; padding: 30px; text-align: center; color: white;">
                            <h1 style="margin: 0; color: #00e5ff;">🗺️ Your Smart Itinerary</h1>
                            <p style="margin: 10px 0 0; opacity: 0.8; font-size: 1.1rem;">Exploration Guide for <strong>${itineraryData.city}</strong></p>
                        </div>
                        <div style="padding: 30px; line-height: 1.6;">
                            <p>Hi there,</p>
                            <p>We've crafted a special travel plan just for you. Here's a summary of your upcoming adventure.</p>
                            
                            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 5px solid #00e5ff;">
                                <h3 style="margin-top: 0; color: #0f172a;">Plan Overview</h3>
                                <p style="margin: 0;">${itineraryData.summary}</p>
                            </div>

                            ${message ? `<div style="padding: 15px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; font-style: italic; margin-bottom: 25px;">"${message}"</div>` : ''}

                            ${itineraryData.days.map(day => `
                                <div style="margin-bottom: 30px;">
                                    <h2 style="color: #00e5ff; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Day ${day.dayNumber}</h2>
                                    ${day.activities.map(act => `
                                        <div style="margin-bottom: 15px; padding-left: 15px; border-left: 2px solid #cbd5e1;">
                                            <div style="font-weight: bold; font-size: 1rem;">
                                                <span style="color: #64748b;">${act.time}</span> &mdash; ${act.place}
                                            </div>
                                            <div style="color: #475569; font-size: 0.9rem; margin: 4px 0;">${act.description}</div>
                                            <div style="font-size: 0.8rem; color: #94a3b8;">
                                                💰 Cost: ${act.costEstimate} | 🛡️ Safety Score: ${act.safetyScore}%
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            `).join('')}

                            <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
                                <a href="https://knowyourcitys.in" style="display: inline-block; padding: 12px 25px; background: #00e5ff; color: #000; text-decoration: none; border-radius: 30px; font-weight: bold;">Explore More on Know Your City</a>
                            </div>
                        </div>
                        <div style="background: #f1f5f9; padding: 20px; text-align: center; font-size: 0.8rem; color: #64748b;">
                            <p style="margin: 0;">&copy; 2026 KnowYourCitys.in | Built for Smart Travelers 🚀</p>
                        </div>
                    </div>
                `;

                const mailOptions = {
                    from: '"Know Your City" <' + process.env.EMAIL_USER + '>',
                    to: email,
                    subject: `Your Personalized ${itineraryData.city} Itinerary 🏙️`,
                    html: emailHtml,
                    attachments: [{ filename: 'itinerary.pdf', content: pdfBuffer }]
                };

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

            // PDF DESIGN
            doc.rect(0, 0, doc.page.width, 100).fill('#0f172a');
            doc.fillColor('#00e5ff').fontSize(24).font('Helvetica-Bold').text('Smart Itinerary Guide', 50, 40);
            doc.fillColor('#ffffff').fontSize(12).font('Helvetica').text(`Destination: ${itineraryData.city}`, 50, 70);
            doc.moveDown(4);

            doc.fillColor('#333333').fontSize(12).text(itineraryData.summary, { align: 'justify' });
            doc.moveDown(2);

            itineraryData.days.forEach(day => {
                // Page check for new day
                if (doc.y > 650) doc.addPage();
                
                doc.fillColor('#00e5ff').fontSize(20).font('Helvetica-Bold').text(`Day ${day.dayNumber}`, { underline: true });
                doc.moveDown(0.5);
                
                day.activities.forEach(act => {
                    // Page check for new activity (prevent split activities)
                    if (doc.y > 680) doc.addPage();

                    doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text(`${act.time} - ${act.place}`);
                    doc.fillColor('#444444').font('Helvetica').fontSize(10).text(act.description, { indent: 15, align: 'justify' });
                    doc.fillColor('#888888').fontSize(9).text(`Estimated Cost: ${act.costEstimate} | Safety Score: ${act.safetyScore}%`, { indent: 15 });
                    doc.moveDown(1.2);
                });
                doc.moveDown(1);
            });

            // Footer on last page
            if (doc.y > 700) doc.addPage();
            doc.moveDown(2);
            doc.fontSize(10).fillColor('#94a3b8').text('Generated by KnowYourCitys.in', { align: 'center' });
            doc.text('Built for Smart & Safe Travelers 🚀', { align: 'center' });

            doc.end();
        });

    } catch (err) {
        console.error('Email Route Error:', err);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
});

module.exports = router;
