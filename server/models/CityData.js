const mongoose = require('mongoose');

const CityDataSchema = new mongoose.Schema({
    cityName: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    coordinates: {
        lat: Number,
        lng: Number
    },
    safetyStats: {
        policeCount: { type: Number, default: 0 },
        hospitalCount: { type: Number, default: 0 },
        fireCount: { type: Number, default: 0 },
        cctvCount: { type: Number, default: 0 },
        totalScore: { type: Number, default: 0 },
        densityPerKm: { type: Number, default: 0 }
    },
    infrastructures: [{
        nodeType: String, // 'police', 'hospital', 'fire_station', 'surveillance'
        lat: Number,
        lng: Number,
        name: String
    }],
    touristZones: [{
        name: String,
        lat: Number,
        lng: Number,
        type: String, // 'park', 'historic', 'museum'
        safetyScore: Number,
        familyScore: Number,
        walkability: Number
    }],
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

// Create index for 24-hour cache expiration or quick lookups
CityDataSchema.index({ cityName: 1 });

module.exports = mongoose.model('CityData', CityDataSchema);
