import React, { useState, useEffect } from 'react';
import SafetyMap from './components/SafetyMap';
import Features from './components/Features';
import SafetyExplorer from './components/SafetyExplorer';
import Testimonials from './components/Testimonials';
import Footer from './components/Footer';
import AuthModals from './components/AuthModals';
import './index.css';

function App() {
  const [userLocation, setUserLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);

  // Auth State
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Infrastructure Data (Shared across Explorer and Map)
  const [safetyInfra, setSafetyInfra] = useState({
    police: [],
    hospitals: [],
    fire: [],
    cctv: [],
    counts: { police: 0, hospitals: 0, fire: 0, cctv: 0 }
  });
  const [infraLoading, setInfraLoading] = useState(false);
  
  // Navigation & Location State
  const [userCity, setUserCity] = useState(localStorage.getItem('kyc_userCity') || 'Detecting...');
  const [weatherTemp, setWeatherTemp] = useState('--°C');

  // Login handler
  const handleLoginSuccess = (name) => {
    setIsLoggedIn(true);
    setUserName(name);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 4000); // 4 seconds animation
  };

  // Trigger HTML5 Geolocation
  const handleExploreClick = (e) => {
    e.preventDefault();
    if (!isLoggedIn) {
      setIsAuthOpen(true);
      return;
    }

    setLoadingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLoadingLocation(false);
          // Scroll to map smoothly
          setTimeout(() => {
            const mapEl = document.getElementById('interactive-map');
            if (mapEl) mapEl.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Couldn't access location. Using default city center.");
          setUserLocation({ lat: 18.5204, lng: 73.8567 }); // Default: Pune
          setLoadingLocation(false);
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
      setLoadingLocation(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Dropdown Toggles (Direct DOM control to match existing styles)
  const toggleLocationDropdown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const dropdown = document.getElementById('locationDropdown');
    const other = document.getElementById('weatherDropdown');
    if (other) other.classList.remove('active');
    if (dropdown) dropdown.classList.toggle('active');
  };

  const toggleWeatherDropdown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const dropdown = document.getElementById('weatherDropdown');
    const other = document.getElementById('locationDropdown');
    if (other) other.classList.remove('active');
    if (dropdown) dropdown.classList.toggle('active');
  };

  // Fetch City Infrastructure (High Accuracy City-Wide Search)
  const fetchCityInfra = async (lat, lng) => {
    setInfraLoading(true);
    try {
      const radius = 50000; // 50km for city-wide accuracy
      const query = `[out:json][timeout:30];
        (
          node["amenity"="police"](around:${radius},${lat},${lng});
          way["amenity"="police"](around:${radius},${lat},${lng});
          node["amenity"="hospital"](around:${radius},${lat},${lng});
          way["amenity"="hospital"](around:${radius},${lat},${lng});
          node["amenity"="fire_station"](around:${radius},${lat},${lng});
          way["amenity"="fire_station"](around:${radius},${lat},${lng});
          node["man_made"="surveillance"](around:${radius},${lat},${lng});
        );
        out center;`;

      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: 'data=' + encodeURIComponent(query)
      });
      const data = await res.json();
      
      const infra = {
        police: [],
        hospitals: [],
        fire: [],
        cctv: [],
        counts: { police: 0, hospitals: 0, fire: 0, cctv: 0 }
      };

      data.elements.forEach(el => {
        const type = el.tags.amenity || el.tags.man_made;
        const pos = { lat: el.lat || el.center?.lat, lng: el.lon || el.center?.lon, name: el.tags.name || 'Facility' };
        
        if (type === 'police') { infra.police.push(pos); infra.counts.police++; }
        else if (type === 'hospital') { infra.hospitals.push(pos); infra.counts.hospitals++; }
        else if (type === 'fire_station') { infra.fire.push(pos); infra.counts.fire++; }
        else if (type === 'surveillance') { infra.cctv.push(pos); infra.counts.cctv++; }
      });

      setSafetyInfra(infra);
    } catch (err) {
      console.error("Infra Fetch Error:", err);
    } finally {
      setInfraLoading(false);
    }
  };

  // Sync city name from local storage periodically (Backup)
  useEffect(() => {
    const interval = setInterval(() => {
      const city = localStorage.getItem('kyc_userCity');
      if (city && city !== userCity) setUserCity(city);
      
      const temp = localStorage.getItem('kyc_weatherTemp');
      if (temp && temp !== weatherTemp) setWeatherTemp(temp);
    }, 2000);
    return () => clearInterval(interval);
  }, [userCity, weatherTemp]);

  // Reactive Global Location Update Listener
  useEffect(() => {
    const handleGlobalUpdate = (e) => {
      const { lat, lng, city } = e.detail;
      setUserCity(city);
      setUserLocation({ lat: parseFloat(lat), lng: parseFloat(lng) });
      fetchCityInfra(parseFloat(lat), parseFloat(lng));
      
      // Auto-scroll to map if it's a manual selection
      setTimeout(() => {
        const mapEl = document.getElementById('interactive-map') || document.getElementById('safety-map');
        if (mapEl) mapEl.scrollIntoView({ behavior: 'smooth' });
      }, 500);
    };

    window.addEventListener('kyc_locationUpdated', handleGlobalUpdate);
    return () => window.removeEventListener('kyc_locationUpdated', handleGlobalUpdate);
  }, []);

  return (
    <div className="App">
      {/* ===== LOGIN TOAST ====== */}
      <div id="loginToast" className={`login-toast glass-card ${showToast ? 'show' : ''}`}>
        <div className="toast-icon">✨</div>
        <div className="toast-content">
          <h4 id="toastTitle">Welcome, {userName}!</h4>
          <p>Your safety is our priority. Explore confidently.</p>
        </div>
      </div>

      {/* Background Orbs */}
      <div className="bg-orbs" aria-hidden="true">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>

      {/* ===== NAVBAR ===== */}
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`} id="navbar">
        <div className="container">
          <a href="#" className="nav-brand">
            <div className="nav-brand-icon">🏙️</div>
            <div className="nav-brand-text">Know<span>Your</span>City</div>
          </a>
          <ul className={`nav-links ${menuOpen ? 'open' : ''}`} id="navLinks">
            <li><a href="#features" className="active">Features</a></li>
            <li><a href="#safety">Safety</a></li>
            <li><a href="#how-it-works">How It Works</a></li>
            <li><a href="#testimonials">Stories</a></li>

            {isLoggedIn ? (
              <li className="account-nav-item" style={{ display: 'flex' }}>
                <div className="user-greeting">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <span id="accountName" style={{ marginLeft: '6px' }}>Hello, {userName}</span>
                </div>
                <button onClick={() => setIsLogoutOpen(true)} className="nav-logout-icon" title="Logout">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                </button>
              </li>
            ) : (
              <li>
                <a href="#" className="nav-login" onClick={(e) => { e.preventDefault(); setIsAuthOpen(true); setMenuOpen(false); }}>Login</a>
              </li>
            )}

            {/* Desktop-Only Location/Weather Badges */}
            {isLoggedIn && (
              <>
                <li className="location-badge desktop-only" onClick={toggleLocationDropdown}>
                  <span>📍</span> {userCity}
                </li>
                <li className="weather-badge desktop-only" onClick={toggleWeatherDropdown}>
                  <span>🌡️</span> {weatherTemp}
                </li>
              </>
            )}

            <li><a href="#newsletter" className="nav-cta">Get Started</a></li>

            {/* Mobile-Only Dashboard (Visible inside hamburger) */}
            <div className="mobile-dashboard mobile-only">
               <div style={{ padding: '20px 0', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '20px' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Quick Settings</p>
                  
                  <div className="mobile-widget-card" onClick={toggleLocationDropdown}>
                    <div className="mobile-widget-icon">📍</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{userCity}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tap to change location</div>
                    </div>
                  </div>

                  <div className="mobile-widget-card" onClick={toggleWeatherDropdown}>
                    <div className="mobile-widget-icon">🌡️</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{weatherTemp}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Check hourly forecast</div>
                    </div>
                  </div>
               </div>
            </div>
          </ul>

          <button
            className={`hamburger ${menuOpen ? 'active' : ''}`}
            id="hamburger"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="hero" id="hero">
        <div className="container">
          <div className="hero-content reveal visible">
            <div className="hero-badge">
              <span className="dot"></span>
              Trusted by 10,000+ Newcomers
            </div>
            <h1 className="hero-title">
              Your City,<br /><span className="gradient-text">Decoded.</span>
            </h1>
            <p className="hero-subtitle">
              Moving to a new city? We help you find safe neighborhoods, family-friendly areas, and local insights so you
              can settle in with confidence.
            </p>
            <div className="hero-cta-group">
              <a href="#safety" className="btn-primary" onClick={handleExploreClick}>
                {loadingLocation ? 'Locating...' : 'Explore Safe Areas'}
                <span>→</span>
              </a>
              <a href="#how-it-works" className="btn-secondary">
                <span>▶</span>
                How It Works
              </a>
            </div>
            <div className="hero-stats">
              <div className="hero-stat">
                <h3>150+</h3>
                <p>Cities Covered</p>
              </div>
              <div className="hero-stat">
                <h3>2.5K+</h3>
                <p>Areas Analyzed</p>
              </div>
              <div className="hero-stat">
                <h3>98%</h3>
                <p>Accuracy Rate</p>
              </div>
            </div>
          </div>
          <div className="hero-visual reveal visible">
            <div className="hero-city-graphic">
              <div className="city-ring city-ring-1"></div>
              <div className="city-ring city-ring-2"></div>
              <div className="city-ring city-ring-3"></div>
              <div className="city-center-icon">🏙️</div>

              <div className="floating-card fc-1">
                <div className="icon-circle">🛡️</div>
                <span>Safe Zone</span>
              </div>
              <div className="floating-card fc-2">
                <div className="icon-circle">🏫</div>
                <span>Top Schools</span>
              </div>
              <div className="floating-card fc-3">
                <div className="icon-circle">🌳</div>
                <span>Parks Nearby</span>
              </div>
              <div className="floating-card fc-4">
                <div className="icon-circle">🚇</div>
                <span>Metro Access</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Map (Rendered conditionally) */}
      {userLocation && (
        <SafetyMap userLocation={userLocation} safetyInfra={safetyInfra} />
      )}

      {/* ===== REMAINING SECTIONS ===== */}
      <Features />
      <SafetyExplorer safetyInfra={safetyInfra} infraLoading={infraLoading} />
      <Testimonials />
      <Footer />

      {/* ===== AUTH MODALS ===== */}
      <AuthModals
        isAuthOpen={isAuthOpen}
        closeAuth={() => setIsAuthOpen(false)}
        isLogoutOpen={isLogoutOpen}
        closeLogout={() => setIsLogoutOpen(false)}
        onLoginSuccess={(name) => {
          setIsLoggedIn(true);
          setUserName(name);
        }}
        onLogoutConfirm={() => {
          setIsLoggedIn(false);
          setUserName('');
          setIsLogoutOpen(false);
        }}
      />
    </div>
  );
}

export default App;
