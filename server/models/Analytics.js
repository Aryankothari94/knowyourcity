const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
    metric: { 
        type: String, 
        required: true, 
        unique: true,
        default: 'page_views'
    },
    count: { 
        type: Number, 
        default: 0 
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('Analytics', analyticsSchema);
