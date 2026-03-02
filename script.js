// 1. MOCK DATABASE (You will eventually replace this with Google Sheets or a real DB)
const driverDatabase = [
    {
        id: 1,
        name: "Ramesh Singh",
        vehicle: "Mahindra Bolero • UK 07 TA 1234",
        from: "Tehri Garhwal",
        to: "Dehradun",
        departure: "08:30 AM",
        seatsLeft: 3,
        price: 400,
        verified: true
    },
    {
        id: 2,
        name: "Suresh Kumar",
        vehicle: "Maruti Ertiga • UK 14 XY 5678",
        from: "Tehri Garhwal",
        to: "Dehradun",
        departure: "11:00 AM",
        seatsLeft: 5,
        price: 500,
        verified: false
    },
    {
        id: 3,
        name: "Amit Negi",
        vehicle: "Toyota Innova • UK 07 AB 9012",
        from: "Dehradun",
        to: "Delhi (NCR)",
        departure: "09:00 PM",
        seatsLeft: 2,
        price: 1200,
        verified: true
    }
];

// 2. MAIN LOGIC ON PAGE LOAD
document.addEventListener("DOMContentLoaded", function() {
    
    // Only run the search logic if we are on the search.html page
    if (window.location.pathname.includes("search.html")) {
        
        // Extract Data from URL
        const params = new URLSearchParams(window.location.search);
        const searchFrom = params.get('from') || 'Tehri Garhwal';
        const searchTo = params.get('to') || 'Dehradun';
        const searchDate = params.get('date') || '';

        // Update Text & Forms on the page
        document.getElementById('display-from').textContent = searchFrom;
        document.getElementById('display-to').textContent = searchTo;
        
        if (document.getElementById('search-from')) document.getElementById('search-from').value = searchFrom;
        if (document.getElementById('search-to')) document.getElementById('search-to').value = searchTo;
        if (searchDate && document.getElementById('search-date')) {
            document.getElementById('search-date').value = searchDate;
        }

        // Filter the database
        filterAndDisplayResults(searchFrom, searchTo);
    }
});

// 3. RENDER THE CARDS
function filterAndDisplayResults(fromLocation, toLocation) {
    const grid = document.getElementById('results-grid');
    const countDisplay = document.getElementById('result-count');
    
    // Clear grid first
    grid.innerHTML = '';

    // Find matches in our mock database
    const results = driverDatabase.filter(driver => 
        driver.from === fromLocation && driver.to === toLocation
    );

    // Update the count text
    countDisplay.textContent = `(${results.length} found)`;

    // If no results
    if (results.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: white; border-radius: 1rem;">
                <h3 style="color: #64748b; margin-bottom: 0.5rem;">No direct rides found</h3>
                <p style="color: #94a3b8;">Try changing your date or route.</p>
            </div>
        `;
        return;
    }

    // Generate HTML for each matching driver
    results.forEach(driver => {
        
        const verifiedBadge = driver.verified 
            ? `<span class="badge-verified"><i class="fa-solid fa-circle-check"></i> Verified</span>` 
            : ``;
            
        const avatarColor = driver.verified ? '' : 'bg-gray';

        const cardHTML = `
            <div class="driver-card">
                <div class="card-header">
                    <div class="driver-profile">
                        <div class="driver-avatar ${avatarColor}">
                            <i class="fa-solid fa-user${driver.verified ? '-tie' : ''}"></i>
                        </div>
                        <div>
                            <h3 class="driver-name">${driver.name} ${verifiedBadge}</h3>
                            <p class="driver-vehicle">${driver.vehicle}</p>
                        </div>
                    </div>
                </div>
                
                <div class="card-body">
                    <div class="route-info">
                        <div class="route-point">
                            <i class="fa-solid fa-location-dot text-blue"></i>
                            <span>${driver.from}</span>
                        </div>
                        <div class="route-line"></div>
                        <div class="route-point">
                            <i class="fa-solid fa-location-dot text-green"></i>
                            <span>${driver.to}</span>
                        </div>
                    </div>
                    
                    <div class="trip-details">
                        <div class="detail-item">
                            <i class="fa-regular fa-clock"></i> Departs: <strong>${driver.departure}</strong>
                        </div>
                        <div class="detail-item">
                            <i class="fa-solid fa-chair"></i> Seats Left: <strong>${driver.seatsLeft}</strong>
                        </div>
                    </div>
                </div>

                <div class="card-footer">
                    <div class="price">
                        <span class="amount">₹${driver.price}</span> / seat
                    </div>
                    <div class="action-buttons">
                        ${driver.verified ? `<button class="btn-whatsapp"><i class="fa-brands fa-whatsapp"></i> Chat</button>` : ''}
                        <button class="btn-call ${driver.verified ? '' : 'full-width'}"><i class="fa-solid fa-phone"></i> Call</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add the new card HTML to the grid
        grid.innerHTML += cardHTML;
    });

}
// Paste your Web App URL between the quotes
const databaseURL = "https://script.google.com/macros/s/AKfycbzyPaN76nwkLSi6J7voX32iItepO9fUA1AzFQs5WImyxwnQqGPZXlI23WLp5lUXX0I/exec"; 

function handleSignup(event) {
    event.preventDefault(); // This stops the page from refreshing

    // This matches the IDs exactly from your 14th screenshot
    const formData = {
        name: document.getElementById('fullname').value, 
        phone: document.getElementById('phone').value,
        // Using a fallback for fields that might be hidden (like Driver fields)
        route: document.getElementById('route')?.value || "General",
        vehicle: document.getElementById('vehicleNumber')?.value || "Passenger",
        timestamp: new Date().toISOString()
    };

    fetch(databaseURL, {
        method: 'POST',
        mode: 'no-cors', 
        body: JSON.stringify(formData)
    })
    .then(() => {
        alert("Registration Successful!");
        window.location.href = "signin.html"; 
    })
    .catch(error => {
        console.error('Error!', error);
        alert("Something went wrong. Please check your internet.");
    });
}

