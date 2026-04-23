const express = require('express');
const router = express.Router();
const CrimeData = require('../models/CrimeData');
const SafeRouteFeedback = require('../models/SafeRouteFeedback');

// Helper to fetch safety infrastructure from Overpass (Police/Hospitals)
async function fetchSafetyAssets(coords) {
    const lats = coords.map(c => c[0]);
    const lngs = coords.map(c => c[1]);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const radius = 5000; // 5km search

    const query = `[out:json][timeout:25];
        (
          node["amenity"="police"](around:${radius},${centerLat},${centerLng});
          node["amenity"~"hospital|clinic"](around:${radius},${centerLat},${centerLng});
          node["amenity"~"cafe|restaurant|shop"](around:${radius},${centerLat},${centerLng});
        );out center tags 500;`;
    
    try {
        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: 'data=' + encodeURIComponent(query),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        
        if (!response.ok) return [];
        const data = await response.json();
        return data.elements || [];
    } catch (e) {
        console.error('Overpass Fetch Error:', e.message);
        return [];
    }
}

// POST /api/saferoute/directions
router.post('/directions', async (req, res) => {
    const { origin, destination, womenSafetyMode } = req.body;

    if (!origin || !destination) {
        return res.status(400).json({ message: 'Origin and destination are required' });
    }

    try {
        // 1. Fetch routes from OSRM (up to 3 alternatives)
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&alternatives=true`;
        
        const response = await fetch(osrmUrl);
        if (!response.ok) throw new Error('OSRM Route Fetch Failed');
        
        const routeData = await response.json();
        const routes = routeData.routes;

        if (!routes || routes.length === 0) {
            return res.status(404).json({ message: 'No routes found' });
        }

        // 2. Process and Score each route
        const scoredRoutes = await Promise.all(routes.map(async (route, index) => {
            const coords = route.geometry.coordinates.map(c => [c[1], c[0]]); // [lat, lng]
            
            // Fetch assets for the route
            const assets = await fetchSafetyAssets(coords);
            
            // Calculate Score
            let policeCount = 0;
            let medicalCount = 0;
            let activityCount = 0; // Shops/Cafes (Proxy for lighting/people)

            assets.forEach(asset => {
                const type = asset.tags.amenity;
                if (type === 'police') policeCount++;
                else if (type === 'hospital' || type === 'clinic') medicalCount++;
                else activityCount++;
            });

            // Fetch Crime Data from DB for the route bounding box
            const lats = coords.map(c => c[0]);
            const lngs = coords.map(c => c[1]);
            const crimes = await CrimeData.find({
                'location.coordinates': {
                    $geoWithin: {
                        $box: [
                            [Math.min(...lngs), Math.min(...lats)],
                            [Math.max(...lngs), Math.max(...lats)]
                        ]
                    }
                }
            });

            // Scoring Algorithm
            // Base score 50
            let score = 50;
            score += (policeCount * 5); // Police are high weight
            score += (medicalCount * 2);
            score += (activityCount * 0.5);
            score -= (crimes.length * 10); // Crimes are heavy penalty

            // Time of day penalty (optional, assume it's night for worst-case if not specified)
            const hour = new Date().getHours();
            if (hour < 6 || hour > 20) {
                score -= 10; // Night penalty
            }

            // Women Safety Mode Multiplier
            if (womenSafetyMode) {
                score = score * 1.2; // Amplify safety weight
            }

            // Normalize score to 0-100
            score = Math.max(0, Math.min(100, score));

            let status = 'safe';
            let color = '#00e676';
            if (score < 40) { status = 'unsafe'; color = '#ff5252'; }
            else if (score < 70) { status = 'moderate'; color = '#ffab40'; }

            return {
                id: index,
                distance: (route.distance / 1000).toFixed(2), // km
                duration: Math.round(route.duration / 60), // mins
                geometry: route.geometry,
                safetyScore: Math.round(score),
                safetyStatus: status,
                safetyColor: color,
                stats: {
                    police: policeCount,
                    medical: medicalCount,
                    activity: activityCount,
                    crimes: crimes.length
                }
            };
        }));

        // 3. Sort by safety score if womenSafetyMode is on, else by duration
        if (womenSafetyMode) {
            scoredRoutes.sort((a, b) => b.safetyScore - a.safetyScore);
        } else {
            scoredRoutes.sort((a, b) => a.duration - b.duration);
        }

        res.json(scoredRoutes);

    } catch (error) {
        console.error('SafeRoute Error:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
