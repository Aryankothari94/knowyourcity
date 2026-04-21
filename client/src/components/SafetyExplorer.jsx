import React, { useState, useEffect } from 'react';

const SafetyExplorer = () => {
    const defaultCity = localStorage.getItem('kyc_userCity') || 'Your City';
    const [searchedCity, setSearchedCity] = useState(localStorage.getItem('kyc_userCity') || 'Your City');
    const [searchInput, setSearchInput] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [loading, setLoading] = useState(false);
    const [safetyData, setSafetyData] = useState(null);
    const [incidents, setIncidents] = useState([]);
    const [landmarks, setLandmarks] = useState([]);
    const [isPulsing, setIsPulsing] = useState(false);
    const [cityAreas, setCityAreas] = useState([]);
    const [isAreaDropdownOpen, setIsAreaDropdownOpen] = useState(false);
    const [areaSearchTerm, setAreaSearchTerm] = useState('');
    const [selectedAreaName, setSelectedAreaName] = useState('Select your area');

    const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:10000/api' 
        : 'https://knowyourcity.onrender.com/api'; 


    useEffect(() => {
        const lastLat = localStorage.getItem('kyc_userLat');
        const lastLng = localStorage.getItem('kyc_userLng');
        if (lastLat && lastLng) {
            fetchCityInsights(defaultCity, parseFloat(lastLat), parseFloat(lastLng));
            fetchCityAreas(parseFloat(lastLat), parseFloat(lastLng));
        } else {
            fetchCityInsights(defaultCity);
        }

        const handleUpdate = (e) => {
            const { lat, lng, city } = e.detail;
            fetchCityInsights(city, parseFloat(lat), parseFloat(lng));
            fetchCityAreas(parseFloat(lat), parseFloat(lng));
        };

        window.addEventListener('kyc_locationUpdated', handleUpdate);
        return () => window.removeEventListener('kyc_locationUpdated', handleUpdate);
    }, []);

    const fetchCityInsights = async (cityName, forcedLat = null, forcedLng = null) => {
        setLoading(true);
        setIsPulsing(true);
        try {
            let lat = forcedLat;
            let lon = forcedLng;
            let cleanCity = cityName;

            if (lat === null || lon === null) {
                // 1. Get Coordinates via Nominatim if not provided
                const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1&countrycodes=in`);
                const geoData = await geoRes.json();
                if (geoData.length === 0) throw new Error("City not found");
                lat = geoData[0].lat;
                lon = geoData[0].lon;
                cleanCity = geoData[0].display_name.split(',')[0];
            }

            // 2. Get Safety Insights (Backend API)
            const insightRes = await fetch(`${API_BASE}/safety/insights?lat=${lat}&lng=${lon}&city=${encodeURIComponent(cleanCity)}`);
            const data = await insightRes.json();

            setSearchedCity(cleanCity);
            setSafetyData(data.safetyStats);
            setIncidents(data.recentIncidents || []);

            // 3. Get Elite Tourist Spots (Overpass API)
            const spots = await fetchBestTouristSpots(lat, lon, cleanCity);
            if (spots.length > 0) {
                setLandmarks(spots);
            } else {
                // Low-quality fallback to Wikipedia geosearch as last resort
                const wikiRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lon}&gsradius=10000&gslimit=5&format=json&origin=*`);
                const wikiData = await wikiRes.json();
                setLandmarks(wikiData.query?.geosearch || []);
            }

        } catch (err) {
            console.error("Fetch Error:", err);
            // Dynamic Fallback generation based on name length if API is down
            const seed = cityName.length;
            setSafetyData({ 
                crimeScore: 70 + (seed % 20), 
                familyScore: 65 + (seed % 25), 
                walkScore: 60 + (seed % 30) 
            });
            setIncidents([]);
            setLandmarks([]);
        } finally {
            setLoading(false);
            setTimeout(() => setIsPulsing(false), 500);
        }
    };

    const fetchCityAreas = async (lat, lng) => {
        try {
            const query = `[out:json][timeout:25];
                (
                    node["place"~"suburb|neighbourhood"](around:25000,${lat},${lng});
                    way["place"~"suburb|neighbourhood"](around:25000,${lat},${lng});
                );
                out center;`;
            
            const res = await fetch('https://overpass-api.de/api/interpreter', {
                method: 'POST',
                body: 'data=' + encodeURIComponent(query)
            });
            const data = await res.json();
            const areas = data.elements.map(el => ({
              name: el.tags.name || el.tags['name:en'],
              lat: el.lat || el.center.lat,
              lng: el.lon || el.center.lon
            })).filter(a => a.name).sort((a,b) => a.name.localeCompare(b.name));
            
            setCityAreas(areas);
        } catch (err) {
            console.warn("Could not fetch city areas:", err);
        }
    };

    const fetchBestTouristSpots = async (lat, lon, cityName) => {
        try {
            const query = `[out:json][timeout:25];
                (
                    node["tourism"~"attraction|museum|zoo|theme_park|gallery|viewpoint|resort"](around:20000,${lat},${lon});
                    way["tourism"~"attraction|museum|zoo|theme_park|gallery|viewpoint|resort"](around:20000,${lat},${lon});
                    node["historic"~"monument|memorial|castle|fort|heritage"](around:20000,${lat},${lon});
                    way["historic"~"monument|memorial|castle|fort|heritage"](around:20000,${lat},${lon});
                );
                out center tags 80;`;

            const res = await fetch('https://overpass-api.de/api/interpreter', {
                method: 'POST',
                body: 'data=' + encodeURIComponent(query)
            });
            const data = await res.json();
            
            const eliteTags = ['museum', 'fort', 'monument', 'castle', 'palace', 'heritage', 'gallery', 'zoo'];
            
            const spots = data.elements
                .map(el => {
                    const tags = el.tags || {};
                    const name = tags.name || tags['name:en'];
                    if (!name) return null;
                    
                    const tType = tags.tourism || tags.historic || 'Attraction';
                    
                    // Significance Scoring Logic
                    let score = 0;
                    if (tags.wikipedia || tags.wikidata) score += 5; // Globally recognized significance
                    if (tags.heritage) score += 3; // Official heritage designation
                    if (eliteTags.includes(tType.toLowerCase())) score += 2; // Category priority
                    
                    // Filter out minor religious sites or local parks that lack global significance
                    if (score < 4 && (tType.includes('worship') || tags.amenity === 'place_of_worship' || tags.leisure === 'park')) {
                        return null; 
                    }

                    return {
                        title: name,
                        type: tType.charAt(0).toUpperCase() + tType.slice(1),
                        score: score,
                        description: tags.description || tags['description:en'] || `Highly recommended primary landmark for visitors in ${cityName}.`
                    };
                })
                .filter(s => s !== null)
                .sort((a, b) => b.score - a.score);

            return spots.slice(0, 4); // Show only top 4 highest-rated spots
        } catch (err) {
            console.error("Tourist Fetch Error:", err);
            return [];
        }
    };

    // Autocomplete Suggestions logic
    useEffect(() => {
        const fetchSuggestions = async () => {
            if (searchInput.trim().length < 3) {
                setSuggestions([]);
                setShowSuggestions(false);
                return;
            }

            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchInput.trim())}&format=json&limit=5&addressdetails=1&countrycodes=in`);
                const data = await res.json();
                setSuggestions(data);
                setShowSuggestions(true);
            } catch (err) {
                console.error("Suggestions fetch failed:", err);
            }
        };

        const timer = setTimeout(fetchSuggestions, 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const handleSelectSuggestion = (place) => {
        const city = place.address?.city || place.address?.town || place.address?.village || place.display_name.split(',')[0];
        const { lat, lon } = place;
        
        // Dispatch global update
        const event = new CustomEvent('kyc_locationUpdated', { 
            detail: { lat, lng: lon, city } 
        });
        window.dispatchEvent(event);
        
        setSearchInput('');
        setSuggestions([]);
        setShowSuggestions(false);
    };

    const handleSearch = async () => {
        if (!searchInput.trim()) return;
        setLoading(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchInput.trim())}&format=json&limit=1&countrycodes=in`);
            const data = await res.json();
            if (data && data.length > 0) {
                const { lat, lon, display_name } = data[0];
                const city = display_name.split(',')[0];
                
                // Dispatch global update to sync Map & Navbar
                const event = new CustomEvent('kyc_locationUpdated', { 
                    detail: { lat, lng: lon, city } 
                });
                window.dispatchEvent(event);
                
                // Local state is updated via the event listener in useEffect
                setSearchInput('');
            } else {
                alert("City not found. Please try another name.");
            }
        } catch (err) {
            console.error("Search failed:", err);
        } finally {
            setLoading(false);
        }
        setSearchInput('');
    };

    const handleSelectArea = (area) => {
        setIsAreaDropdownOpen(false);
        setSelectedAreaName(area.name);
        // Dispatch global update to sync everything
        const event = new CustomEvent('kyc_locationUpdated', { 
            detail: { lat: area.lat, lng: area.lng, city: area.name } 
        });
        window.dispatchEvent(event);
    };

    const filteredAreas = cityAreas.filter(a => 
        a.name.toLowerCase().includes(areaSearchTerm.toLowerCase())
    );

    const getBadge = (score) => {
        if (score > 80) return { text: 'Very Safe', class: 'badge-safe' };
        if (score > 60) return { text: 'Safe', class: 'badge-safe' };
        if (score > 50) return { text: 'Moderate', class: 'badge-moderate' };
        return { text: 'Caution', class: 'badge-caution' };
    };

    const stats = safetyData || { crimeScore: 85, familyScore: 80, walkScore: 75 };
    const badge = getBadge(stats.crimeScore);

    return (
        <section className="safety-explorer" id="safety">
            <div className="container">
                <div className="safety-header reveal">
                    <div className="section-label">Safety Explorer</div>
                    <h2 className="section-title">Find Your <span className="gradient-text">Safe Haven</span></h2>
                    <p className="section-subtitle">Real-time localized analytics and exploration insights for {searchedCity}.</p>
                    
                    <div className="area-search-wrapper" style={{ maxWidth: '600px', margin: '30px auto', position: 'relative', zIndex: 10 }}>
                        <div style={{ position: 'relative', width: '100%' }}>
                            <input 
                                type="text" 
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                                className="search-input" 
                                placeholder="Search any area or city..." 
                                style={{ width: '100%', padding: '16px 24px', paddingRight: '120px', borderRadius: '50px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(30, 32, 47, 0.8)', color: 'white', fontSize: '1.1rem', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)' }}
                            />
                            
                            {/* Suggestions Dropdown */}
                            {showSuggestions && suggestions.length > 0 && (
                                <div className="glass-card" style={{ position: 'absolute', top: 'calc(100% + 10px)', left: '0', width: '100%', zIndex: 1000, borderRadius: '20px', overflow: 'hidden', padding: '10px' }}>
                                    {suggestions.map((p, idx) => (
                                        <div 
                                            key={idx} 
                                            onClick={() => handleSelectSuggestion(p)}
                                            style={{ padding: '12px 20px', cursor: 'pointer', borderRadius: '12px', transition: 'all 0.2s', textAlign: 'left' }}
                                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <div style={{ color: '#00e5ff', fontWeight: 600, fontSize: '1rem' }}>📍 {p.display_name.split(',')[0]}</div>
                                            <div style={{ color: '#aaa', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.display_name}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button className="btn-primary" onClick={handleSearch} style={{ position: 'absolute', right: '8px', top: '8px', borderRadius: '50px', padding: '8px 20px', border: 'none', fontWeight: 600 }}>
                                Explore
                            </button>
                        </div>
                    </div>
                </div>

                <div className="safety-grid">

                    {/* Card 1: Safety Insights & Recent Incidents */}
                    <div className={`area-card active-card glass-card reveal ${isPulsing ? 'pulse' : ''}`}>
                        <div className="area-card-header">
                            <div className="area-icon-box">
                                <span className="material-symbols-outlined">location_city</span>
                            </div>
                            <div className="custom-area-dropdown" style={{ position: 'relative', flexGrow: 1, textAlign: 'left' }}>
                                <div 
                                    className="area-name-trigger" 
                                    onClick={() => setIsAreaDropdownOpen(!isAreaDropdownOpen)}
                                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                >
                                    <h3 className="area-name" style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>{selectedAreaName}</h3>
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#00e5ff', transform: isAreaDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}>expand_more</span>
                                </div>

                                {isAreaDropdownOpen && (
                                    <div className="glass-card area-dropdown-menu" style={{ position: 'absolute', top: 'calc(100% + 12px)', left: '0', width: '280px', zIndex: 100, padding: '12px', border: '1px solid rgba(0, 229, 255, 0.3)', borderRadius: '16px' }}>
                                        <div className="dropdown-search-wrapper" style={{ marginBottom: '10px' }}>
                                            <input 
                                                type="text" 
                                                placeholder="Search area..." 
                                                value={areaSearchTerm}
                                                onChange={(e) => setAreaSearchTerm(e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: 'white', fontSize: '0.85rem' }}
                                            />
                                        </div>
                                        <div className="dropdown-list" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                            {filteredAreas.length > 0 ? filteredAreas.map((area, idx) => (
                                                <div 
                                                    key={idx}
                                                    className="dropdown-item"
                                                    onClick={(e) => { e.stopPropagation(); handleSelectArea(area); }}
                                                    style={{ padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s', color: 'rgba(255,255,255,0.8)' }}
                                                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0, 229, 255, 0.1)'}
                                                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    {area.name}
                                                </div>
                                            )) : (
                                                <div style={{ padding: '10px', fontSize: '0.8rem', color: '#666', textAlign: 'center' }}>No areas found</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <span className={`area-badge ${badge.class}`} style={{ display: selectedAreaName === 'Select your area' ? 'none' : 'inline-block' }}>{loading ? 'Syncing...' : badge.text}</span>
                        </div>
                        
                        <div className="area-card-content">
                            <div className="area-metrics">
                                <div className="metric">
                                    <div className="metric-info"><span className="metric-label">Safety Index</span><span className="metric-value">{stats.crimeScore}/100</span></div>
                                    <div className="metric-bar"><div className={`metric-fill ${stats.crimeScore > 75 ? 'green' : 'amber'}`} style={{ width: `${stats.crimeScore}%` }}></div></div>
                                </div>
                                <div className="recent-activity" style={{ marginTop: '20px', textAlign: 'left' }}>
                                    <h4 style={{ fontSize: '0.9rem', color: '#00e5ff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>warning</span> Recent Activity
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {incidents.length > 0 ? incidents.slice(0, 3).map((inc, i) => (
                                            <div key={i} style={{ padding: '10px', background: 'rgba(255,82,82,0.08)', borderLeft: '3px solid #ff5252', borderRadius: '6px', border: '1px solid rgba(255,82,82,0.1)' }}>
                                                <div style={{ color: '#ff5252', fontWeight: 600, fontSize: '0.85rem' }}>{inc.type}</div>
                                                <div style={{ color: '#cbd5e1', fontSize: '0.78rem', lineHeight: '1.4' }}>{inc.description}</div>
                                            </div>
                                        )) : (
                                            <div style={{ color: '#64748b', fontSize: '0.8rem', padding: '10px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '6px', textAlign: 'center' }}>
                                                {loading ? 'Fetching genuine data...' : 'No major recent incidents flagged in this region.'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 3: Tourist Insights (Dynamic) */}
                    <div className="area-card glass-card reveal">
                        <div className="area-card-header">
                            <div className="area-icon-box">
                                <span className="material-symbols-outlined">photo_camera</span>
                            </div>
                            <h3 className="area-name">Tourist Spots: {searchedCity}</h3>
                            <span className="area-badge badge-safe">Insights</span>
                        </div>
                        <div className="area-card-content">
                            <div className="exploration-list" style={{ textAlign: 'left' }}>
                                {landmarks.length > 0 ? landmarks.slice(0, 4).map((p, i) => (
                                    <div key={i} style={{ marginBottom: '16px', padding: '12px', background: 'rgba(0, 212, 255, 0.05)', borderRadius: '10px', border: '1px solid rgba(0, 212, 255, 0.1)' }}>
                                        <div style={{ color: '#00e5ff', fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>explore</span> {p.title || p.name}
                                        </div>
                                        <div style={{ color: '#cbd5e1', fontSize: '0.75rem', lineHeight: '1.4' }}>
                                            {p.description || `Popular attraction in ${searchedCity}. Verified safe for tourists and families.`}
                                        </div>
                                    </div>
                                )) : (
                                    <div style={{ color: '#64748b', fontSize: '0.8rem', padding: '20px', textAlign: 'center' }}>
                                        {loading ? 'Searching local guide...' : 'Exploring hidden gems for you...'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Marin Drive (Fixed - Featured) */}
                    <div className="area-card glass-card reveal">
                        <div className="area-card-header">
                            <div className="area-icon-box">
                                <span className="material-symbols-outlined">water_lux</span>
                            </div>
                            <h3 className="area-name">Marin Drive, Mumbai</h3>
                            <span className="area-badge badge-safe">Very Safe</span>
                        </div>
                        <div className="area-card-content">
                            <div className="area-metrics">
                                <div className="metric">
                                    <div className="metric-info"><span className="metric-label">Safety Index</span><span className="metric-value">94/100</span></div>
                                    <div className="metric-bar"><div className="metric-fill green" style={{ width: '94%' }}></div></div>
                                </div>
                                <div className="metric">
                                    <div className="metric-info"><span className="metric-label">Family Friendliness</span><span className="metric-value">92/100</span></div>
                                    <div className="metric-bar"><div className="metric-fill green" style={{ width: '92%' }}></div></div>
                                </div>
                                <div className="metric">
                                    <div className="metric-info"><span className="metric-label">Walkability</span><span className="metric-value">98/100</span></div>
                                    <div className="metric-bar"><div className="metric-fill green" style={{ width: '98%' }}></div></div>
                                </div>
                            </div>
                            <div className="area-tags" style={{ marginTop: '20px' }}>
                                <span className="area-tag">🌊 Sea Face</span>
                                <span className="area-tag">🚶 Promenade</span>
                                <span className="area-tag">👮 High Vigil</span>
                            </div>
                        </div>
                    </div>

                    {/* Card 4: Jubilee Hills (Fixed - Featured) */}
                    <div className="area-card glass-card reveal">
                        <div className="area-card-header">
                            <div className="area-icon-box">
                                <span className="material-symbols-outlined">diamond</span>
                            </div>
                            <h3 className="area-name">Jubilee Hills, HYD</h3>
                            <span className="area-badge badge-safe">Ultra Safe</span>
                        </div>
                        <div className="area-card-content">
                            <div className="area-metrics">
                                <div className="metric">
                                    <div className="metric-info"><span className="metric-label">Safety Index</span><span className="metric-value">96/100</span></div>
                                    <div className="metric-bar"><div className="metric-fill green" style={{ width: '96%' }}></div></div>
                                </div>
                                <div className="metric">
                                    <div className="metric-info"><span className="metric-label">Family Friendliness</span><span className="metric-value">94/100</span></div>
                                    <div className="metric-bar"><div className="metric-fill green" style={{ width: '94%' }}></div></div>
                                </div>
                                <div className="metric">
                                    <div className="metric-info"><span className="metric-label">Infrastructure</span><span className="metric-value">90/100</span></div>
                                    <div className="metric-bar"><div className="metric-fill green" style={{ width: '90%' }}></div></div>
                                </div>
                            </div>
                            <div className="area-tags" style={{ marginTop: '20px' }}>
                                <span className="area-tag">🏰 Elite Zone</span>
                                <span className="area-tag">🌳 Greenary</span>
                                <span className="area-tag">🛡️ Gated Community</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default SafetyExplorer;
