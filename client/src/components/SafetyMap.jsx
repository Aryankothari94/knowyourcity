import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, CircleMarker, Popup, useMap } from 'react-leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';

// Component to dynamically recenter the map when location changes
function ChangeView({ center, zoom }) {
    const map = useMap();
    map.setView(center, zoom);
    return null;
}

export default function SafetyMap({ userLocation, safetyInfra }) {
    const [insights, setInsights] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (userLocation) {
            setLoading(true);
            // Fetch mock data from our new Node backend
            axios.get(`https://knowyourcity.onrender.com/api/safety/insights?lat=${userLocation.lat}&lng=${userLocation.lng}`)
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
        return '#16A34A';
    };

    return (
        <section className="map-section active" id="interactive-map">
            <div className="map-container" id="map" style={{ height: '600px', width: '100%' }}>
                <MapContainer center={[userLocation.lat, userLocation.lng]} zoom={14} style={{ height: '100%', width: '100%', zIndex: 1 }}>
                    <ChangeView center={[userLocation.lat, userLocation.lng]} zoom={14} />
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
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

                    {/* Infrastructure Spots - HIGH ACCURACY */}
                    {safetyInfra.police.map((p, i) => (
                        <CircleMarker key={`p-${i}`} center={[p.lat, p.lng]} radius={6} pathOptions={{ color: '#2196f3', fillColor: '#2196f3', fillOpacity: 0.8 }}>
                            <Popup><strong>Police Station</strong><br/>{p.name}</Popup>
                        </CircleMarker>
                    ))}
                    {safetyInfra.hospitals.map((h, i) => (
                        <CircleMarker key={`h-${i}`} center={[h.lat, h.lng]} radius={6} pathOptions={{ color: '#16A34A', fillColor: '#16A34A', fillOpacity: 0.8 }}>
                            <Popup><strong>Hospital/Medical</strong><br/>{h.name}</Popup>
                        </CircleMarker>
                    ))}
                    {safetyInfra.fire.map((f, i) => (
                        <CircleMarker key={`f-${i}`} center={[f.lat, f.lng]} radius={6} pathOptions={{ color: '#ff9800', fillColor: '#ff9800', fillOpacity: 0.8 }}>
                            <Popup><strong>Fire Station</strong><br/>{f.name}</Popup>
                        </CircleMarker>
                    ))}
                    {safetyInfra.cctv.map((c, i) => (
                        <CircleMarker key={`c-${i}`} center={[c.lat, c.lng]} radius={4} pathOptions={{ color: '#9c27b0', fillColor: '#9c27b0', fillOpacity: 0.8 }}>
                            <Popup><strong>CCTV Node</strong><br/>Surveillance Active</Popup>
                        </CircleMarker>
                    ))}
                </MapContainer>
            </div>

            {/* Insights Overlay */}
            <div className="map-insights glass-card">
                <div className="insights-header">
                    <h3>Localized Safety Assets</h3>
                    <p>Found {safetyInfra.police.length + safetyInfra.hospitals.length + safetyInfra.fire.length + safetyInfra.cctv.length} verified safety nodes in {localStorage.getItem('kyc_userCity') || 'the city'}.</p>
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
