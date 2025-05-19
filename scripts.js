/**StAuth10244: I Karanveer Singh, 000930881 certify that this material is my original work. No other person's work has been used without due acknowledgement. I have not made my work available to anyone else**/

let map;
let userMarker = null;
let directionsService;
let directionsRenderer;
let allFountainNames = [];
let allFountainMarkers = [];
let userMarkers = [];
let showingClosest = false;

let activeFilters = {
    status: null,
    bottle: null,
    dog: null
};

proj4.defs("EPSG:32617", "+proj=utm +zone=17 +datum=WGS84 +units=m +no_defs");

function convertUTMToLatLng(easting, northing) {
    let latLng = proj4("EPSG:32617", "WGS84", [easting, northing]);
    return { lat: latLng[1], lng: latLng[0] };
}

function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 43.2387, lng: -79.88 },
        zoom: 12,
        mapId: "3b7c2dac2ec36507"
    });

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: false
    });

    fetch('https://raw.githubusercontent.com/Karan16-hub/drinking-water-fountain-project/main/Drinking_Fountains.csv')
        .then(response => response.text())
        .then(csvText => {
            const jsonData = csvToJson(csvText);

            jsonData.forEach(fountain => {
                let latLng = convertUTMToLatLng(parseFloat(fountain.Easting), parseFloat(fountain.Northing));

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
                    console.warn(`Skipping: ${fountain.Address} (Invalid coordinates)`);
                }
            });
        })
        .catch(error => console.error("Error loading the CSV file:", error));
}

function csvToJson(csvText) {
    const rows = csvText.trim().split("\n");
    const headers = rows[0].split(",");

    return rows.slice(1).map(row => {
        const values = row.split(",");
        let obj = {};
        headers.forEach((header, index) => {
            obj[header.trim()] = values[index] ? values[index].trim() : "";
        });
        return obj;
    });
}

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

    const infoWindow = new google.maps.InfoWindow({
        content: `<div class="p-2">
                    <h4>${title}</h4>
                    <p>${isUserAdded ? "User-added location" : "Public drinking fountain"}</p>
                    <button onclick="showRouteToFountain(${lat}, ${lng})" class="btn btn-outline-success btn-sm mt-2">
                        Get Directions
                    </button>
                </div>`
    });

    marker.addListener("click", () => infoWindow.open(map, marker));

    if (isUserAdded) {
        userMarkers.push(marker);
    } else {
        allFountainMarkers.push({ marker, status, dogBowl, bottleFiller });
    }
}

function locateUserLocation() {
    navigator.geolocation.getCurrentPosition(position => {
        let userLat = position.coords.latitude;
        let userLng = position.coords.longitude;
        let userPosition = new google.maps.LatLng(userLat, userLng);

        if (userMarker) userMarker.setMap(null);

        userMarker = new google.maps.Marker({
            position: userPosition,
            map: map,
            title: "You're Here!",
            icon: {
                url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
                scaledSize: new google.maps.Size(40, 40)
            }
        });

        let infoPopup = new google.maps.InfoWindow({
            content: `<h4>Your Location!</h4><p>This is where you are right now!</p>`
        });

        userMarker.addListener("click", () => infoPopup.open(map, userMarker));

        map.setCenter(userPosition);
    }, error => {
        console.error("Error retrieving user location:", error);
        alert("Failed to get your location. Please enable location access.");
    });
}

document.getElementById("userlocation").addEventListener("click", locateUserLocation);

function showRouteToFountain(destLat, destLng) {
    if (!userMarker) {
        alert("Please enable location first!");
        return;
    }

    let userLat = userMarker.getPosition().lat();
    let userLng = userMarker.getPosition().lng();

    directionsRenderer.setMap(null);
    directionsRenderer.setMap(map);

    directionsService.route({
        origin: { lat: userLat, lng: userLng },
        destination: { lat: destLat, lng: destLng },
        travelMode: google.maps.TravelMode.WALKING
    }, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
            directionsRenderer.setDirections(result);
        } else {
            alert("Could not retrieve directions.");
        }
    });
}

function applyFilters() {
    allFountainMarkers.forEach(({ marker, status, dogBowl, bottleFiller }) => {
        let showMarker = true;
        if (activeFilters.status && status !== activeFilters.status) showMarker = false;
        if (activeFilters.bottle && bottleFiller !== activeFilters.bottle) showMarker = false;
        if (activeFilters.dog && dogBowl !== activeFilters.dog) showMarker = false;
        marker.setMap(showMarker ? map : null);
    });
}

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

function recenterMaptoNormalView() {
    map.setCenter({ lat: 43.2387, lng: -79.88 });
    map.setZoom(12);
}
document.getElementById("BacktoDefault").addEventListener("click", recenterMaptoNormalView);

function findClosestFountains() {
    if (!userMarker) {
        alert("Please enable location first!");
        return;
    }

    let userLat = userMarker.getPosition().lat();
    let userLng = userMarker.getPosition().lng();
    let closestFountain = null;
    let closestDistance = Infinity;

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

    allFountainMarkers.forEach(({ marker }) => marker.setMap(null));
    closestFountain.setMap(map);
    document.getElementById("filterClosest").innerText = "Show All Fountains";
    showingClosest = true;
}

document.getElementById("filterClosest").addEventListener("click", () => {
    if (showingClosest) {
        allFountainMarkers.forEach(({ marker }) => marker.setMap(map));
        document.getElementById("filterClosest").innerText = "Show Closest Fountain";
        showingClosest = false;
    } else {
        findClosestFountains();
    }
});

function clearMap() {
    if (userMarker) {
        userMarker.setMap(null);
        userMarker = null;
    }

    userMarkers.forEach(marker => marker.setMap(null));
    userMarkers = [];

    if (showingClosest) {
        allFountainMarkers.forEach(({ marker }) => marker.setMap(map));
        document.getElementById("filterClosest").innerText = "Show Closest Fountain";
        showingClosest = false;
    }

    if (directionsRenderer) {
        directionsRenderer.setMap(null);
        directionsRenderer = new google.maps.DirectionsRenderer({ map: map });
    }

    console.log("Map cleared!");
}

document.getElementById("clearMap").addEventListener("click", clearMap);

function distancefinder(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);

    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
              Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

document.getElementById("searchBar").addEventListener("input", function() {
    let searchTerm = this.value.toLowerCase();
    let suggestionsBox = document.getElementById("suggestions");
    suggestionsBox.innerHTML = "";

    let matches = allFountainNames.filter(f => f.name.toLowerCase().includes(searchTerm));

    if (matches.length > 0) {
        suggestionsBox.style.display = "block";
        matches.forEach(f => {
            let item = document.createElement("button");
            item.className = "list-group-item list-group-item-action";
            item.innerText = f.name;
            item.onclick = function () {
                map.setCenter({ lat: f.lat, lng: f.lng });
                map.setZoom(15);
                suggestionsBox.style.display = "none";
                document.getElementById("searchBar").value = f.name;
            };
            suggestionsBox.appendChild(item);
        });
    } else {
        suggestionsBox.style.display = "none";
    }
});

document.getElementById("searchBar").addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
        let searchTerm = this.value.toLowerCase();
        let match = allFountainNames.find(f => f.name.toLowerCase() === searchTerm);

        if (!match) {
            let geocoder = new google.maps.Geocoder();
            geocoder.geocode({ address: searchTerm }, function (results, status) {
                if (status === "OK") {
                    let location = results[0].geometry.location;
                    addUserMarker(location.lat(), location.lng(), searchTerm);
                    map.setCenter(location);
                    map.setZoom(15);
                } else {
                    alert("Address not found.");
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
            url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
            scaledSize: new google.maps.Size(40, 40)
        }
    });

    let infoWindow = new google.maps.InfoWindow({
        content: `<div class="p-2">
                    <h4>${title}</h4>
                    <p>Custom location added by user.</p>
                    <button onclick="showRouteToFountain(${lat}, ${lng})" class="btn btn-outline-success btn-sm mt-2">
                        Get Directions
                    </button>
                </div>`
    });

    marker.addListener("click", () => infoWindow.open(map, marker));
    userMarkers.push(marker);
}
