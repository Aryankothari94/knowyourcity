const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
    name:    { type: String, required: true, trim: true },
    email:   { type: String, required: true, trim: true, lowercase: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    status:  { type: String, default: 'pending', enum: ['pending', 'responded', 'resolved'] },
    autoReplySent: { type: Boolean, default: false },
}, { 
    timestamps: true,
});

module.exports = mongoose.model('Contact', contactSchema);
