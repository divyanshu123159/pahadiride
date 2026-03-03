
// Register Service Worker for PWA Install
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registered!', reg))
            .catch(err => console.error('Service Worker failed!', err));
    });
}

document.addEventListener("DOMContentLoaded", function() {
    // --- 1. GLOBAL NAVBAR LOGIN CHECK ---
    const loggedInPhone = localStorage.getItem('pahadiRideUser');
    const navBtn = document.querySelector('.navbar .sign-in-btn'); // Finds the button in the top right
    
    if (navBtn) {
        if (loggedInPhone) {
            // User IS logged in: Change button to "Dashboard"
            navBtn.innerHTML = '<i class="fa-solid fa-user-check"></i> Dashboard';
            navBtn.onclick = function() {
                window.location.href = 'dashboard.html';
            };
        } else {
            // User is NOT logged in: Keep it as "Sign In"
            navBtn.innerHTML = '<i class="fa-regular fa-user-circle"></i> Sign In';
            navBtn.onclick = function() {
                window.location.href = 'signin.html';
            };
        }
    }

    // --- 2. AUTO-REDIRECT FROM LOGIN PAGE ---
    // If they are already logged in but accidentally click a link to signin/signup, bounce them to the dashboard
    if (loggedInPhone && (window.location.pathname.includes("signin.html") || window.location.pathname.includes("signup.html"))) {
        window.location.href = "dashboard.html";
    }
});
// --- 1. LIVE DATABASE LOGIC (Search Page) ---
const databaseURL = "https://script.google.com/macros/s/AKfycbzyPaN76nwkLSi6J7voX32iItepO9fUA1AzFQs5WImyxwnQqGPZXlI23WLp5lUXX0I/exec";

document.addEventListener("DOMContentLoaded", function() {
    if (window.location.pathname.includes("search.html")) {
        const params = new URLSearchParams(window.location.search);
        const searchFrom = params.get('from') || 'Tehri Garhwal';
        const searchTo = params.get('to') || 'Dehradun';
        const searchDate = params.get('date') || '';

        if (document.getElementById('display-from')) document.getElementById('display-from').textContent = searchFrom;
        if (document.getElementById('display-to')) document.getElementById('display-to').textContent = searchTo;
        if (document.getElementById('search-from')) document.getElementById('search-from').value = searchFrom;
        if (document.getElementById('search-to')) document.getElementById('search-to').value = searchTo;
        if (searchDate && document.getElementById('search-date')) document.getElementById('search-date').value = searchDate;

        // Call the updated async search function
        filterAndDisplayResults(searchFrom, searchTo);
    }
});

async function filterAndDisplayResults(fromLocation, toLocation) {
    const grid = document.getElementById('results-grid');
    const countDisplay = document.getElementById('result-count');
    if(!grid) return;
    
    grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 2rem;">Searching for live rides...</p>';

    try {
        // Fetch live data from Google Sheets instead of the mock array
        const response = await fetch(databaseURL + "?action=getDrivers");
        const liveDrivers = await response.json();

        // Filter based on the route
        const results = liveDrivers.filter(driver => 
            driver.from === fromLocation && driver.to === toLocation
        );

        countDisplay.textContent = `(${results.length} found)`;
        grid.innerHTML = '';

        if (results.length === 0) {
            grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: white; border-radius: 1rem;"><h3 style="color: #64748b; margin-bottom: 0.5rem;">No direct rides found</h3><p style="color: #94a3b8;">Try changing your date or route.</p></div>`;
            return;
        }

        results.forEach(driver => {
            const verifiedBadge = driver.verified ? `<span class="badge-verified"><i class="fa-solid fa-circle-check"></i> Verified</span>` : ``;
            const avatarColor = driver.verified ? '' : 'bg-gray';
            grid.innerHTML += `
                <div class="driver-card">
                    <div class="card-header"><div class="driver-profile"><div class="driver-avatar ${avatarColor}"><i class="fa-solid fa-user${driver.verified ? '-tie' : ''}"></i></div><div><h3 class="driver-name">${driver.name} ${verifiedBadge}</h3><p class="driver-vehicle">${driver.vehicle}</p></div></div></div>
                    <div class="card-body"><div class="route-info"><div class="route-point"><i class="fa-solid fa-location-dot text-blue"></i><span>${driver.from}</span></div><div class="route-line"></div><div class="route-point"><i class="fa-solid fa-location-dot text-green"></i><span>${driver.to}</span></div></div><div class="trip-details"><div class="detail-item"><i class="fa-regular fa-clock"></i> Departs: <strong>${driver.departure || 'N/A'}</strong></div><div class="detail-item"><i class="fa-solid fa-chair"></i> Seats Left: <strong>${driver.seats || 'N/A'}</strong></div></div></div>
                    <div class="card-footer"><div class="price"><span class="amount">₹${driver.price || '0'}</span> / seat</div><div class="action-buttons" style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem;">
                        
                        <div style="display: flex; gap: 0.5rem;">
                            ${driver.verified ? `
                            <button class="btn-whatsapp" onclick="window.open('https://wa.me/91${driver.phone}?text=Hi ${driver.name}, I found your ride from ${driver.from} to ${driver.to} on PahadiRide. Are seats still available?', '_blank')">
                                <i class="fa-brands fa-whatsapp"></i> Chat
                            </button>` : ''}
                            
                            <button class="btn-call ${driver.verified ? '' : 'full-width'}" onclick="window.location.href='tel:+91${driver.phone}'">
                                <i class="fa-solid fa-phone"></i> Call
                            </button>
                        </div>

                        ${driver.verified ? `
                        <button class="btn-whatsapp" style="background-color: #0ea5e9; width: 100%; border: none; padding: 0.75rem; border-radius: 0.5rem; color: white; font-weight: 600; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 0.5rem;" onclick="window.open('https://wa.me/91${driver.phone}?text=Hi ${driver.name}, I want to book your ENTIRE vehicle from ${driver.from} to ${driver.to} on PahadiRide. What is your price for the full booking?', '_blank')">
                            <i class="fa-solid fa-car"></i> Book Whole Car
                        </button>
                        ` : ''}

                    </div>
        });
    } catch (err) {
        console.error("Search failed:", err);
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: red;">Unable to connect to live database.</p>';
    }
}

// --- 2. ACCOUNT TYPE TOGGLE LOGIC ---
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

// --- 3. REGISTRATION LOGIC ---
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    if(params.get('type') === 'driver') setAccountType('driver');

    const regForm = document.getElementById('signup-form');
    if (regForm) {
        regForm.addEventListener('submit', function(e) {
            e.preventDefault(); 
            const submitBtn = regForm.querySelector('.proceed-btn');
            
            const formData = {
                action: "signup",
                name: document.getElementById('signup-name').value,
                phone: document.getElementById('signup-phone').value,
                vehicle: document.getElementById('signup-vehicle')?.value || "Passenger",
                rc_number: document.getElementById('signup-rc')?.value || "N/A",
                timestamp: new Date().toLocaleString()
            };

            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
            submitBtn.style.opacity = '0.7';

            fetch(databaseURL, {
                method: 'POST',
                mode: 'no-cors',
                body: JSON.stringify(formData)
            })
            .then(() => {
                const successToast = document.getElementById('signup-success');
                if (successToast) successToast.style.display = 'flex';
                setTimeout(() => { window.location.href = "signin.html"; }, 2000);
            })
            .catch(err => {
                alert("Connection Error. Check your internet.");
                submitBtn.innerHTML = 'Create Account';
                submitBtn.style.opacity = '1';
            });
        });
    }
});
// --- SMART INSTALL INSTRUCTION BANNER ---
document.addEventListener("DOMContentLoaded", function() {
    // 1. Check if the app is already installed
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    
    // 2. If it is NOT installed, show the educational banner
    if (!isInstalled) {
        // Detect if they are on an iPhone/iPad
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        
        // Create the banner UI
        const banner = document.createElement('div');
        banner.style.cssText = "position: fixed; bottom: 0; left: 0; right: 0; background: #1e293b; color: white; padding: 1rem; text-align: center; z-index: 9999; box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1); font-size: 0.9rem; display: flex; align-items: center; justify-content: space-between; gap: 10px;";
        
        let instructionText = "";
        if (isIOS) {
            instructionText = `Install PahadiRide: Tap the <strong>Share</strong> icon below, then <strong>"Add to Home Screen"</strong>`;
        } else {
            instructionText = `Install PahadiRide: Tap the <strong>3 dots</strong> <i class="fa-solid fa-ellipsis-vertical"></i> top right, then <strong>"Add to Home screen"</strong>`;
        }
        
        banner.innerHTML = `
            <div style="text-align: left; line-height: 1.4;">${instructionText}</div>
            <button onclick="this.parentElement.style.display='none'" style="background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; white-space: nowrap;">Got it</button>
        `;
        
        // Add the banner to the page
        document.body.appendChild(banner);
    }
});


