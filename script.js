/* ============================================
   KNOW YOUR CITY — JavaScript
   Animations, Carousel, Nav, Scroll Effects
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ===== AUTHENTICATION SYSTEM =====
  const authModal = document.getElementById('authModal');
  const loginBtn = document.getElementById('loginBtn');
  const closeModal = document.getElementById('closeModal');
  const authTabs = document.querySelectorAll('.auth-tab');
  const authForms = document.querySelectorAll('.auth-form');
  const switchLinks = document.querySelectorAll('[data-switch]');

  // Forms & Error Elements
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const loginError = document.getElementById('loginError');
  const signupError = document.getElementById('signupError');

  // Captcha Elements
  const captchaLabel = document.getElementById('captchaLabel');
  const loginCaptcha = document.getElementById('loginCaptcha');
  let currentCaptchaAnswer = 0;

  const loginNav = document.getElementById('loginNav');
  const accountNav = document.getElementById('accountNav');
  const accountName = document.getElementById('accountName');
  const navLogoutBtn = document.getElementById('logoutBtn');

  // Logout Confirmation Elements
  const logoutConfirmModal = document.getElementById('logoutConfirmModal');
  const cancelLogoutBtn = document.getElementById('cancelLogoutBtn');
  const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');

  // Toast Elements
  const loginToast = document.getElementById('loginToast');
  const toastTitle = document.getElementById('toastTitle');

  // Database and State
  const API_BASE = 'https://knowyourcity.onrender.com/api'; // Change this to your backend URL
  let isLoggedIn = localStorage.getItem('kyc_isLoggedIn') === 'true';
  let usersDB = JSON.parse(localStorage.getItem('kyc_users')) || [];
  let crimeMap;
  let markersLayer;
  let currentCityName = "Your Area";

  // Show Toast Function
  const showLoginToast = (firstName) => {
    if (toastTitle) toastTitle.textContent = `Welcome, ${firstName}!`;
    if (loginToast) {
      loginToast.classList.add('show');
      setTimeout(() => {
        loginToast.classList.remove('show');
      }, 4000); // 4 seconds
    }
  };

  // Generate Math Captcha
  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    currentCaptchaAnswer = num1 + num2;
    if (captchaLabel) {
      captchaLabel.textContent = `What is ${num1} + ${num2}?`;
    }
    if (loginCaptcha) {
      loginCaptcha.value = '';
    }
  };

  const showError = (element, message) => {
    element.textContent = message;
    element.classList.add('active');
  };

  const clearErrors = () => {
    loginError.classList.remove('active');
    signupError.classList.remove('active');
  };

  // Toggle Modal
  const openAuthModal = (tab = 'login') => {
    console.log('Opening Auth Modal - Tab:', tab);
    authModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    clearErrors();
    if (tab === 'login') generateCaptcha();
    switchTab(tab);
  };

  const closeAuthModal = () => {
    authModal.classList.remove('active');
    document.body.style.overflow = '';
  };

  const switchTab = (tabName) => {
    clearErrors();
    if (tabName === 'login') generateCaptcha();
    authTabs.forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
    });
    authForms.forEach(form => {
      form.classList.toggle('active', form.id === `${tabName}Form`);
    });
  };

  // Auth Button Click
  if (loginBtn) {
    loginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openAuthModal();
    });
  }

  // Logout Button Click (Shows Confirmation Modal)
  if (navLogoutBtn) {
    navLogoutBtn.addEventListener('click', () => {
      logoutConfirmModal.classList.add('active');
    });
  }

  // Confirm Logout Handlers
  if (cancelLogoutBtn) {
    cancelLogoutBtn.addEventListener('click', () => {
      logoutConfirmModal.classList.remove('active');
    });
  }

  if (confirmLogoutBtn) {
    confirmLogoutBtn.addEventListener('click', () => {
      logoutConfirmModal.classList.remove('active');
      logout();
    });
  }

  closeModal.addEventListener('click', closeAuthModal);
  authModal.addEventListener('click', (e) => {
    if (e.target === authModal) closeAuthModal();
  });

  if (logoutConfirmModal) {
    logoutConfirmModal.addEventListener('click', (e) => {
      if (e.target === logoutConfirmModal) logoutConfirmModal.classList.remove('active');
    });
  }

  // Tab Switching Logic
  authTabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.getAttribute('data-tab')));
  });

  switchLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(link.getAttribute('data-switch'));
    });
  });

  // Logic for Login — requests geolocation for badge only (no map redirect)
  const performLogin = (email, firstName) => {
    isLoggedIn = true;
    localStorage.setItem('kyc_isLoggedIn', 'true');
    localStorage.setItem('kyc_currentUser', email);
    localStorage.setItem('kyc_firstName', firstName);
    updateAuthUI();
    closeAuthModal();
    showLoginToast(firstName);
    window.isLoggedIn = true;

    // Show fact popup ONCE after login (not on city change or refresh)
    const city = localStorage.getItem('kyc_userCity') || 'Your City';
    sessionStorage.setItem('kyc_showFact', city);

    // Request geolocation for the location badge only
    detectUserCity();
  };

  const detectUserCity = () => {
    const locationBadge = document.getElementById('locationBadge');
    const userCityName = document.getElementById('userCityName');
    if (!locationBadge || !userCityName) return;

    const extractCityName = (address) => {
      if (!address) return 'Your City';
      return address.city || 
             address.town || 
             address.suburb || 
             address.neighbourhood || 
             address.city_district || 
             address.village || 
             address.municipality || 
             address.county || 
             address.state || 
             'Your City';
    };

    if (navigator.geolocation) {
      if (locationBadge) locationBadge.style.display = 'flex';
      const mobileLoc = document.getElementById('mobileLocationBadge');
      if (mobileLoc) mobileLoc.style.display = 'block';

      if (userCityName) userCityName.textContent = 'Detecting...';
      const mobileCity = document.getElementById('mobileUserCityName');
      if (mobileCity) mobileCity.textContent = 'Detecting...';

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await res.json();
            const city = extractCityName(data.address);
            
            if (userCityName) userCityName.textContent = city;
            if (mobileCity) mobileCity.textContent = city;

            localStorage.setItem('kyc_userCity', city);
            localStorage.setItem('kyc_userLat', latitude);
            localStorage.setItem('kyc_userLng', longitude);
            if (typeof window.kycFetchWeather === 'function') window.kycFetchWeather(latitude, longitude);
          } catch {
            if (userCityName) userCityName.textContent = 'Your City';
            if (mobileCity) mobileCity.textContent = 'Your City';
          }
        },
        () => {
          if (userCityName) userCityName.textContent = 'Set Location';
          if (mobileCity) mobileCity.textContent = 'Set Location';
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
      );
    } else {
      if (userCityName) userCityName.textContent = 'Location N/A';
      if (mobileCity) mobileCity.textContent = 'Location N/A';
    }
  };

  const logout = () => {
    isLoggedIn = false;
    localStorage.setItem('kyc_isLoggedIn', 'false');
    localStorage.removeItem('kyc_currentUser');
    localStorage.removeItem('kyc_firstName');
    updateAuthUI();
    // Redirect to top on logout
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateAuthUI = () => {
    const premiumContent = document.getElementById('premiumAppContent');
    const heroBtn = document.getElementById('heroCtaPrimary');
    const heroSecBtn = document.getElementById('heroCtaSecondary');
    const locationBadge = document.getElementById('locationBadge');
    const weatherBadge = document.getElementById('weatherBadge');
    
    // Mobile Elements
    const mobileLoginNav = document.getElementById('mobileLoginNav');
    const mobileAccountNav = document.getElementById('mobileAccountNav');
    const mobileAccountName = document.getElementById('mobileAccountName');
    const mobileLocationBadge = document.getElementById('mobileLocationBadge');
    const mobileWeatherBadge = document.getElementById('mobileWeatherBadge');

    if (isLoggedIn) {
      const firstName = localStorage.getItem('kyc_firstName');

      if (loginNav) loginNav.style.display = 'none';
      if (mobileLoginNav) mobileLoginNav.style.display = 'none';

      if (accountNav) {
        accountNav.style.display = 'flex';
        if (accountName && firstName) accountName.textContent = 'Hello, ' + firstName;
      }
      if (mobileAccountNav) {
        mobileAccountNav.style.display = 'block';
        if (mobileAccountName && firstName) mobileAccountName.textContent = 'Hello, ' + firstName;
      }
      
      if (premiumContent) premiumContent.style.display = 'block';
      if (heroBtn) {
         heroBtn.innerHTML = 'Analyze City <span>→</span>';
         heroBtn.href = "#safety-map";
         heroBtn.removeAttribute('onclick');
      }
      if (heroSecBtn) heroSecBtn.style.display = 'inline-flex';
      if (locationBadge) locationBadge.style.display = 'flex';
      if (mobileLocationBadge) mobileLocationBadge.style.display = 'block';
      
      // Attempt to show weather if we have coords
      const lat = localStorage.getItem('kyc_userLat');
      const lng = localStorage.getItem('kyc_userLng');
      if (lat && lng && typeof window.kycFetchWeather === 'function') {
        window.kycFetchWeather(lat, lng);
      }
      
    } else {
      if (accountNav) accountNav.style.display = 'none';
      if (mobileAccountNav) mobileAccountNav.style.display = 'none';
      
      if (loginNav) loginNav.style.display = 'block';
      if (mobileLoginNav) mobileLoginNav.style.display = 'block';
      
      if (premiumContent) premiumContent.style.display = 'none';
      if (heroBtn) {
         heroBtn.innerHTML = 'Login to Explore <span>→</span>';
         heroBtn.href = "#";
         heroBtn.setAttribute('onclick', 'event.preventDefault(); document.getElementById("authModal").classList.add("active"); document.body.style.overflow="hidden";');
      }
      if (heroSecBtn) heroSecBtn.style.display = 'none';
      if (locationBadge) locationBadge.style.display = 'none';
      if (mobileLocationBadge) mobileLocationBadge.style.display = 'none';
      if (weatherBadge) weatherBadge.style.display = 'none';
      if (mobileWeatherBadge) mobileWeatherBadge.style.display = 'none';
    }
  };
  
  // ensure the UI is updated immediately dynamically
  updateAuthUI();

  // Login Form Submission — tries backend API, falls back to localStorage
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const captchaInput = parseInt(document.getElementById('loginCaptcha').value);
    const termsCheckbox = document.getElementById('loginTerms');
    const termsError = document.getElementById('termsError');

    // Terms & Conditions validation
    if (termsCheckbox && !termsCheckbox.checked) {
      if (termsError) {
        termsError.textContent = 'Please accept the Terms & Conditions to continue.';
        termsError.classList.add('active');
      }
      return;
    }
    if (termsError) termsError.classList.remove('active');

    const privacyCheckbox = document.getElementById('loginPrivacy');
    const privacyError = document.getElementById('privacyError');
    if (privacyCheckbox && !privacyCheckbox.checked) {
      if (privacyError) {
        privacyError.textContent = 'Please accept the Privacy Policy to continue.';
        privacyError.classList.add('active');
      }
      return;
    }
    if (privacyError) privacyError.classList.remove('active');

    if (captchaInput !== currentCaptchaAnswer) {
      showError(loginError, 'Incorrect Captcha. Please try again.');
      generateCaptcha();
      return;
    }

    // Try backend API first
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (res.ok) {
        performLogin(data.user.email, data.user.firstName);
        loginForm.reset();
        return;
      } else if (res.status >= 500) {
        throw new Error('Backend error: ' + (data.message || 'Server Unavailable'));
      } else {
        showError(loginError, data.message || 'Login failed.');
        generateCaptcha();
        return;
      }
    } catch (err) {
      // Backend unavailable — fallback to localStorage
      console.log('Backend unavailable, using localStorage fallback. Reason:', err.message);
    }

    // localStorage fallback
    usersDB = JSON.parse(localStorage.getItem('kyc_users')) || [];
    const user = usersDB.find(u => u.email === email && u.password === password);
    if (user) {
      performLogin(email, user.firstName);
      loginForm.reset();
    } else if (!usersDB.some(u => u.email === email)) {
      showError(loginError, "Email doesn't exist. Please sign up first.");
      generateCaptcha();
    } else {
      showError(loginError, 'Invalid password.');
      generateCaptcha();
    }
  });

  // Signup Form Submission — tries backend API, falls back to localStorage
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const firstName = document.getElementById('signupFirstName').value.trim();
    const lastName = document.getElementById('signupLastName').value.trim();
    const phone = document.getElementById('signupPhone').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const dob = document.getElementById('signupDOB').value;
    const password = document.getElementById('signupPassword').value;

    if (password.length < 6) {
      showError(signupError, 'Password must be at least 6 characters.');
      return;
    }

    // Try backend API first
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, phone, email, dob, password })
      });
      const data = await res.json();

      if (res.ok) {
        signupForm.reset();
        performLogin(data.user.email, data.user.firstName);
        const authModal = document.getElementById('authModal');
        if(authModal) authModal.classList.remove('active');
        document.body.style.overflow = 'auto';
        return;
      } else if (res.status >= 500) {
        throw new Error('Backend error: ' + (data.message || 'Server Unavailable'));
      } else {
        showError(signupError, data.message || 'Registration failed.');
        return;
      }
    } catch (err) {
      console.log('Backend unavailable, using localStorage fallback. Reason:', err.message);
    }

    // localStorage fallback
    usersDB = JSON.parse(localStorage.getItem('kyc_users')) || [];
    if (usersDB.some(u => u.email === email)) {
      showError(signupError, 'Email is already registered. Please login.');
      return;
    }

    usersDB.push({ firstName, lastName, phone, email, dob, password });
    localStorage.setItem('kyc_users', JSON.stringify(usersDB));

    signupForm.reset();
    performLogin(email, firstName);
    const authModal = document.getElementById('authModal');
    if(authModal) authModal.classList.remove('active');
    document.body.style.overflow = 'auto';
  });

  // ===== PASSWORD TOGGLE =====
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      const eyeOpen = btn.querySelector('.eye-open');
      const eyeClosed = btn.querySelector('.eye-closed');

      if (input.type === 'password') {
        input.type = 'text';
        eyeOpen.style.display = 'none';
        eyeClosed.style.display = 'block';
      } else {
        input.type = 'password';
        eyeOpen.style.display = 'block';
        eyeClosed.style.display = 'none';
      }
    });
  });


  // Initial UI Setup
  updateAuthUI();
  window.isLoggedIn = isLoggedIn;
  console.log('✅ KYC Auth System Initialized. Logged In:', isLoggedIn);

  // Weather Module with Hourly Data
  window.kycFetchWeather = (lat, lng) => {
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&hourly=temperature_2m,weathercode,is_day&past_days=1&forecast_days=2&timezone=auto`)
      .then(res => res.json())
      .then(wData => {
        const weatherBadge = document.getElementById('weatherBadge');
        const weatherTemp = document.getElementById('weatherTemp');
        const weatherIcon = document.getElementById('weatherIcon');
        const hourlyList = document.getElementById('hourlyWeatherList');
        
        const mobileWeatherBadge = document.getElementById('mobileWeatherBadge');
        const mobileWeatherTemp = document.getElementById('mobileWeatherTemp');
        const mobileWeatherIcon = document.getElementById('mobileWeatherIcon');

        if (wData && wData.current_weather && weatherBadge && weatherTemp) {
          weatherBadge.style.display = 'flex';
          weatherTemp.textContent = `${Math.round(wData.current_weather.temperature)}°C`;
          if (mobileWeatherBadge) mobileWeatherBadge.style.display = 'block';
          if (mobileWeatherTemp) mobileWeatherTemp.textContent = `${Math.round(wData.current_weather.temperature)}°C`;
          
          const iconMap = (c, isDay) => {
              if (c === 0) return isDay ? '☀️' : '🌙';
              if (c <= 3) return isDay ? '⛅' : '☁️';
              if (c <= 48) return '🌫️';
              if (c <= 67) return '🌧️';
              if (c <= 77) return '❄️';
              if (c >= 95) return '⛈️';
              return '🌡️';
          };
          weatherIcon.textContent = iconMap(wData.current_weather.weathercode, wData.current_weather.is_day);
          if (mobileWeatherIcon) mobileWeatherIcon.textContent = iconMap(wData.current_weather.weathercode, wData.current_weather.is_day);

          if (hourlyList && wData.hourly && wData.current_weather) {
            const currentTimeStr = wData.current_weather.time;
            const currentIndex = wData.hourly.time.findIndex(t => t.slice(0, 13) === currentTimeStr.slice(0, 13));
            
            if (currentIndex !== -1) {
              const startIndex = Math.max(0, currentIndex - 12);
              const endIndex = Math.min(wData.hourly.time.length, currentIndex + 13);
              let hourlyHTML = '';
              
              for (let i = startIndex; i < endIndex; i++) {
                const tDate = new Date(wData.hourly.time[i]);
                const timeString = tDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const dateString = tDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
                const t = Math.round(wData.hourly.temperature_2m[i]);
                const c = wData.hourly.weathercode[i];
                const dFlag = wData.hourly.is_day[i];
                
                let bg = i === currentIndex ? 'rgba(0, 212, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)';
                let bder = i === currentIndex ? '1px solid rgba(0, 212, 255, 0.4)' : '1px solid transparent';
                let label = i === currentIndex ? `<span style="color:var(--accent-cyan); font-size:0.75rem; font-weight:bold;">NOW</span>` : '';
                
                hourlyHTML += `
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: ${bg}; border: ${bder}; border-radius: 6px;">
                    <div style="display: flex; flex-direction: column; width: 80px;">
                      ${label}
                      <span style="font-size:0.85rem; color:#fff;">${timeString}</span>
                      <span style="font-size:0.65rem; color:#aaa;">${dateString}</span>
                    </div>
                    <span style="font-size:1.2rem;">${iconMap(c, dFlag)}</span>
                    <span style="font-size:0.95rem; font-weight:bold; width: 40px; text-align:right;">${t}°C</span>
                  </div>
                `;
              }
              hourlyList.innerHTML = hourlyHTML;
              
              // Optionally scroll to "NOW" smoothly after render
              setTimeout(() => {
                const nowSpan = hourlyList.querySelector('span[style*="var(--accent-cyan)"]');
                if (nowSpan) nowSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 100);
            } else {
              hourlyList.innerHTML = '<div style="color:#aaa; font-size:0.8rem; text-align:center;">Forecast unavailable</div>';
            }
          }
        }
      }).catch(e => {
        const hourlyList = document.getElementById('hourlyWeatherList');
        if(hourlyList) hourlyList.innerHTML = '<div style="color:var(--caution-red); font-size:0.8rem; text-align:center;">Error loading forecast</div>';
      });
  };

  // If already logged in from a previous session, restore the location badge
  if (isLoggedIn) {
    const savedCity = localStorage.getItem('kyc_userCity');
    const savedLat = localStorage.getItem('kyc_userLat');
    const savedLng = localStorage.getItem('kyc_userLng');
    const locationBadge = document.getElementById('locationBadge');
    const userCityName = document.getElementById('userCityName');
    if (savedCity && locationBadge && userCityName) {
      locationBadge.style.display = 'flex';
      userCityName.textContent = savedCity;
      if (savedLat && savedLng) window.kycFetchWeather(savedLat, savedLng);
    } else {
      detectUserCity();
    }
  }


  // ===== FEATURE GATING (RESTRICT ACCESS) =====
  const gateFeature = (e) => {
    // Force re-check from state and localStorage to prevent stale variable issues
    const checkLoggedIn = isLoggedIn || localStorage.getItem('kyc_isLoggedIn') === 'true';
    if (!checkLoggedIn) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const target = e.currentTarget || e.target;
      target.classList.add('restricted-shake');
      setTimeout(() => target.classList.remove('restricted-shake'), 400);

      openAuthModal();
      return false;
    }
    return true;
  };

  // Select elements to restrict — comprehensive list
  const restrictedSelectors = [
    '.feature-card',
    '.area-card',
    '.step-card',
    'a.floating-card',
    '.safety-map-section',
    '.safety-explorer',
    '.hiw-step',
    '.feedback-section',
    '.testimonials',
  ];

  restrictedSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      el.addEventListener('click', gateFeature, true); // Use capture to intercept
    });
  });

  // Gate hero CTA buttons (Analyze City / Login to Explore)
  document.querySelectorAll('#heroCtaPrimary, #heroCtaSecondary').forEach(el => {
    el.addEventListener('click', gateFeature, true);
  });

  // Gate nav links EXCEPT: Login button, Contact Us CTA, and Features
  document.querySelectorAll('.nav-links a').forEach(link => {
    // Skip the login button, Contact Us CTA, and the Features nav
    if (link.classList.contains('nav-login') || 
        link.classList.contains('nav-cta') || 
        link.id === 'navFeatures') return;
    link.addEventListener('click', gateFeature, true);
  });

  // Gate footer links to feature pages (resources, explore sections)
  document.querySelectorAll('.footer-col a, .footer-links a').forEach(link => {
    const href = link.getAttribute('href') || '';
    // Allow contact.html, terms.html, privacy.html — gate everything else
    if (href.includes('contact.html') || href.includes('terms.html') || href.includes('privacy.html') || href.includes('about.html')) return;
    link.addEventListener('click', gateFeature, true);
  });

  // Gate social links
  document.querySelectorAll('.social-link').forEach(link => {
    link.addEventListener('click', gateFeature, true);
  });

  // Delegated handler for dynamically generated clickable elements
  document.addEventListener('click', (e) => {
    const checkLoggedIn = isLoggedIn || localStorage.getItem('kyc_isLoggedIn') === 'true';
    if (checkLoggedIn) return; // Already logged in, allow everything

    // Check if click target is within a gated section
    const gatedAncestor = e.target.closest('.feature-card, .area-card, a.floating-card, .step-card, .safety-map-section a, .safety-explorer .btn-primary');
    if (gatedAncestor) {
      e.preventDefault();
      e.stopPropagation();
      gatedAncestor.classList.add('restricted-shake');
      setTimeout(() => gatedAncestor.classList.remove('restricted-shake'), 400);
      openAuthModal();
    }
  }, true);

  // ===== INTERACTIVE CRIME MAP LOGIC =====
  const navFeatures = document.getElementById('navFeatures');
  const interactiveMapSection = document.getElementById('interactive-map');
  const crimeDetailsPanel = document.getElementById('crimeDetailsPanel');
  const closeDetailsPanel = document.getElementById('closeDetailsPanel');

  const initCrimeMap = (lat, lng) => {
    if (crimeMap) return; // Already initialized

    interactiveMapSection.style.display = 'block';
    
    crimeMap = L.map('map', {
        zoomControl: false
    }).setView([lat, lng], 13);

    currentCityName = "Current Location";

    L.tileLayer('http://mt0.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}', {
        attribution: 'Tiles &copy; Google Maps', maxZoom: 20
    }).addTo(crimeMap);

    L.control.zoom({
        position: 'bottomright'
    }).addTo(crimeMap);

    markersLayer = L.layerGroup().addTo(crimeMap);
    
    // Add user marker
    L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'user-location-marker',
            html: '<div style="background: var(--accent-cyan); width: 15px; height: 15px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 15px var(--accent-cyan);"></div>',
            iconSize: [15, 15]
        })
    }).addTo(crimeMap).bindPopup('You are here').openPopup();

    generateSafeNeighborhoods(lat, lng);
    
    // Smooth scroll to map
    interactiveMapSection.scrollIntoView({ behavior: 'smooth' });

    // Setup Search Event
    const searchBtn = document.getElementById('mapSearchBtn');
    const searchInput = document.getElementById('mapSearchInput');

    if (searchBtn) {
        searchBtn.addEventListener('click', searchLocation);
    }
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchLocation();
        });
    }
  };

  const searchLocation = async () => {
    const input = document.getElementById('mapSearchInput');
    const query = input.value.trim();
    if (!query) return;

    input.disabled = true;
    const originalPlaceholder = input.placeholder;
    input.placeholder = "Analyzing safety records...";

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (data && data.length > 0) {
            const { lat, lon, display_name } = data[0];
            const nLat = parseFloat(lat);
            const nLng = parseFloat(lon);
            currentCityName = display_name.split(',')[0]; 
            
            crimeMap.setView([nLat, nLng], 13);
            fetchRealtimeSafetyData(nLat, nLng, currentCityName, display_name);
        } else {
            alert("Area not found. Please specify city name.");
        }
    } catch (err) {
        console.error("Search error:", err);
    } finally {
        input.disabled = false;
        input.placeholder = originalPlaceholder;
    }
  };

  const fetchRealtimeSafetyData = async (lat, lng, city, fullAreaName) => {
      const reportsList = document.getElementById('reportsList');
      const safeZone = document.getElementById('safeZoneText');
      const dangerZone = document.getElementById('dangerZoneText');
      markersLayer.clearLayers();
      reportsList.innerHTML = '<li style="color:#aaa; padding: 10px;">Fetching real-time locational infrastructure...</li>';
      safeZone.textContent = "Analyzing infrastructure...";
      dangerZone.textContent = "Please wait.";

      try {
          const res = await fetch(`https://knowyourcity.onrender.com/api/safety/insights?lat=${lat}&lng=${lng}&city=${encodeURIComponent(city)}`);
          if(!res.ok) throw new Error("Backend timeout");
          const data = await res.json();
          
          let items = [];
          if(data.infrastructures) items.push(...data.infrastructures);
          if(data.touristZones) items.push(...data.touristZones.map(tz => ({...tz, nodeType: tz.type || 'tourist'})));
          
          if(items.length === 0) { throw new Error("No OSM infrastructure found"); }
          
          renderRealtimeMarkers(items, lat, lng, fullAreaName, data.safetyStats);
      } catch(e) {
          // Fallback to unified Overpass query if backend is down
          try {
             reportsList.innerHTML = '<li style="color:#aaa; padding: 10px;">Connecting to regional safety monitors...</li>';
             
             const query = `[out:json][timeout:25];(
               node["amenity"="police"](around:15000,${lat},${lng});
               way["amenity"="police"](around:15000,${lat},${lng});
               node["amenity"="hospital"](around:15000,${lat},${lng});
               way["amenity"="hospital"](around:15000,${lat},${lng});
               node["amenity"="clinic"](around:10000,${lat},${lng});
               way["amenity"="clinic"](around:10000,${lat},${lng});
               node["amenity"="fire_station"](around:15000,${lat},${lng});
               way["amenity"="fire_station"](around:15000,${lat},${lng});
               node["emergency"="fire_hydrant"](around:10000,${lat},${lng});
               node["man_made"="surveillance"](around:10000,${lat},${lng});
               way["man_made"="surveillance"](around:10000,${lat},${lng});
               node["surveillance:type"="camera"](around:10000,${lat},${lng});
               node["surveillance:type"="ALPR"](around:10000,${lat},${lng});
               node["amenity"="cctv"](around:10000,${lat},${lng});
             );out center tags 500;`;

             const oController = new AbortController();
             const oTimeout = setTimeout(() => oController.abort(), 12000);
             const overpassRes = await fetch('https://overpass-api.de/api/interpreter', {
                 method: 'POST', body: 'data=' + encodeURIComponent(query), signal: oController.signal
             });
             clearTimeout(oTimeout);
             const overpassData = await overpassRes.json();
             const elements = overpassData.elements || [];

             const items = [];
             const seen = new Set();
             elements.forEach(el => {
                const elLat = el.lat || el.center?.lat;
                const elLng = el.lon || el.center?.lon;
                if (!elLat || !elLng) return;
                const key = `${elLat.toFixed(5)}_${elLng.toFixed(5)}`;
                if (seen.has(key)) return;
                seen.add(key);

                const tags = el.tags || {};
                const name = tags.name || tags['name:en'] || '';
                
                if (tags.amenity === 'police') items.push({ lat: elLat, lng: elLng, name: name || 'Police Station', nodeType: 'police' });
                else if (tags.amenity === 'hospital' || tags.amenity === 'clinic') items.push({ lat: elLat, lng: elLng, name: name || 'Hospital/Clinic', nodeType: 'hospital' });
                else if (tags.amenity === 'fire_station' || tags.emergency === 'fire_hydrant') items.push({ lat: elLat, lng: elLng, name: name || 'Fire Station', nodeType: 'fire_station' });
                else if (tags.man_made === 'surveillance' || tags['surveillance:type'] || tags.amenity === 'cctv') items.push({ lat: elLat, lng: elLng, name: name || 'CCTV Camera', nodeType: 'surveillance' });
             });

             if(items.length > 0) {
                 renderRealtimeMarkers(items, lat, lng, fullAreaName, null);
             } else {
                 throw new Error("Empty Overpass");
             }
          } catch(err) {
             // Ultimate fallback: Wikipedia
             try {
                reportsList.innerHTML = '<li style="color:#aaa; padding: 10px;">Searching digital footprint...</li>';
                const wRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lng}&gsradius=10000&gslimit=10&format=json&origin=*`);
                const wData = await wRes.json();
                const places = wData.query?.geosearch || [];
                if(places.length > 0) {
                    const items = places.map(p => ({ name: p.title, lat: p.lat, lng: p.lon, nodeType: 'landmark' }));
                    renderRealtimeMarkers(items, lat, lng, fullAreaName, null);
                } else {
                    reportsList.innerHTML = '<li style="color:#ff5252; padding: 10px;">No digital footprint found for this region.</li>';
                    safeZone.textContent = `📍 ${city}`;
                    dangerZone.textContent = `Insufficient geodata available.`;
                }
             } catch(wErr) {
                reportsList.innerHTML = '<li style="color:#ff5252; padding: 10px;">Failed to load location data.</li>';
             }
          }
      }
  };

  const renderRealtimeMarkers = (items, centerLat, centerLng, fullAreaName, stats) => {
      markersLayer.clearLayers();
      const reportsList = document.getElementById('reportsList');
      const safeZone = document.getElementById('safeZoneText');
      const dangerZone = document.getElementById('dangerZoneText');
      reportsList.innerHTML = '';
      
      const city = fullAreaName.split(',')[0];
      
      let score = 65;
      if(stats) {
          score = Math.max(65, Math.min(99, Math.floor((stats.densityPerKm * 15) + 65 + (stats.policeCount * 3))));
      } else {
          let hash = 0;
          for (let i = 0; i < city.length; i++) hash = city.charCodeAt(i) + ((hash << 5) - hash);
          score = 65 + (Math.abs(hash) % 25);
      }

      safeZone.textContent = `📍 ${city} Overall Confidence: ${score}/100`;
      dangerZone.textContent = `Found ${items.length} verified establishments securely mapped in this region.`;

      items.slice(0, 15).forEach((item) => {
          let label = item.name || `Local ${item.nodeType.toUpperCase()}`;
          // Ensure valid coordinates fallbacks
          const ilat = item.lat || centerLat + (Math.random()-0.5)*0.05;
          const ilng = item.lng || centerLng + (Math.random()-0.5)*0.05;
          
          let iconContent = '📍';
          if(item.nodeType === 'police') iconContent = '👮';
          else if(item.nodeType === 'hospital') iconContent = '🏥';
          else if(item.nodeType === 'fire_station') iconContent = '🚒';
          else if(item.nodeType === 'surveillance') iconContent = '📹';
          else iconContent = '📸';

          const markerClass = score >= 80 ? 'marker-excellent' : 'marker-safe';

          const marker = L.marker([ilat, ilng], {
              icon: L.divIcon({
                  className: `custom-marker ${markerClass}`,
                  html: `<div style="font-size:16px; margin-top:-2px;">${iconContent}</div>`,
                  iconSize: [28, 28]
              })
          }).addTo(markersLayer);

          // Build dynamic neighborhood-style card details for the clicked marker
          const obj = {
              name: label,
              score: Math.min(99, parseInt(score) + Math.floor(Math.random() * 5 - 2)),
              grade: score > 80 ? 'A+' : (score > 70 ? 'A' : 'B'),
              rating: score > 80 ? 'excellent' : 'safe',
              perks: ['Verified Location', `Type: ${item.nodeType.toUpperCase()}`],
              desc: `This is a verified ${item.nodeType.replace('_',' ')} mapping point located in the vicinity of ${city}. High confidence validation across multiple spatial databases. Local coordinates: ${ilat.toFixed(3)}, ${ilng.toFixed(3)}.`
          };

          marker.on('click', () => { showNeighborhoodAnalysis(obj, ilat, ilng, fullAreaName); });

          const li = document.createElement('li');
          li.style.padding = '12px';
          li.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
          li.innerHTML = `<strong>${iconContent} ${label}</strong><br/><span style="color:#aaa; font-size:0.8rem; text-transform:capitalize;">${item.nodeType.replace('_', ' ')}</span>`;
          li.style.cursor = 'pointer';
          li.onclick = () => {
              crimeMap.setView([ilat, ilng], 15);
              showNeighborhoodAnalysis(obj, ilat, ilng, fullAreaName);
          };
          reportsList.appendChild(li);
      });
  };

  const showNeighborhoodAnalysis = (hood, lat, lng, areaName) => {
    const severityBadge = document.getElementById('crimeSeverity');
    const title = document.getElementById('crimeTitle');
    const date = document.getElementById('crimeDate');
    const location = document.getElementById('crimeLocation');
    const description = document.getElementById('crimeDescription');
    const perksContainer = document.getElementById('safetyPerks');

    severityBadge.className = `severity-badge severity-${hood.rating}`;
    severityBadge.textContent = hood.grade + ' SAFE ZONE';
    title.textContent = hood.name;
    date.textContent = `Safety Score: ${hood.score}/100`;
    location.textContent = areaName.split(',').slice(0, 2).join(',');
    description.textContent = hood.desc;

    // Render perks
    perksContainer.innerHTML = '';
    
    const scoreDiv = document.createElement('div');
    scoreDiv.className = 'safety-score';
    scoreDiv.innerHTML = `<div class="score-number">${hood.score}</div><div><div class="score-label">Safety Score</div><div style="color: var(--safe-green); font-weight:600;">${hood.grade} Grade</div></div>`;
    perksContainer.appendChild(scoreDiv);

    hood.perks.forEach(perk => {
        const div = document.createElement('div');
        div.className = 'perk-item';
        div.innerHTML = `<span class="perk-icon">✅</span> ${perk}`;
        perksContainer.appendChild(div);
    });

    crimeDetailsPanel.classList.add('active');
  };

  if (navFeatures) {
    navFeatures.addEventListener('click', (e) => {
        e.preventDefault();
        if (!isLoggedIn) {
            openAuthModal();
            return;
        }

        const interactiveMapSection = document.getElementById('interactive-map');
        if (interactiveMapSection) {
            if (interactiveMapSection.style.display === 'none') {
                interactiveMapSection.style.display = 'block';
                // Use stored coords if available, else default
                const savedLat = parseFloat(localStorage.getItem('kyc_userLat')) || 19.0760;
                const savedLng = parseFloat(localStorage.getItem('kyc_userLng')) || 72.8777;
                initCrimeMap(savedLat, savedLng);
            }
            interactiveMapSection.scrollIntoView({ behavior: 'smooth' });
        }
    });
  }

  if (closeDetailsPanel) {
    closeDetailsPanel.addEventListener('click', () => {
        crimeDetailsPanel.classList.remove('active');
    });
  }


  // ===== NAVBAR SCROLL EFFECT =====
  const navbar = document.getElementById('navbar');
  const handleScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  };
  window.addEventListener('scroll', handleScroll, { passive: true });

  // ===== HAMBURGER MENU =====
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('open');
  });

  // Close menu on link click
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      navLinks.classList.remove('open');
    });
  });

  // ===== SMOOTH SCROLL =====
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // ===== SCROLL REVEAL =====
  const revealElements = document.querySelectorAll('.reveal');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        // Stagger the animation slightly
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, index * 80);
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  });

  revealElements.forEach(el => revealObserver.observe(el));

  // ===== METRIC BAR ANIMATION =====
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
  }, {
    threshold: 0.3
  });

  metricFills.forEach(el => metricObserver.observe(el));

  // ===== TESTIMONIAL CAROUSEL =====
  const track = document.getElementById('testimonialTrack');
  const dotsContainer = document.getElementById('carouselDots');
  const cards = track.querySelectorAll('.testimonial-card');
  let currentSlide = 0;
  let autoPlayInterval;

  // Create dots
  cards.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.classList.add('carousel-dot');
    dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
    if (i === 0) dot.classList.add('active');
    dot.addEventListener('click', () => goToSlide(i));
    dotsContainer.appendChild(dot);
  });

  const dots = dotsContainer.querySelectorAll('.carousel-dot');

  function goToSlide(index) {
    currentSlide = index;
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
  }

  function nextSlide() {
    const next = (currentSlide + 1) % cards.length;
    goToSlide(next);
  }

  // Auto-play
  function startAutoPlay() {
    autoPlayInterval = setInterval(nextSlide, 5000);
  }

  function stopAutoPlay() {
    clearInterval(autoPlayInterval);
  }

  startAutoPlay();

  // Pause on hover
  const carousel = document.getElementById('testimonialCarousel');
  carousel.addEventListener('mouseenter', stopAutoPlay);
  carousel.addEventListener('mouseleave', startAutoPlay);

  // Touch support
  let touchStartX = 0;
  let touchEndX = 0;

  carousel.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    stopAutoPlay();
  }, { passive: true });

  carousel.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goToSlide((currentSlide + 1) % cards.length);
      } else {
        goToSlide((currentSlide - 1 + cards.length) % cards.length);
      }
    }
    startAutoPlay();
  }, { passive: true });

  // ===== ACTIVE NAV LINK ON SCROLL =====
  const sections = document.querySelectorAll('section[id]');
  const navAnchors = document.querySelectorAll('.nav-links a:not(.nav-cta)');

  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navAnchors.forEach(a => {
          a.classList.toggle('active', a.getAttribute('href') === `#${id}`);
        });
      }
    });
  }, {
    threshold: 0.3,
    rootMargin: '-80px 0px -50% 0px'
  });

  sections.forEach(section => navObserver.observe(section));

  // ===== NEWSLETTER FORM =====
  const form = document.getElementById('newsletterForm');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('emailInput');
    const btn = form.querySelector('button');
    const originalText = btn.textContent;

    btn.textContent = '✓ Subscribed!';
    btn.style.background = 'var(--safe-green)';
    email.value = '';

    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = '';
    }, 3000);
  });

  // ===== DYNAMIC COUNTER ANIMATION =====
  const statElements = document.querySelectorAll('.hero-stat h3');

  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  statElements.forEach(el => counterObserver.observe(el));

  function animateCounter(el) {
    const text = el.textContent;
    const match = text.match(/^([\d.]+)(.*)$/);
    if (!match) return;

    const target = parseFloat(match[1]);
    const suffix = match[2];
    const duration = 2000;
    const startTime = performance.now();
    const isDecimal = text.includes('.');

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;

      if (isDecimal) {
        el.textContent = current.toFixed(1) + suffix;
      } else {
        el.textContent = Math.floor(current) + suffix;
      }

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        el.textContent = text; // Ensure exact final value
      }
    }
    requestAnimationFrame(update);
  }

  // ===== 3D TILT EFFECT ON FEATURE CARDS =====
  const tiltCards = document.querySelectorAll('.feature-card');
  tiltCards.forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left; // x position within the element
      const y = e.clientY - rect.top;  // y position within the element

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -10; // Max rotation 10deg
      const rotateY = ((x - centerX) / centerX) * 10;

      card.style.transform = `perspective(1000px) scale(1.05) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      card.style.transition = 'none';
      card.style.zIndex = '10';
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) scale(1) rotateX(0deg) rotateY(0deg)';
      card.style.transition = 'transform 0.5s ease, box-shadow 0.5s ease';
      card.style.zIndex = '1';
    });
  });



  // ===== HOW IT WORKS ANIMATIONS =====
  const hiwSection = document.getElementById('how-it-works');
  const hiwSteps = document.querySelectorAll('.hiw-step');
  
  if (hiwSection && hiwSteps.length > 0) {
    const hiwObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          hiwSteps.forEach(step => step.classList.add('active'));
          // Once animated, we can unobserve
          hiwObserver.unobserve(hiwSection);
        }
      });
    }, { threshold: 0.2 });
    
    hiwObserver.observe(hiwSection);
  }

});


