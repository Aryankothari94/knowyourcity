/**
 * navigation.js
 * Shared utility for location detection, searching, and weather fetching.
 * Exposes functions to window for global access (dropdowns outside React root).
 */

export const initNavigation = () => {
    
    // Weather Logic
    window.kycFetchWeather = async (lat, lng) => {
        try {
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&hourly=temperature_2m,weathercode,is_day&past_days=1&forecast_days=2&timezone=auto`);
            const wData = await res.json();
            
            const hourlyList = document.getElementById('hourlyWeatherList');
            const weatherTempEl = document.getElementById('weatherTemp');
            const mobileWeatherTempEl = document.getElementById('mobileWeatherTemp');

            if (wData && wData.current_weather) {
                const temp = `${Math.round(wData.current_weather.temperature)}°C`;
                if (weatherTempEl) weatherTempEl.textContent = temp;
                if (mobileWeatherTempEl) mobileWeatherTempEl.textContent = temp;
                
                // Update React state if needed via localStorage event or direct call
                localStorage.setItem('kyc_weatherTemp', temp);

                const iconMap = (c, isDay) => {
                    if (c === 0) return isDay ? '☀️' : '🌙';
                    if (c <= 3) return isDay ? '⛅' : '☁️';
                    if (c <= 48) return '🌫️';
                    if (c <= 67) return '🌧️';
                    if (c <= 77) return '❄️';
                    if (c >= 95) return '⛈️';
                    return '🌡️';
                };

                if (hourlyList && wData.hourly) {
                    const currentTimeStr = wData.current_weather.time;
                    const currentIndex = wData.hourly.time.findIndex(t => t.slice(0, 13) === currentTimeStr.slice(0, 13));
                    
                    if (currentIndex !== -1) {
                        const startIndex = Math.max(0, currentIndex - 12);
                        const endIndex = Math.min(wData.hourly.time.length, currentIndex + 13);
                        let hourlyHTML = '';
                        
                        for (let i = startIndex; i < endIndex; i++) {
                            const tDate = new Date(wData.hourly.time[i]);
                            const timeString = tDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            const t = Math.round(wData.hourly.temperature_2m[i]);
                            const c = wData.hourly.weathercode[i];
                            const dFlag = wData.hourly.is_day[i];
                            
                            let bg = i === currentIndex ? 'rgba(22, 163, 74, 0.15)' : 'rgba(22, 163, 74, 0.05)';
                            let bder = i === currentIndex ? '1px solid rgba(22, 163, 74, 0.4)' : '1px solid transparent';
                            
                            hourlyHTML += `
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: ${bg}; border: ${bder}; border-radius: 10px; margin-bottom: 6px; color: var(--text-primary);">
                                    <span style="font-size:0.85rem; color: inherit; width: 60px;">${timeString}</span>
                                    <span style="font-size:1.2rem;">${iconMap(c, dFlag)}</span>
                                    <span style="font-size:0.95rem; font-weight:bold; width: 40px; text-align:right;">${t}°C</span>
                                </div>
                            `;
                        }
                        hourlyList.innerHTML = hourlyHTML;
                    }
                }
            }
        } catch (e) {
            console.error("Weather error:", e);
        }
    };

    // Location Search Logic
    window.fetchLocationSuggestions = async (query) => {
        const resultsDiv = document.getElementById('locationResults');
        if (!query || query.length < 3) {
            if (resultsDiv) resultsDiv.innerHTML = '';
            return;
        }

        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&countrycodes=in`);
            const data = await res.json();
            
            if (resultsDiv && data) {
                let html = '';
                data.forEach(item => {
                    const name = item.display_name;
                    const lat = item.lat;
                    const lon = item.lon;
                    const city = item.address.city || item.address.town || item.address.village || item.address.suburb || item.display_name.split(',')[0];
                    
                    html += `
                        <div class="location-suggestion-item" onclick="window.selectLocation('${lat}', '${lon}', '${city.replace(/'/g, "\\'")}')">
                            <span class="suggestion-icon">📍</span>
                            <span class="suggestion-text">${name}</span>
                        </div>
                    `;
                });
                resultsDiv.innerHTML = html;
            }
        } catch (err) {
            console.error("Suggestions error:", err);
        }
    };

    window.selectLocation = (lat, lng, city) => {
        window.updateGlobalLocation(lat, lng, city);
        const resultsDiv = document.getElementById('locationResults');
        if (resultsDiv) resultsDiv.innerHTML = '';
        const input = document.getElementById('locationSearchInput');
        if (input) input.value = '';
        document.getElementById('locationDropdown')?.classList.remove('active');
    };

    window.updateGlobalLocation = (lat, lng, city) => {
        localStorage.setItem('kyc_userLat', lat);
        localStorage.setItem('kyc_userLng', lng);
        localStorage.setItem('kyc_userCity', city);
        
        // Update UI Badges immediately
        const cityEls = ['userCityName', 'currentCityDisplay', 'mobileUserCityName'];
        cityEls.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = city;
        });

        window.kycFetchWeather(lat, lng);
        
        // Dispatch custom event for React and legacy pages
        const event = new CustomEvent('kyc_locationUpdated', { 
            detail: { lat, lng, city } 
        });
        window.dispatchEvent(event);
        console.log(`📍 Location updated: ${city} (${lat}, ${lng})`);
    };

    window.searchLocation = async () => {
        const input = document.getElementById('locationSearchInput');
        const query = input?.value.trim();
        if (!query) return;
        
        // If query is long enough, it might have already triggered suggestions.
        // But for a direct click, we fetch the top result.
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=in`);
            const data = await res.json();
            if (data && data.length > 0) {
                const { lat, lon, display_name } = data[0];
                const city = display_name.split(',')[0];
                window.updateGlobalLocation(lat, lon, city);
                if (input) input.value = '';
                document.getElementById('locationDropdown')?.classList.remove('active');
            }
        } catch (err) {
            console.error("Search error:", err);
        }
    };

    // Current Location Logic
    window.useCurrentLocation = () => {
        if (navigator.geolocation) {
            const btn = document.querySelector('.location-current-btn');
            if (btn) btn.textContent = '📍 Locating...';

            navigator.geolocation.getCurrentPosition(async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                    const data = await res.json();
                    const city = data.address.city || data.address.town || data.address.village || data.address.suburb || "Current Location";
                    
                    window.updateGlobalLocation(latitude, longitude, city);
                    if (btn) btn.textContent = '📍 Use Current Location';
                    document.getElementById('locationDropdown')?.classList.remove('active');
                } catch (e) {
                    console.error("Reverse geocode error:", e);
                    window.updateGlobalLocation(latitude, longitude, "Current Location");
                    if (btn) btn.textContent = '📍 Use Current Location';
                }
            }, (error) => {
                console.error("Geolocation error:", error);
                alert("Location access denied or unavailable.");
                if (btn) btn.textContent = '📍 Use Current Location';
            });
        }
    };
};
