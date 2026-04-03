const express = require('express');
const router = express.Router();
const CityData = require('../models/CityData');

// Authentic crime analytics from CrimeoMeter API
async function fetchCrimeData(lat, lng, distance = 10) {
    const API_KEY = process.env.CRIMEOMETER_API_KEY || 'mI9P6l4t5m7Y1z2x3c4v5b6n7m8z9a0';
    const url = `https://api.crimeometer.com/v1/get-incidents-raw?lat=${lat}&lon=${lng}&distance=${distance}km&datetime_ini=${encodeURIComponent(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())}&datetime_end=${encodeURIComponent(new Date().toISOString())}`;
    try {
        const res = await fetch(url, { headers: { 'x-api-key': API_KEY } });
        if (!res.ok) return { incidents: [] };
        return await res.json();
    } catch (e) { return { incidents: [] }; }
}

// Adaptive infrastructure fetching from OpenStreetMap (Overpass API)
async function fetchOverpassData(lat, lng, radius = 15000) {
    const r2 = Math.floor(radius * 0.7); // adaptive radius for dense items
    const query = `[out:json][timeout:35];(
        node["amenity"="police"](around:${radius},${lat},${lng});
        way["amenity"="police"](around:${radius},${lat},${lng});
        node["amenity"="hospital"](around:${radius},${lat},${lng});
        way["amenity"="hospital"](around:${radius},${lat},${lng});
        node["amenity"="clinic"](around:${r2},${lat},${lng});
        way["amenity"="clinic"](around:${r2},${lat},${lng});
        node["amenity"="fire_station"](around:${radius},${lat},${lng});
        way["amenity"="fire_station"](around:${radius},${lat},${lng});
        node["emergency"="fire_hydrant"](around:${r2},${lat},${lng});
        node["man_made"="surveillance"](around:${r2},${lat},${lng});
        way["man_made"="surveillance"](around:${r2},${lat},${lng});
        node["surveillance:type"="camera"](around:${r2},${lat},${lng});
        node["surveillance:type"="ALPR"](around:${r2},${lat},${lng});
        node["amenity"="cctv"](around:${r2},${lat},${lng});
    );out center tags 1000;`;
    try {
        const res = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'data=' + encodeURIComponent(query)
        });
        if (!res.ok) return { elements: [] };
        return await res.json();
    } catch (e) { return { elements: [] }; }
}

async function fetchTouristZones(lat, lng, radius = 15000) {
    const query = `[out:json][timeout:15];(
        node["tourism"="attraction"](around:${radius},${lat},${lng});
        node["tourism"="museum"](around:${radius},${lat},${lng});
        node["historic"](around:${radius},${lat},${lng});
        node["tourism"="viewpoint"](around:${radius},${lat},${lng});
        node["leisure"="park"](around:${radius},${lat},${lng});
    );out center tags 20;`;
    try {
        const res = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: 'data=' + encodeURIComponent(query)
        });
        if (!res.ok) return { elements: [] };
        return await res.json();
    } catch (e) { return { elements: [] }; }
}

// GET /api/safety/insights
router.get('/insights', async (req, res) => {
    try {
        const { lat, lng, city } = req.query;
        if (!lat || !lng || !city) return res.status(400).json({ message: 'Missing params' });
        const cityName = city.toLowerCase().trim();

        // 1. Check Cache
        let cachedCity = await CityData.findOne({ cityName }).catch(() => null);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        if (cachedCity && cachedCity.lastUpdated > sevenDaysAgo) {
           return res.json({ source: 'cache', safetyStats: cachedCity.safetyStats, infrastructures: cachedCity.infrastructures, recentIncidents: cachedCity.recentIncidents || [] });
        }

        console.log(`\u26A1 Persistent fetching for ${cityName}...`);
        
        // 2. Fetch Data (Adaptive Radius)
        let mainData = await fetchOverpassData(lat, lng, 15000);
        
        // Expansion logic: if we find 0 police/hospitals, retry with 30km
        const initPolice = mainData.elements?.filter(e => e.tags?.amenity === 'police').length || 0;
        const initHosp = mainData.elements?.filter(e => e.tags?.amenity === 'hospital').length || 0;
        
        if (initPolice === 0 || initHosp === 0) {
            console.log(`\u26A1 Expanding search radius to 30km for ${cityName} (insufficient initial data)...`);
            const expandedData = await fetchOverpassData(lat, lng, 30000);
            if (expandedData.elements?.length > mainData.elements?.length) {
                mainData = expandedData;
            }
        }

        const [touristData, crimeData] = await Promise.all([
            fetchTouristZones(lat, lng, 15000),
            fetchCrimeData(lat, lng, 10)
        ]);

        const infrastructures = [];
        const seenCoords = new Set();
        (mainData.elements || []).forEach(el => {
            const la = el.lat || el.center?.lat;
            const lo = el.lon || el.center?.lon;
            if (!la || !lo) return;
            const key = `${la.toFixed(5)}_${lo.toFixed(5)}`;
            if (seenCoords.has(key)) return;
            seenCoords.add(key);
            let type = '';
            if (el.tags?.amenity === 'police') type = 'police';
            else if (el.tags?.amenity === 'hospital' || el.tags?.amenity === 'clinic') type = 'hospital';
            else if (el.tags?.amenity === 'fire_station' || el.tags?.emergency === 'fire_hydrant') type = 'fire_station';
            else if (el.tags?.man_made === 'surveillance' || el.tags?.['surveillance:type'] || el.tags?.amenity === 'cctv') type = 'surveillance';
            if (type) infrastructures.push({ nodeType: type, lat: la, lng: lo, name: el.tags?.name || '' });
        });

        const incidents = crimeData?.incidents || [];
        const pCount = infrastructures.filter(i => i.nodeType === 'police').length;
        const hCount = infrastructures.filter(i => i.nodeType === 'hospital').length;
        const fCount = infrastructures.filter(i => i.nodeType === 'fire_station').length;
        const cCount = infrastructures.filter(i => i.nodeType === 'surveillance').length;

        const crimePoints = incidents.length * 2.5;
        const sSafe = Math.max(65, Math.min(99, Math.floor(88 - crimePoints + (pCount * 1.5))));
        const sFam = Math.max(65, Math.min(99, Math.floor(82 - (incidents.length * 1.5) + (hCount * 2))));
        const sWalk = Math.max(60, Math.min(99, Math.floor(84 - (incidents.length * 2) + (cCount * 1.2))));

        const safetyStats = {
            policeCount: pCount,
            hospitalCount: hCount,
            fireCount: fCount,
            cctvCount: cCount,
            crimeScore: sSafe,
            familyScore: sFam,
            walkScore: sWalk,
            crimeCount: incidents.length
        };
        const recentIncidents = incidents.slice(0, 5).map(inc => ({ type: inc.incident_offense || 'Incident', description: inc.incident_offense_description || 'Police report filed', timestamp: inc.incident_datetime || inc.incident_date }));

        // 3. Save Cache
        try {
            if (cachedCity) Object.assign(cachedCity, { safetyStats, infrastructures, recentIncidents, lastUpdated: Date.now() });
            else cachedCity = new CityData({ cityName, coordinates: { lat, lng }, safetyStats, infrastructures, recentIncidents });
            await cachedCity.save();
        } catch (e) {}

        res.json({ source: 'live', safetyStats, infrastructures, recentIncidents });
    } catch (e) { res.status(500).json({ message: 'Error' }); }
});

module.exports = router;
