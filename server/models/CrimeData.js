const mongoose = require('mongoose');

const crimeDataSchema = new mongoose.Schema({
    location: {
        type: {
            type: String,
            enum: ['Point'],
            required: true,
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true
        }
    },
    type: {
        type: String,
        required: true,
        enum: ['Theft', 'Assault', 'Harassment', 'Robbery', 'Other']
    },
    severity: {
        type: Number, // 1 to 5
        required: true
    },
    description: String,
    reportedAt: {
        type: Date,
        default: Date.now
    },
    city: String
}, { timestamps: true });

crimeDataSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('CrimeData', crimeDataSchema);
