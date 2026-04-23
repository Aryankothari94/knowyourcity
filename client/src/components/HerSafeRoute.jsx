import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Helper to fit map bounds
function ChangeView({ bounds }) {
    const map = useMap();
    if (bounds) map.fitBounds(bounds, { padding: [50, 50] });
    return null;
}

const HerSafeRoute = () => {
    const [origin, setOrigin] = useState('');
    const [destination, setDestination] = useState('');
    const [womenSafetyMode, setWomenSafetyMode] = useState(true);
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [mapBounds, setMapBounds] = useState(null);
    const [originCoords, setOriginCoords] = useState(null);
    const [destCoords, setDestCoords] = useState(null);

    const API_BASE = window.location.hostname === 'localhost' 
        ? 'http://localhost:10000/api' 
        : 'https://knowyourcity.onrender.com/api';

    const geocode = async (query) => {
        const res = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=in`);
        if (res.data && res.data.length > 0) {
            return {
                lat: parseFloat(res.data[0].lat),
                lng: parseFloat(res.data[0].lon),
                display_name: res.data[0].display_name
            };
        }
        return null;
    };

    const handleFindRoute = async (e) => {
        e.preventDefault();
        setLoading(true);
        setRoutes([]);

        try {
            const start = await geocode(origin);
            const end = await geocode(destination);

            if (!start || !end) {
                alert("Could not find locations. Please be more specific.");
                setLoading(false);
                return;
            }

            setOriginCoords(start);
            setDestCoords(end);

            const res = await axios.post(`${API_BASE}/saferoute/directions`, {
                origin: start,
                destination: end,
                womenSafetyMode
            });

            setRoutes(res.data);

            // Calculate bounds
            const allCoords = res.data.flatMap(r => r.geometry.coordinates.map(c => [c[1], c[0]]));
            if (allCoords.length > 0) {
                setMapBounds(allCoords);
            }

        } catch (err) {
            console.error("Route finding error:", err);
            alert("Error finding routes. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="hersaferoute-page">
            <div className="container">
                <div className="route-header">
                    <h1 className="gradient-text">HerSafeRoute</h1>
                    <p className="subtitle">Women-First Navigation prioritizes your safety over time.</p>
                </div>

                <div className="route-layout">
                    {/* Sidebar */}
                    <div className="route-sidebar glass-card">
                        <form onSubmit={handleFindRoute}>
                            <div className="form-group">
                                <label>Current Location / Origin</label>
                                <input 
                                    type="text" 
                                    value={origin} 
                                    onChange={(e) => setOrigin(e.target.value)}
                                    placeholder="Enter start location..." 
                                    required 
                                />
                            </div>
                            <div className="form-group">
                                <label>Destination</label>
                                <input 
                                    type="text" 
                                    value={destination} 
                                    onChange={(e) => setDestination(e.target.value)}
                                    placeholder="Enter destination..." 
                                    required 
                                />
                            </div>
                            
                            <div className="toggle-group">
                                <label className="switch">
                                    <input 
                                        type="checkbox" 
                                        checked={womenSafetyMode} 
                                        onChange={() => setWomenSafetyMode(!womenSafetyMode)} 
                                    />
                                    <span className="slider round"></span>
                                </label>
                                <span>Women Safety Mode {womenSafetyMode ? 'ON' : 'OFF'}</span>
                            </div>

                            <button type="submit" className="btn-primary" disabled={loading}>
                                {loading ? 'Analyzing Routes...' : 'Calculate Safest Path'}
                            </button>
                        </form>

                        <div className="results-list">
                            {routes.map((route, idx) => (
                                <div key={route.id} className={`route-card ${idx === 0 ? 'recommended' : ''}`}>
                                    <div className="route-card-header">
                                        <span className="safety-badge" style={{ backgroundColor: route.safetyColor }}>
                                            {route.safetyStatus.toUpperCase()}
                                        </span>
                                        <span className="time">{route.duration} mins</span>
                                    </div>
                                    <h3>Route {idx + 1} {idx === 0 && ' (Best for Safety)'}</h3>
                                    <div className="route-stats">
                                        <div className="stat">🚔 {route.stats.police} Police</div>
                                        <div className="stat">🏥 {route.stats.medical} Medical</div>
                                        <div className="stat">🏪 {route.stats.activity} Active Spots</div>
                                    </div>
                                    <div className="safety-score-bar">
                                        <div 
                                            className="fill" 
                                            style={{ width: `${route.safetyScore}%`, backgroundColor: route.safetyColor }}
                                        ></div>
                                    </div>
                                    <p className="score-text">Safety Score: {route.safetyScore}/100</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Map Area */}
                    <div className="route-map-container glass-card">
                        <MapContainer 
                            center={[20.5937, 78.9629]} 
                            zoom={5} 
                            style={{ height: '100%', width: '100%', borderRadius: '16px' }}
                        >
                            <TileLayer
                                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                            />
                            
                            {routes.map((route, idx) => (
                                <Polyline 
                                    key={route.id}
                                    positions={route.geometry.coordinates.map(c => [c[1], c[0]])}
                                    color={route.safetyColor}
                                    weight={idx === 0 ? 6 : 3}
                                    opacity={idx === 0 ? 1 : 0.5}
                                >
                                    <Popup>
                                        <strong>Route {idx + 1}</strong><br />
                                        Safety Score: {route.safetyScore}<br />
                                        Distance: {route.distance} km
                                    </Popup>
                                </Polyline>
                            ))}

                            {originCoords && (
                                <Marker position={[originCoords.lat, originCoords.lng]}>
                                    <Popup>Origin: {originCoords.display_name}</Popup>
                                </Marker>
                            )}
                            {destCoords && (
                                <Marker position={[destCoords.lat, destCoords.lng]}>
                                    <Popup>Destination: {destCoords.display_name}</Popup>
                                </Marker>
                            )}

                            <ChangeView bounds={mapBounds} />
                        </MapContainer>
                    </div>
                </div>
            </div>

            <style>{`
                .hersaferoute-page {
                    padding: 40px 0;
                    min-height: 80vh;
                    background: var(--bg-primary);
                }
                .route-header {
                    text-align: center;
                    margin-bottom: 40px;
                }
                .route-header h1 {
                    font-size: 3rem;
                    margin-bottom: 10px;
                }
                .route-layout {
                    display: grid;
                    grid-template-columns: 400px 1fr;
                    gap: 30px;
                    height: 700px;
                }
                .route-sidebar {
                    padding: 24px;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                .route-map-container {
                    padding: 10px;
                    height: 100%;
                }
                .form-group {
                    margin-bottom: 15px;
                }
                .form-group label {
                    display: block;
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                    margin-bottom: 6px;
                }
                .form-group input {
                    width: 100%;
                    padding: 12px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                    color: white;
                    outline: none;
                }
                .form-group input:focus {
                    border-color: var(--accent-cyan);
                }
                .toggle-group {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    margin: 10px 0 20px;
                    font-size: 0.9rem;
                    color: var(--text-primary);
                }
                .results-list {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }
                .route-card {
                    padding: 16px;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 12px;
                    transition: all 0.3s ease;
                }
                .route-card.recommended {
                    border-color: #ff007a;
                    background: rgba(255, 0, 122, 0.05);
                }
                .route-card-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 10px;
                }
                .safety-badge {
                    padding: 4px 10px;
                    border-radius: 20px;
                    font-size: 0.7rem;
                    font-weight: 800;
                    color: white;
                }
                .route-stats {
                    display: flex;
                    gap: 15px;
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                    margin: 10px 0;
                }
                .safety-score-bar {
                    height: 6px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 3px;
                    overflow: hidden;
                    margin-top: 15px;
                }
                .safety-score-bar .fill {
                    height: 100%;
                    transition: width 1s ease;
                }
                .score-text {
                    font-size: 0.75rem;
                    text-align: right;
                    margin-top: 5px;
                    color: var(--text-muted);
                }

                /* Switch styling */
                .switch {
                    position: relative;
                    display: inline-block;
                    width: 46px;
                    height: 24px;
                }
                .switch input { opacity: 0; width: 0; height: 0; }
                .slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background-color: #333;
                    transition: .4s;
                }
                .slider:before {
                    position: absolute;
                    content: "";
                    height: 18px; width: 18px;
                    left: 3px; bottom: 3px;
                    background-color: white;
                    transition: .4s;
                }
                input:checked + .slider { background-color: #ff007a; }
                input:checked + .slider:before { transform: translateX(22px); }
                .slider.round { border-radius: 24px; }
                .slider.round:before { border-radius: 50%; }

                @media (max-width: 900px) {
                    .route-layout { grid-template-columns: 1fr; height: auto; }
                    .route-map-container { height: 400px; }
                }
            `}</style>
        </div>
    );
};

export default HerSafeRoute;
