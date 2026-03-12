// ==========================================
// 1. PWA SERVICE WORKER & SMART INSTALL BANNER
// ==========================================
let deferredPrompt;

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registered!'))
            .catch(err => console.error('Service Worker failed!', err));
    });
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
});

document.addEventListener("DOMContentLoaded", function() {
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    
    if (!isInstalled && !window.location.pathname.includes("dashboard.html")) {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        
        const banner = document.createElement('div');
        banner.style.cssText = "position: fixed; bottom: 0; left: 0; right: 0; background: #1e293b; color: white; padding: 1rem; text-align: center; z-index: 9999; box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1); font-size: 0.9rem; display: flex; align-items: center; justify-content: space-between; gap: 10px;";
        
        let instructionText = isIOS 
            ? `Install PahadiRide: Tap the <strong>Share</strong> icon below, then <strong>"Add to Home Screen"</strong>`
            : `Install PahadiRide: Tap the <strong>3 dots</strong> <i class="fa-solid fa-ellipsis-vertical"></i> top right, then <strong>"Add to Home screen"</strong>`;
        
        banner.innerHTML = `
            <div style="text-align: left; line-height: 1.4;">${instructionText}</div>
            <button onclick="this.parentElement.style.display='none'" style="background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; white-space: nowrap;">Got it</button>
        `;
        document.body.appendChild(banner);
    }
});

// ==========================================
// 2. GLOBAL NAVBAR & AUTHENTICATION (LOOP FIXED)
// ==========================================
document.addEventListener("DOMContentLoaded", function() {
    const loggedInPhone = localStorage.getItem('pahadiRideUser');
    const loggedInPass = localStorage.getItem('pahadiRidePass'); 
    const navBtn = document.querySelector('.navbar .sign-in-btn'); 
    
    if (navBtn) {
        if (loggedInPhone && loggedInPass) {
            navBtn.innerHTML = '<i class="fa-solid fa-user-check"></i> Dashboard';
            navBtn.onclick = function() { window.location.href = 'dashboard.html'; };
        } else {
            navBtn.innerHTML = '<i class="fa-regular fa-user-circle"></i> Sign In';
            navBtn.onclick = function() { window.location.href = 'signin.html'; };
        }
    }

    if (loggedInPhone && loggedInPass && (window.location.pathname.includes("signin.html") || window.location.pathname.includes("signup.html"))) {
        window.location.href = "dashboard.html";
    }
});

// ==========================================
// 3. LIVE DATABASE LOGIC (Fleet & Universal Filter)
// ==========================================
const databaseURL = "https://script.google.com/macros/s/AKfycbw30qgkPH8ljRmoCpB1XV6zIaiD5PcKsU1HFt1KWEkZ4KM2pVCEMlJbW9g4kYjIo_c/exec";

document.addEventListener("DOMContentLoaded", function() {
    if (window.location.pathname.includes("search.html") || window.location.pathname.includes("full-car.html")) {
        const params = new URLSearchParams(window.location.search);
        const searchFrom = params.get('from') || 'Tehri Garhwal';
        const searchTo = params.get('to') || 'Dehradun';
        const searchDate = params.get('date') || '';

        if (document.getElementById('display-from')) document.getElementById('display-from').textContent = searchFrom;
        if (document.getElementById('display-to')) document.getElementById('display-to').textContent = searchTo;
        if (document.getElementById('search-from')) document.getElementById('search-from').value = searchFrom;
        if (document.getElementById('search-to')) document.getElementById('search-to').value = searchTo;
        if (searchDate && document.getElementById('search-date')) document.getElementById('search-date').value = searchDate;

        filterAndDisplayResults(searchFrom, searchTo);
    }
});

async function filterAndDisplayResults(fromLocation, toLocation) {
    const grid = document.getElementById('results-grid');
    const countDisplay = document.getElementById('result-count');
    if(!grid) return;
    
    grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 2rem;">Searching for live rides...</p>';

    try {
        const response = await fetch(databaseURL + "?action=getDrivers");
        const liveDrivers = await response.json();
        const isFullCarPage = window.location.pathname.includes("full-car.html");

        const searchDate = new URLSearchParams(window.location.search).get('date') || '';
        const today = new Date().toISOString().split('T')[0];

        const results = liveDrivers.filter(driver => {
            const tripType     = driver.trip_type || 'Sharing';
            const availDate    = driver.available_date || 'Flexible';
            const isFlexible   = availDate === 'Flexible';
            const isSharingType = tripType === 'Sharing' || tripType === 'Both' || !driver.trip_type;
            const isFullType   = tripType === 'Full Vehicle' || tripType === 'Both';

            // ── ISSUE 1: Hide driver on their blocked dates ──────────────
            if (searchDate && driver.blocked_dates && driver.blocked_dates !== 'none') {
                const blocked = driver.blocked_dates.split(',').map(d => d.trim()).filter(Boolean);
                if (blocked.includes(searchDate)) return false;
            }

            // ── ISSUE 2: Hide drivers whose specific date has passed ─────
            if (!isFlexible && availDate < today) return false;

            if (isFullCarPage) {
                // ── ISSUE 3 & 4: Full car page ──────────────────────────
                // Show Full Vehicle type drivers (route-specific OR Anywhere)
                if (!isFullType) return false;

                // Filter by route — if driver set specific route match it
                // Anywhere drivers always show
                const fromMatch = driver.from === fromLocation || driver.from === 'Anywhere';
                const toMatch   = driver.to === toLocation     || driver.to === 'Anywhere';
                if (!(fromMatch && toMatch)) return false;

                // Full car ignores date expiry — it stays listed
                return true;

            } else {
                // ── Seat sharing page ────────────────────────────────────
                if (!isSharingType) return false;

                // ── ISSUE 4: Hide seat sharing if specific date has passed ─
                // (listing disappears from seat sharing after the date)
                if (!isFlexible && availDate < today) return false;

                // ── ISSUE 3: Full Vehicle only drivers dont show in seat sharing ─
                if (tripType === 'Full Vehicle') return false;

                // If passenger picked a date and driver has specific date, must match
                if (searchDate && !isFlexible && availDate !== searchDate) return false;

                // Filter by route
                const fromMatch = driver.from === fromLocation || driver.from === 'Anywhere';
                const toMatch   = driver.to === toLocation     || driver.to === 'Anywhere';
                return fromMatch && toMatch;
            }
        });

        if (countDisplay) countDisplay.textContent = `(${results.length} found)`;
        grid.innerHTML = '';

        if (results.length === 0) {
            grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: white; border-radius: 1rem;"><h3 style="color: #64748b; margin-bottom: 0.5rem;">No rides found</h3><p style="color: #94a3b8;">Try a different route or check back later.</p></div>`;
            return;
        }

        results.forEach(driver => {
            const verifiedBadge = driver.verified ? `<span class="badge-verified"><i class="fa-solid fa-circle-check"></i> Verified</span>` : ``;
            const avatarColor = driver.verified ? '' : 'bg-gray';
            const avatarContent = driver.photo 
                ? `<img src="${driver.photo}" alt="${driver.name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`
                : `<i class="fa-solid fa-user${driver.verified ? '-tie' : ''}"></i>`;

            const displayFrom = driver.from === "Anywhere" ? "All Uttarakhand" : driver.from;
            const displayTo = driver.to === "Anywhere" ? "Any Destination" : driver.to;

            let actionButtons = '';
            let priceDisplay = '';

            if (isFullCarPage) {
                priceDisplay = `<span class="amount">Negotiable</span>`;
                actionButtons = `<button class="btn-whatsapp" style="background-color: #0ea5e9; width: 100%; border: none; padding: 0.75rem; border-radius: 0.5rem; color: white; font-weight: 600; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 0.5rem;" onclick="window.open('https://wa.me/91${driver.phone}?text=Hi ${driver.name}, I want to book your ${driver.vehicle} for a trip.', '_blank')"><i class="fa-solid fa-car"></i> Book Whole Car</button>`;
            } else {
                priceDisplay = `<span class="amount">₹${driver.price || '0'}</span> / seat`;
                actionButtons = `<div style="display: flex; gap: 0.5rem;"><button class="btn-whatsapp" onclick="window.open('https://wa.me/91${driver.phone}?text=Hi ${driver.name}, I found your ride on PahadiRide.', '_blank')"><i class="fa-brands fa-whatsapp"></i> Chat</button><button class="btn-call" onclick="window.location.href='tel:+91${driver.phone}'"><i class="fa-solid fa-phone"></i> Call</button></div>`;
            }

            grid.innerHTML += `
                <div class="driver-card">
                    <div class="card-header"><div class="driver-profile"><div class="driver-avatar ${avatarColor}">${avatarContent}</div><div><h3 class="driver-name">${driver.name} ${verifiedBadge}</h3><p class="driver-vehicle">${driver.vehicle}</p></div></div></div>
                    <div class="card-body">
                        <div class="route-info"><div class="route-point"><span>${displayFrom}</span></div><div class="route-line"></div><div class="route-point"><span>${displayTo}</span></div></div>
                        <div class="trip-details"><div class="detail-item">Departs: <strong>${driver.departure || 'N/A'}</strong></div><div class="detail-item">Seats: <strong>${driver.seats || 'N/A'}</strong></div></div>
                    </div>
                    <div class="card-footer"><div class="price">${priceDisplay}</div><div class="action-buttons">${actionButtons}</div></div>
                </div>`;
        });
    } catch (err) {
        grid.innerHTML = '<p style="text-align: center; color: red;">Database Connection Error.</p>';
    }
}

// ==========================================
// 4. ACCOUNT TYPE TOGGLE LOGIC
// ==========================================
window.setAccountType = function(type) {
    const btnPassenger = document.getElementById('btn-passenger');
    const btnDriver = document.getElementById('btn-driver');
    const driverFields = document.getElementById('driver-fields');
    const vehicleInput = document.getElementById('signup-vehicle');
    const rcInput = document.getElementById('signup-rc');

    if (type === 'driver') {
        btnDriver.classList.add('active');
        btnPassenger.classList.remove('active');
        driverFields.style.display = 'flex';
        if(vehicleInput) vehicleInput.required = true;
        if(rcInput) rcInput.required = true;
    } else {
        btnPassenger.classList.add('active');
        btnDriver.classList.remove('active');
        driverFields.style.display = 'none';
        if(vehicleInput) vehicleInput.required = false;
        if(rcInput) rcInput.required = false;
    }
}

// ==========================================
// 5. REGISTRATION LOGIC WITH RC VALIDATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const regForm = document.getElementById('signup-form');
    if (regForm) {
        regForm.addEventListener('submit', function(e) {
            e.preventDefault(); 
            
            const signupRC = document.getElementById('signup-rc')?.value.toUpperCase().replace(/\s/g, '');
            const isDriver = document.getElementById('driver-fields')?.style.display === 'flex';

            // RC Number Validation
            if (isDriver && signupRC) {
                const rcPattern = /^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/;
                if (!rcPattern.test(signupRC)) {
                    alert("Invalid RC Number! Please use format: UK07AB1234 (No spaces)");
                    return;
                }
            }

            const submitBtn = regForm.querySelector('.proceed-btn');
            const formData = {
                action: "signup",
                name: document.getElementById('signup-name').value,
                phone: document.getElementById('signup-phone').value,
                vehicle: document.getElementById('signup-vehicle')?.value || "Passenger",
                rc_number: signupRC || "N/A",
                password: document.getElementById('signup-password').value, 
                timestamp: new Date().toLocaleString()
            };
            
            submitBtn.innerHTML = 'Saving...';
            submitBtn.style.opacity = '0.7';

            fetch(databaseURL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(formData) })
            .then(() => {
                const successToast = document.getElementById('signup-success');
                if (successToast) successToast.style.display = 'flex';
                setTimeout(() => { window.location.href = "signin.html"; }, 2000);
            })
            .catch(err => {
                alert("Connection Error.");
                submitBtn.innerHTML = 'Create Account';
                submitBtn.style.opacity = '1';
            });
        });
    }
});

// ==========================================
// 6. LOGIN LOGIC
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('signin-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const phone = document.getElementById('login-phone').value;
            const pass = document.getElementById('login-password').value;
            const submitBtn = loginForm.querySelector('.proceed-btn');

            submitBtn.innerHTML = 'Checking...';
            
            fetch(databaseURL + "?phone=" + encodeURIComponent(phone) + "&password=" + encodeURIComponent(pass))
            .then(res => res.json())
            .then(data => {
                if (data.found) {
                    localStorage.setItem('pahadiRideUser', phone);
                    localStorage.setItem('pahadiRidePass', pass);
                    window.location.href = "dashboard.html";
                } else {
                    alert("Incorrect details!");
                    submitBtn.innerHTML = 'Sign In';
                }
            });
        });
    }
});

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}
document.addEventListener('DOMContentLoaded', () => {
    // If we are on the signup page, automatically show driver fields
    const driverFields = document.getElementById('driver-fields');
    if (driverFields) {
        driverFields.style.display = 'flex'; // Force visible
        const vInput = document.getElementById('signup-vehicle');
        const rcInput = document.getElementById('signup-rc');
        if(vInput) vInput.required = true;
        if(rcInput) rcInput.required = true;
        
        // Remove any toggle buttons that let users choose "Passenger"
        const toggleBtns = document.querySelector('.account-toggle');
        if(toggleBtns) toggleBtns.style.display = 'none';
    }
});

