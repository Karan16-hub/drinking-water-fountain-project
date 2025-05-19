/**StAuth10244: I Karanveer Singh, 000930881 certify that this material is my original work. No other person's work has been used without due acknowledgement. I have not made my work available to anyone else**/


let map;
let userMarker = null;  // Declare globally so it's accessible everywhere
let directionsService;  // google service for routes
let directionsRenderer; 
let allFountainNames = []; // Store fountain names for search
let allFountainMarkers = []; // Store all markers for filtering

// Filter tracking system - tracks active filters.
let activeFilters = {
    status: null, // 'on' (functional) or null
    bottle: null, // 'yes' (has bottle filler) or null
    dog: null // 'yes' (has dog bowl) or null
};

//Function to convert UTM to Lat/Lng (Google Maps needs lat/lng)
proj4.defs("EPSG:32617", "+proj=utm +zone=17 +datum=WGS84 +units=m +no_defs");

function convertUTMToLatLng(easting, northing) {
    // Takes UTM coords and gives back lat/lng, otherwise Google Maps won't work
    let latLng = proj4("EPSG:32617", "WGS84", [easting, northing]);
    return { lat: latLng[1], lng: latLng[0] }; // Returns in the format Google Maps wants
}


function initMap() {
    // setting up the map.
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 43.2387, lng: -79.88 }, // Hamilton coords (Mohawk College coords to be exact)
        zoom: 12, // zoom to see details
        mapId: "3b7c2dac2ec36507" // custom styling ID for the map
    });

    // Initialize Google Maps Directions Service & Renderer
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: false // Keep default markers (can be changed)
    });

    //Fetch CSV and convert to JSON dynamically
    fetch('https://raw.githubusercontent.com/Karan16-hub/drinking-water-fountain-project/main/Drinking_Fountains.csv')
        .then(response => response.text()) // reads CSV as plain text
        .then(csvText => {
            const jsonData = csvToJson(csvText); // Convert CSV to JSON

            jsonData.forEach(fountain => {
                // Convert UTM coordinates to lat/lng for Google Maps
                let latLng = convertUTMToLatLng(parseFloat(fountain.Easting), parseFloat(fountain.Northing));

                // Ensure the coordinates are valid before adding markers
                if (latLng && !isNaN(latLng.lat) && !isNaN(latLng.lng)) {
                    addMarker(
                        latLng.lat, 
                        latLng.lng, 
                        fountain.Address, 
                        fountain.Status.toLowerCase(), 
                        fountain.Dog_Bowl.toLowerCase(), 
                        fountain.Bottle_Filler.toLowerCase()
                    );
                    allFountainNames.push({ name: fountain.Address, lat: latLng.lat, lng: latLng.lng });
                } else {
                    console.warn(`Skipping: ${fountain.Address} (Invalid coordinates)`); // Log invalid rows
                }
            });
        })
        .catch(error => console.error("Error loading the CSV file:", error)); // Handle fetch errors
}

// Convert CSV to JSON Function
function csvToJson(csvText) {
    const rows = csvText.split("\n");
    const headers = rows[0].split(","); // Extract column headers

    let jsonData = [];

    rows.slice(1).forEach(row => {
        const values = row.split(",");
        let obj = {};

        headers.forEach((header, index) => {
            obj[header.trim()] = values[index] ? values[index].trim() : ""; // Assign values
        });

        jsonData.push(obj);
    });

    return jsonData;
}


// Function to add markers to the map
function addMarker(lat, lng, title, status = "off", dogBowl = "no", bottleFiller = "no", isUserAdded = false) {
    const position = new google.maps.LatLng(lat, lng);

    const marker = new google.maps.Marker({
        position: position,
        map: map,
        title: title,
        icon: {
            url: isUserAdded ? "http://maps.google.com/mapfiles/ms/icons/red-dot.png" : 
                               "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
            scaledSize: new google.maps.Size(40, 40) 
        }
    });

    // info window popup when marker is clicked
    const infoWindow = new google.maps.InfoWindow({
        content: `<div class="p-2">
                    <h4>${title}</h4>
                    <p>${isUserAdded ? "User-added location" : "Public drinking fountain"}</p>
                    <button onclick="showRouteToFountain(${lat}, ${lng})" 
                    class="btn btn-outline-success btn-sm mt-2">
                    Get Directions
                    </button>
                </div>`
    });

    marker.addListener("click", () => {
        infoWindow.open(map, marker);
    });

    if (isUserAdded) {
        userMarkers.push(marker); // Store user markers separately
    } else {
        allFountainMarkers.push({ marker, status, dogBowl, bottleFiller });
    }
}

function locateUserLocation() {
    // Get the user's location and place a special marker for it
    navigator.geolocation.getCurrentPosition(position => {
        let userLat = position.coords.latitude; // Latitude of user
        let userLng = position.coords.longitude; // Longitude of user

        let userPosition = new google.maps.LatLng(userLat, userLng); // Google Maps-friendly format
        
        if (userMarker) {
            userMarker.setMap(null); // Remove existing marker if already set
        }

        //Creating the marker that will represent the user's current position
        userMarker = new google.maps.Marker({
            position: userPosition,
            map: map, // Placing on the existing map
            title: "You're Here!", // Label for the user marker
            icon: {
                url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png", // Red marker to stand out
                scaledSize: new google.maps.Size(40, 40) // Size adjusted for better visibility
            }
        });

        // Info window for when user clicks on their own location marker
        let infoPopup = new google.maps.InfoWindow({
            content: `<h4>Your Location!</h4><p>This is where you are right now!</p>` 
        });

        //When user clicks their own marker, show the popup
        userMarker.addListener("click", () => {
            infoPopup.open(map, userMarker);
        });

        //Re-centering the map on the user's location for better UI
        map.setCenter(userPosition);

    }, error => {
        console.error("Error retrieving user location:", error); // Logs if anything goes wrong
        alert("Failed to get your location. Please enable location access in your browser settings.");
    });
}

//Event listener for "Where Am I?" button
document.getElementById("userlocation").addEventListener("click", locateUserLocation);

function showRouteToFountain(destLat, destLng) {
    if (!userMarker) {
        alert("Please enable location first!"); // Ensures user location exists
        return;
    }

    let userLat = userMarker.getPosition().lat();
    let userLng = userMarker.getPosition().lng();

    console.log(`Getting directions from (${userLat}, ${userLng}) to (${destLat}, ${destLng})`);

    // Clear previous routes before drawing a new one so that there is no conflict while looking for routes as it may lead to confusion if the directions are not removed.
    directionsRenderer.setMap(null); 
    directionsRenderer.setMap(map);  

    let request = {
        origin: { lat: userLat, lng: userLng },
        destination: { lat: destLat, lng: destLng },
        travelMode: google.maps.TravelMode.WALKING
    };

    directionsService.route(request, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
            directionsRenderer.setDirections(result);
        } else {
            alert("Could not retrieve directions. Try again.");
        }
    });
}


// Function to apply multiple filters at once
function applyFilters() {
    allFountainMarkers.forEach(({ marker, status, dogBowl, bottleFiller }) => {
        let showMarker = true;

        // If the user has selected 'ON' fountains, hide anything that is OFF
        if (activeFilters.status && status !== activeFilters.status) {
            showMarker = false;
        }
        // If the user has selected 'Bottle Filler', hide those without it
        if (activeFilters.bottle && bottleFiller !== activeFilters.bottle) {
            showMarker = false;
        }
        // If the user has selected 'Dog Bowl', hide those without it
        if (activeFilters.dog && dogBowl !== activeFilters.dog) {
            showMarker = false;
        }

        marker.setMap(showMarker ? map : null);
    });
}

// Filter Button Event Listeners
document.getElementById("ONstatus").addEventListener("click", () => {
    activeFilters.status = activeFilters.status === "on" ? null : "on";
    applyFilters();
});
document.getElementById("filterBottle").addEventListener("click", () => {
    activeFilters.bottle = activeFilters.bottle === "yes" ? null : "yes";
    applyFilters();
});
document.getElementById("filterDogBowl").addEventListener("click", () => {
    activeFilters.dog = activeFilters.dog === "yes" ? null : "yes";
    applyFilters();
});
document.getElementById("filterAll").addEventListener("click", () => {
    activeFilters = { status: null, bottle: null, dog: null }; 
    applyFilters();
});

// Function to reset the map to the default view
function recenterMaptoNormalView() {
    map.setCenter({ lat: 43.2387, lng: -79.88 }); 
    map.setZoom(12); 
}
document.getElementById("BacktoDefault").addEventListener("click", recenterMaptoNormalView);

function findClosestFountains() {
    if (!userMarker) {
        alert("Please enable location first!"); // Ensures user location exists
        return;
    }

    let userLat = userMarker.getPosition().lat();
    let userLng = userMarker.getPosition().lng();
    let closestFountain = null;
    let closestDistance = Infinity;

    // Loop through all fountains and find the single closest one
    allFountainMarkers.forEach(({ marker }) => {
        let fountainLat = marker.getPosition().lat();
        let fountainLng = marker.getPosition().lng();

        let distance = distancefinder(userLat, userLng, fountainLat, fountainLng);
        
        if (distance < closestDistance) { 
            closestDistance = distance;
            closestFountain = marker;
        }
    });

    if (!closestFountain) {
        alert("No fountains found!"); 
        return;
    }

    // Hide all fountains first
    allFountainMarkers.forEach(({ marker }) => marker.setMap(null));

    // Show only the closest fountain
    closestFountain.setMap(map);

    // Fix: Update the button text when closest fountain is shown
    document.getElementById("filterClosest").innerText = "Show All Fountains";
    showingClosest = true;
}

let showingClosest = false; // Track whether closest mode is active

document.getElementById("filterClosest").addEventListener("click", () => {
    if (showingClosest) {
        // Restore all fountains when toggling back
        allFountainMarkers.forEach(({ marker }) => marker.setMap(map));

        //Reset the button text properly
        document.getElementById("filterClosest").innerText = "Show Closest Fountain";
        showingClosest = false;
    } else {
        findClosestFountains();
    }
});

let userMarkers = []; // Stores black markers added by user


function clearMap() {
    //Remove user location marker if it exists
    if (userMarker) {
        userMarker.setMap(null);
        userMarker = null;
    }

    //Remove all user-added markers (black markers)
    userMarkers.forEach(marker => marker.setMap(null));
    userMarkers = [];

    //Restore fountains if Closest Mode was active
    if (showingClosest) {
        allFountainMarkers.forEach(({ marker }) => marker.setMap(map));
        document.getElementById("filterClosest").innerText = "Show Closest Fountain";
        showingClosest = false;
    }

    //Remove directions if they exist
    if (directionsRenderer) {
        directionsRenderer.setMap(null);
        directionsRenderer = new google.maps.DirectionsRenderer({ map: map });
    }

    console.log("Map cleared!"); // Debugging log
}


// Function to calculate distance using Haversine Formula
function distancefinder(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180); 
    const dLon = (lon2 - lon1) * (Math.PI / 180);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; 
}

document.getElementById("clearMap").addEventListener("click", clearMap);

document.getElementById("searchBar").addEventListener("input", function() {
    let searchTerm = this.value.toLowerCase();
    let suggestionsBox = document.getElementById("suggestions");

    // Clear previous suggestions
    suggestionsBox.innerHTML = "";

    // Find matching fountains
    let matches = allFountainNames.filter(fountain => fountain.name.toLowerCase().includes(searchTerm));

    if (matches.length > 0) {
        suggestionsBox.style.display = "block"; // Show the dropdown
        matches.forEach(fountain => {
            let item = document.createElement("button");
            item.className = "list-group-item list-group-item-action";
            item.innerText = fountain.name;
            item.onclick = function() {
                // Move map to selected location
                map.setCenter({ lat: fountain.lat, lng: fountain.lng });
                map.setZoom(15);
                suggestionsBox.style.display = "none"; // Hide dropdown after selection
                document.getElementById("searchBar").value = fountain.name; // Set search value
            };
            suggestionsBox.appendChild(item);
        });
    } else {
        suggestionsBox.style.display = "none"; // Hide dropdown if no matches
    }
});

document.getElementById("searchBar").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        let searchTerm = this.value.toLowerCase();
        let existingFountain = allFountainNames.find(fountain => fountain.name.toLowerCase() === searchTerm);

        if (!existingFountain) {
            // Use Google Geocoding API to find the location
            let geocoder = new google.maps.Geocoder();
            geocoder.geocode({ address: searchTerm }, function(results, status) {
                if (status === "OK") {
                    let location = results[0].geometry.location;
                    addUserMarker(location.lat(), location.lng(), searchTerm);
                    map.setCenter(location);
                    map.setZoom(15);
                } else {
                    alert("Address not found. Please try again.");
                }
            });
        }
        document.getElementById("suggestions").style.display = "none";
    }
});

function addUserMarker(lat, lng, title) {
    let position = new google.maps.LatLng(lat, lng);

    let marker = new google.maps.Marker({
        position: position,
        map: map,
        title: title,
        icon: {
            url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png", // Makes user-added markers RED
            scaledSize: new google.maps.Size(40, 40)
        }
    });

    // Create an info window with "Get Directions" button
    let infoWindow = new google.maps.InfoWindow({
        content: `<div class="p-2">
                    <h4>${title}</h4>
                    <p>Custom location added by user.</p>
                    <button onclick="showRouteToFountain(${lat}, ${lng})" 
                    class="btn btn-outline-success btn-sm mt-2">
                    Get Directions
                </button>
                </div>`
    });

    marker.addListener("click", () => {
        infoWindow.open(map, marker);
    });

    // Store user-added markers separately (so they can be cleared properly)
    userMarkers.push(marker);
}


