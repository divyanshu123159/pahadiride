// ==========================================
// 1. PWA SERVICE WORKER & INSTALL BANNER
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => console.error('SW failed', err));
    });
}

window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); });

document.addEventListener("DOMContentLoaded", function() {
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (!isInstalled && !window.location.pathname.includes("dashboard.html")) {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const banner = document.createElement('div');
        banner.style.cssText = "position:fixed;bottom:0;left:0;right:0;background:#1e293b;color:white;padding:1rem;z-index:9999;box-shadow:0 -4px 6px -1px rgba(0,0,0,0.1);font-size:0.9rem;display:flex;align-items:center;justify-content:space-between;gap:10px;";
        banner.innerHTML = `
            <div style="text-align:left;line-height:1.4;">${isIOS ? `Install PahadiRide: Tap <strong>Share</strong> then <strong>"Add to Home Screen"</strong>` : `Install PahadiRide: Tap <strong>3 dots</strong> top right → <strong>"Add to Home screen"</strong>`}</div>
            <button onclick="this.parentElement.style.display='none'" style="background:#3b82f6;color:white;border:none;padding:8px 16px;border-radius:6px;font-weight:bold;cursor:pointer;white-space:nowrap;">Got it</button>
        `;
        document.body.appendChild(banner);
    }
});

// ==========================================
// 2. NAVBAR - AUTO SWITCH SIGN IN / DASHBOARD
// ==========================================
document.addEventListener("DOMContentLoaded", function() {
    const loggedInPhone = localStorage.getItem('pahadiRideUser');
    const loggedInPass  = localStorage.getItem('pahadiRidePass');
    const navBtn = document.querySelector('.navbar .sign-in-btn');

    if (navBtn) {
        if (loggedInPhone && loggedInPass) {
            navBtn.innerHTML = '<i class="fa-solid fa-gauge-high"></i> Dashboard';
            navBtn.onclick = function() { window.location.href = 'dashboard.html'; };
        } else {
            navBtn.innerHTML = '<i class="fa-regular fa-user-circle"></i> Sign In';
            navBtn.onclick = function() { window.location.href = 'signin.html'; };
        }
    }

    if (loggedInPhone && loggedInPass &&
        (window.location.pathname.includes("signin.html") || window.location.pathname.includes("signup.html"))) {
        window.location.href = "dashboard.html";
    }
});

// ==========================================
// 3. DATABASE + SEARCH WITH DATE FILTER & SHARE
// ==========================================
const databaseURL = "https://script.google.com/macros/s/AKfycbw30qgkPH8ljRmoCpB1XV6zIaiD5PcKsU1HFt1KWEkZ4KM2pVCEMlJbW9g4kYjIo_c/exec";

function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

document.addEventListener("DOMContentLoaded", function() {
    if (window.location.pathname.includes("search.html") || window.location.pathname.includes("full-car.html")) {
        const params     = new URLSearchParams(window.location.search);
        const searchFrom = params.get('from') || 'Tehri Garhwal';
        const searchTo   = params.get('to')   || 'Dehradun';
        const searchDate = params.get('date')  || '';

        if (document.getElementById('display-from')) document.getElementById('display-from').textContent = searchFrom;
        if (document.getElementById('display-to'))   document.getElementById('display-to').textContent   = searchTo;
        if (document.getElementById('display-date') && searchDate) document.getElementById('display-date').textContent = formatDate(searchDate);
        if (document.getElementById('search-from')) document.getElementById('search-from').value = searchFrom;
        if (document.getElementById('search-to'))   document.getElementById('search-to').value   = searchTo;
        if (searchDate && document.getElementById('search-date')) document.getElementById('search-date').value = searchDate;

        filterAndDisplayResults(searchFrom, searchTo, searchDate);
    }
});

async function filterAndDisplayResults(fromLocation, toLocation, searchDate) {
    const grid = document.getElementById('results-grid');
    const countDisplay = document.getElementById('result-count');
    if (!grid) return;

    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:2rem;color:#64748b;"><i class="fa-solid fa-spinner fa-spin"></i> Searching for live rides...</p>';

    try {
        const response   = await fetch(databaseURL + "?action=getDrivers");
        const liveDrivers = await response.json();
        const isFullCarPage = window.location.pathname.includes("full-car.html");

        const results = liveDrivers.filter(driver => {
            if (driver.status === "offline") return false;

            const fromMatch = driver.from === fromLocation || driver.from === "Anywhere";
            const toMatch   = driver.to   === toLocation   || driver.to   === "Anywhere";
            if (!(fromMatch && toMatch)) return false;

            // ✅ DATE FILTER
            if (searchDate && driver.available_date && driver.available_date !== "Flexible" && driver.available_date !== "") {
                if (new Date(driver.available_date).toDateString() !== new Date(searchDate).toDateString()) return false;
            }

            return isFullCarPage
                ? (driver.trip_type === "Full Vehicle" || driver.trip_type === "Both")
                : (driver.trip_type === "Sharing" || driver.trip_type === "Both" || !driver.trip_type);
        });

        if (countDisplay) countDisplay.textContent = `(${results.length} found)`;
        grid.innerHTML = '';

        if (results.length === 0) {
            grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;background:white;border-radius:1rem;">
                <i class="fa-solid fa-car-burst" style="font-size:2.5rem;color:#cbd5e1;margin-bottom:1rem;display:block;"></i>
                <h3 style="color:#64748b;margin-bottom:0.5rem;">No rides found</h3>
                <p style="color:#94a3b8;">Try a different route or date, or check back later.</p>
            </div>`;
            return;
        }

        results.forEach(driver => {
            const verifiedBadge = driver.verified ? `<span class="badge-verified"><i class="fa-solid fa-circle-check"></i> Verified</span>` : '';
            const avatarContent = driver.photo
                ? `<img src="${driver.photo}" alt="${driver.name}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`
                : `<i class="fa-solid fa-user${driver.verified ? '-tie' : ''}"></i>`;
            const displayFrom = driver.from === "Anywhere" ? "All Uttarakhand" : driver.from;
            const displayTo   = driver.to   === "Anywhere" ? "Any Destination"  : driver.to;
            const dateLabel   = (driver.available_date && driver.available_date !== "Flexible" && driver.available_date !== "")
                ? formatDate(driver.available_date) : "Daily / Flexible";

            // ✅ WHATSAPP SHARE
            const shareMsg = encodeURIComponent(
                `🚗 Found a ride on PahadiRide!\n\nDriver: ${driver.name}\nVehicle: ${driver.vehicle}\nRoute: ${displayFrom} → ${displayTo}\nDeparts: ${driver.departure || 'Flexible'} | Date: ${dateLabel}\nPrice: ₹${driver.price || '0'}/seat\n\nContact: +91${driver.phone}\n🔗 pahadiride.in`
            );
            const shareBtn = `<button title="Share this ride" style="background:#f0fdf4;border:1px solid #bbf7d0;color:#16a34a;padding:0.6rem 0.9rem;border-radius:0.5rem;cursor:pointer;font-weight:600;" onclick="window.open('https://wa.me/?text=${shareMsg}','_blank')"><i class="fa-solid fa-share-nodes"></i></button>`;

            let actionButtons, priceDisplay;
            if (isFullCarPage) {
                priceDisplay  = `<span class="amount">Negotiable</span>`;
                actionButtons = `<div style="display:flex;gap:0.5rem;">
                    <button class="btn-whatsapp" style="flex:1;background:#0ea5e9;border:none;padding:0.75rem;border-radius:0.5rem;color:white;font-weight:600;cursor:pointer;display:flex;justify-content:center;align-items:center;gap:0.5rem;"
                        onclick="window.open('https://wa.me/91${driver.phone}?text=Hi ${driver.name}, I want to book your ${driver.vehicle} for a full car trip.','_blank')">
                        <i class="fa-solid fa-car"></i> Book Whole Car
                    </button>${shareBtn}</div>`;
            } else {
                priceDisplay  = `<span class="amount">₹${driver.price || '0'}</span> / seat`;
                actionButtons = `<div style="display:flex;gap:0.5rem;">
                    <button class="btn-whatsapp" onclick="window.open('https://wa.me/91${driver.phone}?text=Hi ${driver.name}, I found your ride on PahadiRide.','_blank')"><i class="fa-brands fa-whatsapp"></i> Chat</button>
                    <button class="btn-call" onclick="window.location.href='tel:+91${driver.phone}'"><i class="fa-solid fa-phone"></i> Call</button>
                    ${shareBtn}</div>`;
            }

            grid.innerHTML += `
                <div class="driver-card">
                    <div class="card-header"><div class="driver-profile">
                        <div class="driver-avatar ${driver.verified ? '' : 'bg-gray'}">${avatarContent}</div>
                        <div><h3 class="driver-name">${driver.name} ${verifiedBadge}</h3><p class="driver-vehicle">${driver.vehicle}</p></div>
                    </div></div>
                    <div class="card-body">
                        <div class="route-info">
                            <div class="route-point"><span>${displayFrom}</span></div>
                            <div class="route-line"></div>
                            <div class="route-point"><span>${displayTo}</span></div>
                        </div>
                        <div class="trip-details">
                            <div class="detail-item">Departs: <strong>${driver.departure || 'Flexible'}</strong></div>
                            <div class="detail-item">Date: <strong>${dateLabel}</strong></div>
                            <div class="detail-item">Seats: <strong>${driver.seats || 'N/A'}</strong></div>
                        </div>
                    </div>
                    <div class="card-footer"><div class="price">${priceDisplay}</div><div class="action-buttons">${actionButtons}</div></div>
                </div>`;
        });
    } catch (err) {
        grid.innerHTML = '<p style="text-align:center;color:red;padding:2rem;">Database Connection Error. Please try again.</p>';
    }
}

// ==========================================
// 4. REGISTRATION (DRIVER ONLY)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const regForm = document.getElementById('signup-form');
    if (regForm) {
        regForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const signupRC = document.getElementById('signup-rc')?.value.toUpperCase().replace(/\s/g, '');
            if (signupRC) {
                const rcPattern = /^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/;
                if (!rcPattern.test(signupRC)) { alert("Invalid RC Number! Format: UK07AB1234"); return; }
            }
            const submitBtn = regForm.querySelector('.proceed-btn');
            submitBtn.innerHTML = 'Saving...';
            submitBtn.style.opacity = '0.7';
            fetch(databaseURL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({
                action: "signup",
                name: document.getElementById('signup-name').value,
                phone: document.getElementById('signup-phone').value,
                vehicle: document.getElementById('signup-vehicle')?.value || "",
                rc_number: signupRC || "",
                password: document.getElementById('signup-password').value,
                timestamp: new Date().toLocaleString()
            })})
            .then(() => {
                const t = document.getElementById('signup-success');
                if (t) t.style.display = 'flex';
                setTimeout(() => { window.location.href = "signin.html"; }, 2000);
            })
            .catch(() => { alert("Connection Error."); submitBtn.innerHTML = 'Create Driver Account'; submitBtn.style.opacity = '1'; });
        });
    }
});

// ==========================================
// 5. LOGIN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('signin-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const phone = document.getElementById('login-phone').value;
            const pass  = document.getElementById('login-password').value;
            const btn   = loginForm.querySelector('.proceed-btn');
            btn.innerHTML = 'Checking...';
            fetch(databaseURL + "?phone=" + encodeURIComponent(phone) + "&password=" + encodeURIComponent(pass))
            .then(r => r.json())
            .then(data => {
                if (data.found) {
                    localStorage.setItem('pahadiRideUser', phone);
                    localStorage.setItem('pahadiRidePass', pass);
                    window.location.href = "dashboard.html";
                } else { alert("Incorrect details!"); btn.innerHTML = 'Sign In'; }
            });
        });
    }
});

function logout() { localStorage.clear(); window.location.href = 'index.html'; }