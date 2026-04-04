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
                            
                            let bg = i === currentIndex ? 'rgba(0, 212, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)';
                            let bder = i === currentIndex ? '1px solid rgba(0, 212, 255, 0.4)' : '1px solid transparent';
                            
                            hourlyHTML += `
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: ${bg}; border: ${bder}; border-radius: 10px; margin-bottom: 6px;">
                                    <span style="font-size:0.85rem; color:#fff; width: 60px;">${timeString}</span>
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
    window.searchLocation = async () => {
        const input = document.getElementById('locationSearchInput');
        const query = input?.value.trim();
        if (!query) return;

        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
            const data = await res.json();
            if (data && data.length > 0) {
                const { lat, lon, display_name } = data[0];
                const city = display_name.split(',')[0];
                
                localStorage.setItem('kyc_userLat', lat);
                localStorage.setItem('kyc_userLng', lon);
                localStorage.setItem('kyc_userCity', city);
                
                window.kycFetchWeather(lat, lon);
                document.getElementById('locationDropdown')?.classList.remove('active');
                if (input) input.value = '';
            }
        } catch (err) {
            console.error("Search error:", err);
        }
    };

    // Current Location Logic
    window.useCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                    const data = await res.json();
                    const city = data.address.city || data.address.town || data.address.village || "Unknown Area";
                    
                    localStorage.setItem('kyc_userLat', latitude);
                    localStorage.setItem('kyc_userLng', longitude);
                    localStorage.setItem('kyc_userCity', city);
                    
                    window.kycFetchWeather(latitude, longitude);
                    document.getElementById('locationDropdown')?.classList.remove('active');
                } catch (e) {
                    console.error("Reverse geocode error:", e);
                }
            });
        }
    };
};
