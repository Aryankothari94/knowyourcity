const mongoose = require('mongoose');

const safeRouteFeedbackSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: [Number]
    },
    safetyRating: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    comment: String,
    lighting: {
        type: String,
        enum: ['Excellent', 'Good', 'Average', 'Poor', 'None']
    },
    crowdDensity: {
        type: String,
        enum: ['High', 'Medium', 'Low', 'Empty']
    }
}, { timestamps: true });

safeRouteFeedbackSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('SafeRouteFeedback', safeRouteFeedbackSchema);
