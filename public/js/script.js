const socket = io();

// Initialize map
const map = L.map("map").setView([0, 0], 16);

// Add OpenStreetMap tile layer
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap | Abhinav Shrivastava"
}).addTo(map);

// Store all markers
const markers = {};

// Track whether map is centered initially
let isMapCentered = false;

// Get live location
if (navigator.geolocation) {

    navigator.geolocation.watchPosition(

        (position) => {

            const { latitude, longitude } = position.coords;

            // Send location to server
            socket.emit("send-location", {
                latitude,
                longitude
            });

        },

        (error) => {
            console.log("Geolocation Error:", error);
        },

        {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        }

    );

} else {
    alert("Geolocation is not supported by your browser.");
}

// Receive live location from server
socket.on("receive-location", (data) => {

    const { id, latitude, longitude } = data;

    // Center map only first time
    if (!isMapCentered) {
        map.setView([latitude, longitude], 16);
        isMapCentered = true;
    }

    // Update existing marker
    if (markers[id]) {

        markers[id].setLatLng([latitude, longitude]);

    } 
    
    // Create new marker
    else {

        markers[id] = L.marker([latitude, longitude]).addTo(map);

    }

});

// Remove marker when user disconnects
socket.on("user-disconnected", (id) => {

    if (markers[id]) {

        map.removeLayer(markers[id]);

        delete markers[id];
    }

});
