import React, { useState, useEffect } from 'react';

const SafetyExplorer = () => {

    const defaultCity = localStorage.getItem('kyc_userCity') || 'Your Area';
    const [searchedCity, setSearchedCity] = useState(defaultCity);
    const [searchInput, setSearchInput] = useState('');
    const [dynamicMetrics, setDynamicMetrics] = useState({ sSafe: 85, sFam: 80, sWalk: 75 });
    const [isPulsing, setIsPulsing] = useState(false);

    useEffect(() => {
        // Replicate vanilla Metric Bar Animation
        const metricFills = document.querySelectorAll('.metric-fill');
        const metricObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const fill = entry.target;
                    const width = fill.getAttribute('data-width');
                    fill.style.width = width + '%';
                    metricObserver.unobserve(fill);
                }
            });
        }, { threshold: 0.3 });

        metricFills.forEach(el => metricObserver.observe(el));

        return () => metricObserver.disconnect();
    }, []);

    useEffect(() => {
        generateMetrics(defaultCity);
    }, []);

    const generateMetrics = (areaName) => {
        const base = (areaName.length * 7) % 30;
        const sSafe = 60 + base;
        const sFam = 65 + (base % 20);
        const sWalk = 50 + (base % 40);
        setDynamicMetrics({ sSafe, sFam, sWalk });
        setSearchedCity(areaName);
        
        setIsPulsing(true);
        setTimeout(() => setIsPulsing(false), 500);
    };

    const handleSearch = () => {
        if (!searchInput.trim()) return;
        generateMetrics(searchInput.trim());
        setSearchInput('');
    };

    const getBadge = (score) => {
        if (score > 80) return { text: 'Very Safe', class: 'badge-safe' };
        if (score > 60) return { text: 'Safe', class: 'badge-safe' };
        if (score > 50) return { text: 'Moderate', class: 'badge-moderate' };
        return { text: 'Caution', class: 'badge-caution' };
    };

    const getColor = (score) => score > 75 ? 'green' : score > 50 ? 'amber' : 'red';

    const cityBadge = getBadge(dynamicMetrics.sSafe);

    return (
        <section className="safety-explorer" id="safety">
            <div className="container">
                <div className="safety-header reveal">
                    <div className="section-label">Safety Explorer</div>
                    <h2 className="section-title">Find Your <span className="gradient-text">Safe Haven</span></h2>
                    <p className="section-subtitle">Explore areas with detailed safety ratings, amenities, and community insights.</p>
                    
                    {/* Area Search Bar */}
                    <div className="area-search-wrapper" style={{ maxWidth: '600px', margin: '30px auto', position: 'relative', zIndex: 10 }}>
                        <input 
                            type="text" 
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="search-input" 
                            placeholder="Search any neighborhood (e.g. Bandra, Mumbai)..." 
                            style={{ width: '100%', padding: '16px 24px', paddingRight: '120px', borderRadius: '50px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(30, 32, 47, 0.8)', color: 'white', fontSize: '1.1rem', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)' }}
                        />
                        <button className="btn-primary" onClick={handleSearch} style={{ position: 'absolute', right: '8px', top: '8px', borderRadius: '50px', padding: '8px 20px', border: 'none', fontWeight: 600 }}>Explore</button>
                    </div>
                </div>

                <div className="safety-grid" style={{ flexWrap: 'nowrap', display: 'flex' }}>

                    {/* Dynamic User City Card */}
                    <div className={`area-card active-card glass-card reveal`} style={{ transition: 'all 0.4s ease' }}>
                        <div className="area-card-header">
                            <div className="area-icon-box">
                                <span className="material-symbols-outlined">location_city</span>
                            </div>
                            <h3 className="area-name">{searchedCity}</h3>
                            <span className={`area-badge ${cityBadge.class}`}>{cityBadge.text}</span>
                        </div>
                        
                        <div className="area-card-content">
                            <div className="area-metrics">
                                <div className="metric">
                                    <div className="metric-info">
                                        <span className="metric-label">Safety Score</span>
                                        <span className="metric-value">{dynamicMetrics.sSafe}/100</span>
                                    </div>
                                    <div className="metric-bar">
                                        <div className={`metric-fill ${getColor(dynamicMetrics.sSafe)}`} style={{ width: `${dynamicMetrics.sSafe}%` }}></div>
                                    </div>
                                </div>
                                <div className="metric">
                                    <div className="metric-info">
                                        <span className="metric-label">Family Friendly</span>
                                        <span className="metric-value">{dynamicMetrics.sFam}/100</span>
                                    </div>
                                    <div className="metric-bar">
                                        <div className={`metric-fill ${getColor(dynamicMetrics.sFam)}`} style={{ width: `${dynamicMetrics.sFam}%` }}></div>
                                    </div>
                                </div>
                                <div className="metric">
                                    <div className="metric-info">
                                        <span className="metric-label">Walkability</span>
                                        <span className="metric-value">{dynamicMetrics.sWalk}/100</span>
                                    </div>
                                    <div className="metric-bar">
                                        <div className={`metric-fill ${getColor(dynamicMetrics.sWalk)}`} style={{ width: `${dynamicMetrics.sWalk}%` }}></div>
                                    </div>
                                </div>
                            </div>
                            <div className="area-tags" style={{ marginTop: '20px' }}>
                                <span className="area-tag">🌳 Parks</span>
                                <span className="area-tag">🏫 Schools</span>
                                <span className="area-tag">🏥 Hospital</span>
                                <span className="area-tag">🛒 Market</span>
                            </div>
                        </div>
                    </div>

                    {/* Area Card 2 */}
                    <div className="area-card glass-card reveal">
                        <div className="area-card-header">
                            <div className="area-icon-box">
                                <span className="material-symbols-outlined">waves</span>
                            </div>
                            <h3 className="area-name">Marine Drive, Mumbai</h3>
                            <span className="area-badge badge-safe">Very Safe</span>
                        </div>
                        <div className="area-card-content">
                            <div className="area-metrics">
                                <div className="metric">
                                    <div className="metric-info"><span className="metric-label">Safety Score</span><span className="metric-value">96/100</span></div>
                                    <div className="metric-bar"><div className="metric-fill green" style={{ width: '96%' }}></div></div>
                                </div>
                                <div className="metric">
                                    <div className="metric-info"><span className="metric-label">Family Friendly</span><span className="metric-value">90/100</span></div>
                                    <div className="metric-bar"><div className="metric-fill green" style={{ width: '90%' }}></div></div>
                                </div>
                                <div className="metric">
                                    <div className="metric-info"><span className="metric-label">Walkability</span><span className="metric-value">98/100</span></div>
                                    <div className="metric-bar"><div className="metric-fill green" style={{ width: '98%' }}></div></div>
                                </div>
                            </div>
                            <div className="area-tags" style={{ marginTop: '20px' }}>
                                <span className="area-tag">🌊 Seaface</span>
                                <span className="area-tag">🍽️ Dining</span>
                                <span className="area-tag">🏛️ Heritage</span>
                                <span className="area-tag">👮 High Patrolling</span>
                            </div>
                        </div>
                    </div>

                    {/* Area Card 3 */}
                    <div className="area-card glass-card reveal">
                        <div className="area-card-header">
                            <div className="area-icon-box">
                                <span className="material-symbols-outlined">forest</span>
                            </div>
                            <h3 className="area-name">Koregaon Park, Pune</h3>
                            <span className="area-badge badge-safe">Safe</span>
                        </div>
                        <div className="area-card-content">
                            <div className="area-metrics">
                                <div className="metric">
                                    <div className="metric-info"><span className="metric-label">Safety Score</span><span className="metric-value">88/100</span></div>
                                    <div className="metric-bar"><div className="metric-fill green" style={{ width: '88%' }}></div></div>
                                </div>
                                <div className="metric">
                                    <div className="metric-info"><span className="metric-label">Family Friendly</span><span className="metric-value">85/100</span></div>
                                    <div className="metric-bar"><div className="metric-fill green" style={{ width: '85%' }}></div></div>
                                </div>
                                <div className="metric">
                                    <div className="metric-info"><span className="metric-label">Walkability</span><span className="metric-value">92/100</span></div>
                                    <div className="metric-bar"><div className="metric-fill green" style={{ width: '92%' }}></div></div>
                                </div>
                            </div>
                            <div className="area-tags" style={{ marginTop: '20px' }}>
                                <span className="area-tag">🌳 Greens</span>
                                <span className="area-tag">☕ Cafes</span>
                                <span className="area-tag">🛍️ Boutiques</span>
                                <span className="area-tag">🛡️ Premium</span>
                            </div>
                        </div>
                    </div>

                    {/* Area Card 4 */}
                    <div className="area-card glass-card reveal">
                        <div className="area-card-header">
                            <div className="area-icon-box">
                                <span className="material-symbols-outlined">cottage</span>
                            </div>
                            <h3 className="area-name">Jubilee Hills, Hyderabad</h3>
                            <span className="area-badge badge-safe">Safe</span>
                        </div>
                        <div className="area-card-content">
                            <div className="area-metrics">
                                <div className="metric">
                                    <div className="metric-info"><span className="metric-label">Safety Score</span><span className="metric-value">94/100</span></div>
                                    <div className="metric-bar"><div className="metric-fill green" style={{ width: '94%' }}></div></div>
                                </div>
                                <div className="metric">
                                    <div className="metric-info"><span className="metric-label">Family Friendly</span><span className="metric-value">96/100</span></div>
                                    <div className="metric-bar"><div className="metric-fill green" style={{ width: '96%' }}></div></div>
                                </div>
                                <div className="metric">
                                    <div className="metric-info"><span className="metric-label">Walkability</span><span className="metric-value">60/100</span></div>
                                    <div className="metric-bar"><div className="metric-fill amber" style={{ width: '60%' }}></div></div>
                                </div>
                            </div>
                            <div className="area-tags" style={{ marginTop: '20px' }}>
                                <span className="area-tag">🛡️ Security</span>
                                <span className="area-tag">🏙️ Luxury</span>
                                <span className="area-tag">🌳 Premium</span>
                                <span className="area-tag">🎓 Education</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default SafetyExplorer;
