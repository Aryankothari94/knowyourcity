const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const Contact = require('../models/Contact');
require('dotenv').config();

// ── Email Transporter ────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ── Smart Auto-Reply Generator ───────────────────────────────────────
function generateAutoReply(name, subject, message) {
    const subjectTemplates = {
        support: {
            heading: '🔍 Safety Data Inquiry — We\'re On It!',
            body: `Thank you for reaching out about our safety data, ${name}!\n\nWe've received your inquiry and our team is reviewing it promptly.\n\nHere's what you can expect:\n• Our safety data is sourced from verified public records, government APIs, and community reports.\n• We update crime, hospital, and infrastructure data regularly to keep it accurate.\n• If you are looking for a specific area or metric, our interactive map at knowyourcity.vercel.app lets you explore real-time safety scores for any Pune neighborhood.\n\n💡 Quick Tip: Use our "Safety Explorer" feature on the homepage to get instant area-wise safety ratings, hospital distances, and police station coverage — no sign-up needed!\n\nYour message:\n"${message}"\n\nOur team will follow up within 24–48 hours with a tailored response.`
        },
        feedback: {
            heading: '💬 Platform Feedback — Thank You!',
            body: `Hi ${name}, your feedback means the world to us!\n\nWe've recorded your thoughts and they go directly to our product team. Know Your City is built by people who care deeply about making city life easier for newcomers — and feedback like yours drives every improvement we make.\n\nYour message:\n"${message}"\n\nWhat happens next:\n• Your feedback is logged and reviewed weekly by our dev team.\n• If you've flagged a bug or UX issue, we'll prioritize a fix.\n• If you've suggested a feature, it gets added to our roadmap vote.\n\n🙌 As a thank-you, watch out for our upcoming "City Insider" newsletter — subscribers get early access to new features!`
        },
        city: {
            heading: '🗺️ New City Mapping Request — Received!',
            body: `Hi ${name}, exciting request!\n\nYou've asked us to map a new city — and we love the ambition! Know Your City currently focuses on Pune, Maharashtra, but expanding is absolutely on our roadmap.\n\nYour message:\n"${message}"\n\nHere's how city mapping works:\n• We need verified data sources (police records, hospital registries, transport APIs) for the city.\n• Community verification rounds are run before going live.\n• Typically takes 4–8 weeks from data collection to launch.\n\n📍 If you have local connections or data sources for the city you mentioned, reply to this email — that could fast-track the process significantly!\n\nWe'll add your request to our city expansion tracker and notify you when mapping begins.`
        },
        partnership: {
            heading: '🤝 Partnership Opportunity — Let\'s Talk!',
            body: `Hi ${name}, we're thrilled you see potential in partnering with Know Your City!\n\nWe're always open to collaborations that help newcomers settle safely and confidently into city life.\n\nYour message:\n"${message}"\n\nPartnership opportunities we explore:\n• 🏢 Real estate & PG listing integrations\n• 🏥 Healthcare provider directories\n• 🚌 Transport & mobility solutions\n• 📰 Local media & city guides\n• 🎓 Educational institutions & student housing\n\nOur founding team will personally review your proposal. Expect a response within 2–3 business days with a meeting link to explore synergies further.\n\nWe look forward to building something meaningful together!`
        },
        default: {
            heading: '📩 Message Received — Know Your City Team',
            body: `Hi ${name}, thank you for getting in touch!\n\nWe've received your message and our team will review it shortly.\n\nYour message:\n"${message}"\n\nIn the meantime, here are some helpful resources:\n• 🗺️ Explore our Safety Map: knowyourcity.vercel.app\n• 📖 Read our City Guides for tips on neighborhoods, transport & more.\n• 🏥 Use our Hospital & Police Finder for emergency resources near you.\n\nWe typically respond within 24–48 hours. If your matter is urgent, please email us directly at knowyourcity000@gmail.com.`
        }
    };

    const template = subjectTemplates[subject] || subjectTemplates.default;

    return {
        subject: template.heading,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Know Your City — Response</title>
</head>
<body style="margin:0;padding:0;background:#0a0b1a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0b1a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="background:linear-gradient(135deg,#00e5ff,#00e676);border-radius:20px 20px 0 0;padding:40px 40px 30px;text-align:center;">
              <h1 style="margin:0;font-size:28px;font-weight:800;color:#0a0b1a;letter-spacing:-0.5px;">🏙️ Know Your City</h1>
              <p style="margin:8px 0 0;font-size:14px;color:#0a0b1a;opacity:0.8;font-weight:600;">Safe Neighborhoods for Newcomers</p>
            </td>
          </tr>
          <tr>
            <td style="background:#12132a;padding:40px;border-left:1px solid rgba(255,255,255,0.08);border-right:1px solid rgba(255,255,255,0.08);">
              <h2 style="margin:0 0 24px;font-size:20px;color:#00e5ff;font-weight:700;">${template.heading}</h2>
              <div style="color:#c8d0dc;font-size:15px;line-height:1.8;white-space:pre-line;">${template.body}</div>
            </td>
          </tr>
          <tr>
            <td style="background:#12132a;padding:0 40px;border-left:1px solid rgba(255,255,255,0.08);border-right:1px solid rgba(255,255,255,0.08);">
              <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:0;">
            </td>
          </tr>
          <tr>
            <td style="background:#12132a;padding:30px 40px;text-align:center;border-left:1px solid rgba(255,255,255,0.08);border-right:1px solid rgba(255,255,255,0.08);">
              <a href="https://knowyourcity.vercel.app" style="display:inline-block;background:linear-gradient(135deg,#00e5ff,#00e676);color:#0a0b1a;font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:50px;">
                Explore Safety Maps →
              </a>
            </td>
          </tr>
          <tr>
            <td style="background:#0d0e20;border-radius:0 0 20px 20px;padding:24px 40px;text-align:center;border:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;color:#4a5568;font-size:13px;">
                This is an automated response from Know Your City.<br>
                Reply directly to this email to reach our team at <a href="mailto:knowyourcity000@gmail.com" style="color:#00e5ff;text-decoration:none;">knowyourcity000@gmail.com</a>
              </p>
              <p style="margin:12px 0 0;color:#2d3748;font-size:12px;">© 2025 Know Your City — Solapur, Maharashtra 413006</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
    };
}

// ── POST /api/contact ────────────────────────────────────────────────
router.post('/', async (req, res) => {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    let dbSaved = false;
    let emailSent = false;
    const errors = [];

    // Step 1: Save to MongoDB
    try {
        const newContact = new Contact({ name, email, subject, message, status: 'pending' });
        await Promise.race([
            newContact.save(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('DB timeout')), 8000))
        ]);
        dbSaved = true;
        console.log(`✅ Contact saved to DB: ${email}`);
    } catch (dbErr) {
        console.error('⚠️  DB save failed (non-fatal):', dbErr.message);
        errors.push('DB: ' + dbErr.message);
    }

    // Step 2: Send auto-reply to user
    try {
        const reply = generateAutoReply(name, subject, message);
        await transporter.sendMail({
            from: `"Know Your City" <${process.env.EMAIL_USER}>`,
            to: email,
            replyTo: process.env.EMAIL_USER,
            subject: reply.subject,
            html: reply.html
        });
        emailSent = true;
        console.log(`✅ Auto-reply sent to: ${email}`);
    } catch (mailErr) {
        console.error('⚠️  Auto-reply email failed:', mailErr.message);
        errors.push('Email: ' + mailErr.message);
    }

    // Step 3: Notify admin
    try {
        await transporter.sendMail({
            from: `"Know Your City Contact Form" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER,
            replyTo: email,
            subject: `[KYC Contact] ${subject} — ${name}`,
            html: `<div style="font-family:Arial,sans-serif;padding:20px;background:#f5f5f5;"><h2>New Contact Form Submission</h2><table style="width:100%;background:#fff;border-radius:8px;padding:20px;border-collapse:collapse;"><tr><td style="padding:8px;font-weight:bold;">Name</td><td style="padding:8px;">${name}</td></tr><tr style="background:#f9f9f9;"><td style="padding:8px;font-weight:bold;">Email</td><td style="padding:8px;"><a href="mailto:${email}">${email}</a></td></tr><tr><td style="padding:8px;font-weight:bold;">Subject</td><td style="padding:8px;">${subject}</td></tr><tr style="background:#f9f9f9;"><td style="padding:8px;font-weight:bold;">Message</td><td style="padding:8px;">${message}</td></tr><tr><td style="padding:8px;font-weight:bold;">DB Saved</td><td style="padding:8px;">${dbSaved ? '✅ Yes' : '❌ No'}</td></tr><tr style="background:#f9f9f9;"><td style="padding:8px;font-weight:bold;">Timestamp</td><td style="padding:8px;">${new Date().toISOString()}</td></tr></table></div>`
        });
        console.log(`✅ Admin notified`);
    } catch (adminErr) {
        console.error('⚠️  Admin notification failed:', adminErr.message);
    }

    if (emailSent || dbSaved) {
        return res.status(200).json({
            success: true,
            message: 'Your message has been received! Check your inbox for our response.',
            dbSaved,
            emailSent
        });
    } else {
        return res.status(500).json({
            success: false,
            message: 'We could not process your request right now. Please email us directly at knowyourcity000@gmail.com',
            errors
        });
    }
});

module.exports = router;
