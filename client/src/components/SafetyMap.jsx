import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Popup, useMap } from 'react-leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';

// Component to dynamically recenter the map when location changes
function ChangeView({ center, zoom }) {
    const map = useMap();
    map.setView(center, zoom);
    return null;
}

export default function SafetyMap({ userLocation }) {
    const [insights, setInsights] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (userLocation) {
            setLoading(true);
            // Fetch mock data from our new Node backend
            axios.get(`https://knowyourcity-backend.onrender.com/api/safety/insights?lat=${userLocation.lat}&lng=${userLocation.lng}`)
                .then(res => {
                    setInsights(res.data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error('Error fetching safety data:', err);
                    setLoading(false);
                });
        }
    }, [userLocation]);

    if (!userLocation) return null;

    const getStatusColor = (status) => {
        if (status === 'red') return '#FF5252';
        if (status === 'yellow') return '#FFD740';
        return '#00E676';
    };

    return (
        <section className="map-section active" id="interactive-map">
            <div className="map-container" id="map" style={{ height: '600px', width: '100%' }}>
                <MapContainer center={[userLocation.lat, userLocation.lng]} zoom={14} style={{ height: '100%', width: '100%', zIndex: 1 }}>
                    <ChangeView center={[userLocation.lat, userLocation.lng]} zoom={14} />
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                    />

                    {insights?.zones.map(zone => (
                        <Circle
                            key={zone.id}
                            center={[zone.lat, zone.lng]}
                            radius={zone.radius}
                            pathOptions={{ fillColor: getStatusColor(zone.status), color: getStatusColor(zone.status), fillOpacity: 0.3 }}
                        >
                            <Popup>
                                <strong>{zone.status.toUpperCase()} ZONE</strong><br />
                                {zone.description}
                            </Popup>
                        </Circle>
                    ))}
                </MapContainer>
            </div>

            {/* Insights Overlay */}
            <div className="map-insights glass-card">
                <div className="insights-header">
                    <h3>Local Area Insights</h3>
                    <p>Real-time neighborhood analysis.</p>
                </div>

                {loading ? (
                    <p>Analyzing area...</p>
                ) : (
                    <>
                        <div className="insight-block">
                            <h4><span className="dot green"></span> Safest Zones Nearby</h4>
                            <p>Found {insights?.zones.filter(z => z.status === 'green').length || 0} secure areas within 5km.</p>
                        </div>

                        <div className="insight-block">
                            <h4><span className="dot red"></span> High Caution Areas</h4>
                            <p>Found {insights?.zones.filter(z => z.status === 'red').length || 0} areas with recent incidents.</p>
                        </div>

                        <div className="recent-reports">
                            <h4>Recent Reports</h4>
                            <ul id="reportsList">
                                {insights?.reports.map((r, i) => (
                                    <li key={i}>
                                        <span className="report-time">{r.time} ({r.type.toUpperCase()})</span>
                                        {r.text}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}
