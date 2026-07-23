/* ============================================
   KNOW YOUR CITY — Background Data Prefetcher
   Prefetches all feature data when location is selected.
   Results stored in localStorage for instant feature page loads.
   ============================================ */

(function () {
  'use strict';

  const PREFETCH_TTL = 30 * 60 * 1000; // 30 minutes
  const OVERPASS_MIRRORS = [
    'https://overpass-api.de/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
  ];

  // Feature definitions: key, Overpass query builder, cache key builder
  const FEATURES = [
    {
      name: 'Hospitals',
      cacheKey: (lat, lng) => `kyc_cache_hospitals_${Math.round(lat * 100)}_${Math.round(lng * 100)}`,
      query: (lat, lng) => `[out:json][timeout:25];(node["amenity"="hospital"](around:25000,${lat},${lng});way["amenity"="hospital"](around:25000,${lat},${lng});node["amenity"="clinic"](around:15000,${lat},${lng});way["amenity"="clinic"](around:15000,${lat},${lng}););out center tags 500;`
    },
    {
      name: 'Schools',
      cacheKey: (lat, lng) => `kyc_cache_schools_${Math.round(lat * 100)}_${Math.round(lng * 100)}`,
      query: (lat, lng) => `[out:json][timeout:25];(node["amenity"="school"](around:25000,${lat},${lng});way["amenity"="school"](around:25000,${lat},${lng});node["amenity"="college"](around:25000,${lat},${lng});way["amenity"="college"](around:25000,${lat},${lng}););out center tags 300;`
    },
    {
      name: 'Parks',
      cacheKey: (lat, lng) => `kyc_cache_parks_${Math.round(lat * 100)}_${Math.round(lng * 100)}`,
      query: (lat, lng) => `[out:json][timeout:25];(node["leisure"="park"](around:25000,${lat},${lng});way["leisure"="park"](around:25000,${lat},${lng});node["leisure"="garden"](around:15000,${lat},${lng});way["leisure"="garden"](around:15000,${lat},${lng}););out center tags 300;`
    },
    {
      name: 'Police',
      cacheKey: (lat, lng) => `kyc_cache_police_${Math.round(lat * 100)}_${Math.round(lng * 100)}`,
      query: (lat, lng) => `[out:json][timeout:25];(node["amenity"="police"](around:25000,${lat},${lng});way["amenity"="police"](around:25000,${lat},${lng}););out center tags 300;`
    },
    {
      name: 'Metro',
      cacheKey: (lat, lng) => `kyc_cache_metro_${Math.round(lat * 100)}_${Math.round(lng * 100)}`,
      query: (lat, lng) => `[out:json][timeout:25];(node["railway"="station"](around:25000,${lat},${lng});node["station"="subway"](around:25000,${lat},${lng});way["railway"="station"](around:25000,${lat},${lng}););out center tags 300;`
    },
    {
      name: 'PG & Hostels',
      cacheKey: (lat, lng) => `kyc_cache_pghostel_${Math.round(lat * 100)}_${Math.round(lng * 100)}`,
      query: (lat, lng) => `[out:json][timeout:25];(node["tourism"~"hostel|guest_house"](around:25000,${lat},${lng});way["tourism"~"hostel|guest_house"](around:25000,${lat},${lng}););out center tags 300;`
    },
    {
      name: 'Restaurants',
      cacheKey: (lat, lng) => `kyc_cache_restaurants_${Math.round(lat * 100)}_${Math.round(lng * 100)}`,
      query: (lat, lng) => `[out:json][timeout:30];(node["amenity"~"restaurant|food_court|fast_food"](around:10000,${lat},${lng});way["amenity"~"restaurant|food_court|fast_food"](around:10000,${lat},${lng}););out center tags 500;`
    },
    {
      name: 'Cafes',
      cacheKey: (lat, lng) => `kyc_cache_cafes_${Math.round(lat * 100)}_${Math.round(lng * 100)}`,
      query: (lat, lng) => `[out:json][timeout:25];(node["amenity"~"cafe|tea_room"](around:10000,${lat},${lng});way["amenity"~"cafe|tea_room"](around:10000,${lat},${lng}););out center tags 300;`
    },
    {
      name: 'City Areas',
      cacheKey: (lat, lng) => `kyc_cache_areas_${Math.round(lat * 100)}_${Math.round(lng * 100)}`,
      query: (lat, lng) => `[out:json][timeout:25];(nwr["place"~"suburb|city_district|neighbourhood|locality|village"](around:20000,${lat},${lng}););out center;`
    }
  ];

  // ─── Fetch with mirror racing ───
  async function fetchFromOverpass(query) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const result = await Promise.any(OVERPASS_MIRRORS.map(mirror =>
        fetch(mirror, {
          method: 'POST',
          body: 'data=' + encodeURIComponent(query),
          signal: controller.signal
        }).then(res => {
          if (!res.ok) throw new Error('Bad response');
          return res.json();
        }).then(data => {
          if (!data || !data.elements) throw new Error('No elements');
          return data;
        })
      ));
      clearTimeout(timeout);
      return result;
    } catch (e) {
      clearTimeout(timeout);
      return null;
    }
  }

  // ─── Check if cache is still valid ───
  function isCacheValid(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return false;
      const { timestamp } = JSON.parse(raw);
      return (Date.now() - timestamp) < PREFETCH_TTL;
    } catch {
      return false;
    }
  }

  // ─── Prefetch a single feature ───
  async function prefetchFeature(feature, lat, lng) {
    const cacheKey = feature.cacheKey(lat, lng);

    // Skip if already cached
    if (isCacheValid(cacheKey)) {
      console.log(`⚡ [Prefetch] ${feature.name} — cached, skipping`);
      return { name: feature.name, status: 'cached' };
    }

    try {
      const data = await fetchFromOverpass(feature.query(lat, lng));
      if (data && data.elements && data.elements.length > 0) {
        localStorage.setItem(cacheKey, JSON.stringify({
          data: data.elements,
          timestamp: Date.now()
        }));
        console.log(`✅ [Prefetch] ${feature.name} — ${data.elements.length} items cached`);
        return { name: feature.name, status: 'fetched', count: data.elements.length };
      } else {
        console.warn(`⚠️ [Prefetch] ${feature.name} — no data found`);
        return { name: feature.name, status: 'empty' };
      }
    } catch (e) {
      console.warn(`❌ [Prefetch] ${feature.name} — failed`, e);
      return { name: feature.name, status: 'error' };
    }
  }

  // ─── Status indicator UI ───
  function showPrefetchStatus(message, isComplete) {
    let indicator = document.getElementById('kycPrefetchIndicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'kycPrefetchIndicator';
      indicator.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: rgba(15, 23, 42, 0.92);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(56, 189, 248, 0.25);
        color: #94A3B8;
        padding: 10px 18px;
        border-radius: 50px;
        font-size: 0.78rem;
        font-family: 'Inter', sans-serif;
        z-index: 99999;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        opacity: 0;
        transform: translateY(20px);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        pointer-events: none;
      `;
      document.body.appendChild(indicator);
      // Trigger entrance animation
      requestAnimationFrame(() => {
        indicator.style.opacity = '1';
        indicator.style.transform = 'translateY(0)';
      });
    }

    if (isComplete) {
      indicator.style.borderColor = 'rgba(16, 185, 129, 0.4)';
      indicator.innerHTML = `<span style="color:#10B981;">✓</span> ${message}`;
      setTimeout(() => {
        indicator.style.opacity = '0';
        indicator.style.transform = 'translateY(20px)';
        setTimeout(() => indicator.remove(), 500);
      }, 2500);
    } else {
      indicator.innerHTML = `
        <span style="display:inline-block; width:14px; height:14px; border:2px solid rgba(56,189,248,0.3); border-top-color:#38BDF8; border-radius:50%; animation:kycPrefetchSpin 0.8s linear infinite;"></span>
        ${message}
      `;
      // Inject spinner keyframe if not present
      if (!document.getElementById('kycPrefetchSpinStyle')) {
        const style = document.createElement('style');
        style.id = 'kycPrefetchSpinStyle';
        style.textContent = '@keyframes kycPrefetchSpin { to { transform: rotate(360deg); } }';
        document.head.appendChild(style);
      }
    }
  }

  // ─── Main prefetch orchestrator ───
  async function prefetchAllFeatures(lat, lng, city) {
    console.log(`🚀 [Prefetch] Starting background data prefetch for ${city} (${lat}, ${lng})`);
    showPrefetchStatus(`Preloading ${city} data...`, false);

    // Stagger requests in batches of 3 to avoid rate limiting
    const batches = [];
    for (let i = 0; i < FEATURES.length; i += 3) {
      batches.push(FEATURES.slice(i, i + 3));
    }

    let completed = 0;
    const total = FEATURES.length;
    const results = [];

    for (const batch of batches) {
      const batchResults = await Promise.allSettled(
        batch.map(feature => prefetchFeature(feature, lat, lng))
      );
      batchResults.forEach(r => {
        if (r.status === 'fulfilled') results.push(r.value);
        completed++;
      });
      showPrefetchStatus(`Preloading ${city}... ${completed}/${total}`, false);

      // Small delay between batches to be gentle on the API
      if (completed < total) {
        await new Promise(r => setTimeout(r, 800));
      }
    }

    const fetched = results.filter(r => r.status === 'fetched').length;
    const cached = results.filter(r => r.status === 'cached').length;
    console.log(`🏁 [Prefetch] Complete — ${fetched} fetched, ${cached} already cached`);
    showPrefetchStatus(`${city} data ready — ${fetched + cached} features loaded`, true);
  }

  // ─── Listen for location changes ───
  window.addEventListener('kyc_locationUpdated', (e) => {
    const { lat, lng, city } = e.detail;
    if (!lat || !lng) return;

    // Delay slightly to let the UI settle
    setTimeout(() => {
      prefetchAllFeatures(parseFloat(lat), parseFloat(lng), city);
    }, 1500);
  });

  // ─── Auto-prefetch on page load if location is already set ───
  document.addEventListener('DOMContentLoaded', () => {
    const lat = localStorage.getItem('kyc_userLat');
    const lng = localStorage.getItem('kyc_userLng');
    const city = localStorage.getItem('kyc_userCity');
    const isLoggedIn = localStorage.getItem('kyc_isLoggedIn') === 'true';

    if (lat && lng && city && isLoggedIn) {
      // Check if any feature data is missing before prefetching
      const anyMissing = FEATURES.some(f => {
        const key = f.cacheKey(parseFloat(lat), parseFloat(lng));
        try {
          const raw = localStorage.getItem(key);
          if (!raw) return true;
          const { timestamp } = JSON.parse(raw);
          return (Date.now() - timestamp) >= PREFETCH_TTL;
        } catch { return true; }
      });

      if (anyMissing) {
        // Wait for page to fully load before prefetching
        setTimeout(() => {
          prefetchAllFeatures(parseFloat(lat), parseFloat(lng), city);
        }, 3000);
      } else {
        console.log('⚡ [Prefetch] All feature data is already cached and fresh');
      }
    }
  });

})();
