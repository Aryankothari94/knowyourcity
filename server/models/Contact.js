const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, default: 'pending' }, // pending, responded, resolved
}, { 
    timestamps: true,
    bufferCommands: false // Fail fast if DB is down, don't wait 10s
});

module.exports = mongoose.model('Contact', contactSchema);
