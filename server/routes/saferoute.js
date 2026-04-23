const express = require('express');
const router = express.Router();
const CrimeData = require('../models/CrimeData');
const SafeRouteFeedback = require('../models/SafeRouteFeedback');

// Helper to fetch safety infrastructure from Overpass (Police/Hospitals)
// Helper to fetch safety infrastructure from Overpass (Police/Hospitals/Lighting)
async function fetchSafetyAssets(coords) {
    const lats = coords.map(c => c[0]);
    const lngs = coords.map(c => c[1]);
    
    // Create a bounding box for the entire route with a small buffer
    const buffer = 0.01; // ~1km
    const minLat = Math.min(...lats) - buffer;
    const maxLat = Math.max(...lats) + buffer;
    const minLng = Math.min(...lngs) - buffer;
    const maxLng = Math.max(...lngs) + buffer;
    const bbox = `${minLat},${minLng},${maxLat},${maxLng}`;

    // Comprehensive query for safety-relevant infrastructure in India
    const query = `[out:json][timeout:30];
        (
          node["amenity"="police"](${bbox});
          node["police"~"pink|women|booth"](${bbox});
          node["amenity"~"hospital|clinic|pharmacy"](${bbox});
          node["amenity"~"cafe|restaurant|shop|convenience|bank|atm"](${bbox});
          node["lit"="yes"](${bbox});
          way["highway"~"primary|secondary|tertiary|residential"]["lit"="yes"](${bbox});
          node["amenity"="social_facility"]["social_facility:for"="woman"](${bbox});
          node["emergency"="phone"](${bbox});
        );out center tags 1000;`;
    
    try {
        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: 'data=' + encodeURIComponent(query),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        
        if (!response.ok) {
            // Fallback: If bbox is too complex, try a simpler radius search around the center
            const centerLat = (minLat + maxLat) / 2;
            const centerLng = (minLng + maxLng) / 2;
            const radius = 5000;
            const fallbackQuery = `[out:json][timeout:15];(node["amenity"~"police|hospital"](around:${radius},${centerLat},${centerLng}););out center tags 100;`;
            const fbRes = await fetch('https://overpass-api.de/api/interpreter', {
                method: 'POST',
                body: 'data=' + encodeURIComponent(fallbackQuery),
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            const fbData = await fbRes.json();
            return fbData.elements || [];
        }

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
            let activityCount = 0; 
            let litCount = 0;
            let womenSafetyPoints = 0;

            assets.forEach(asset => {
                const tags = asset.tags;
                if (tags.amenity === 'police' || tags.police) policeCount++;
                else if (tags.amenity === 'hospital' || tags.amenity === 'clinic') medicalCount++;
                else if (tags.amenity === 'cafe' || tags.amenity === 'restaurant' || tags.amenity === 'shop' || tags.amenity === 'convenience') activityCount++;
                
                if (tags.lit === 'yes') litCount++;
                if (tags.women === 'yes' || tags["social_facility:for"] === 'woman' || (tags.police && tags.police.includes('pink'))) womenSafetyPoints++;
            });

            // Enhanced Crime Data Query with buffer
            const buffer = 0.005; // ~500m
            const crimes = await CrimeData.find({
                'location.coordinates': {
                    $geoWithin: {
                        $box: [
                            [Math.min(...lngs) - buffer, Math.min(...lats) - buffer],
                            [Math.max(...lngs) + buffer, Math.max(...lats) + buffer]
                        ]
                    }
                }
            });

            // Scoring Algorithm
            let score = 40; // Base score
            score += (policeCount * 6);
            score += (medicalCount * 2);
            score += (activityCount * 0.8);
            score += (litCount * 3);
            score += (womenSafetyPoints * 10);
            score -= (crimes.length * 15);

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
                    crimes: crimes.length,
                    lighting: litCount,
                    womenPoints: womenSafetyPoints
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
