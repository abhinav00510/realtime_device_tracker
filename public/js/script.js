const socket = io();

/* ---------------- UI ELEMENTS ---------------- */

const home = document.getElementById("home");
const mapDiv = document.getElementById("map");

const usernameInput = document.getElementById("username");
const roomKeyInput = document.getElementById("roomKeyInput");

const createRadio = document.getElementById("create");
const joinRadio = document.getElementById("join");

const continueBtn = document.getElementById("continueBtn");

const sidebar = document.getElementById("sidebar");
const roomDisplay = document.getElementById("roomDisplay");
const membersDiv = document.getElementById("members");
const copyBtn = document.getElementById("copyBtn");

const createdRoomDiv = document.getElementById("createdRoom");

/* ---------------- STATE ---------------- */

let username = "";
let roomKey = "";
let myLat = null;
let myLng = null;

let firstLoad = true;

// Store all markers
const markers = {};

const userDetails = {};

/* ---------------- MAP ---------------- */

const map = L.map("map").setView([20.5937, 78.9629], 5);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "Realtime Tracker"
}).addTo(map);

/* ---------------- DISTANCE FUNCTION ---------------- */

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/* ---------------- ROOM ACTION ---------------- */

continueBtn.addEventListener("click", () => {

    username = usernameInput.value.trim();

    if (!username) {
        alert("Enter username");
        return;
    }

    if (createRadio.checked) {

        socket.emit("create-room", username);

    } else {

        roomKey = roomKeyInput.value.trim().toUpperCase();

        socket.emit("join-room", {
            roomKey,
            username
        });

    }

});

/* ---------------- RADIO TOGGLE ---------------- */

createRadio.addEventListener("change", () => {
    roomKeyInput.style.display = "none";
});

joinRadio.addEventListener("change", () => {
    roomKeyInput.style.display = "block";
});

/* ---------------- SOCKET EVENTS ---------------- */

socket.on("room-created", (key) => {

    roomKey = key;

    createdRoomDiv.innerText = `Room Created: ${key}`;

    roomDisplay.innerText = key;

    showMap();

});

socket.on("joined-room", (key) => {

    roomKey = key;

    roomDisplay.innerText = key;

    showMap();

});

socket.on("invalid-room", () => {
    alert("Invalid Room Key");
});

socket.on("room-full", () => {
    alert("Room is full (max 5 users)");
});

socket.on("room-users", (users) => {
    renderMembers(users);
});

/* ---------------- LOCATION ---------------- */

if (navigator.geolocation) {

    navigator.geolocation.watchPosition((pos) => {

        const { latitude, longitude } = pos.coords;

        myLat = latitude;
        myLng = longitude;

        socket.emit("send-location", {
            latitude,
            longitude
        });

    });

}

/* ---------------- RECEIVE LOCATION ---------------- */

socket.on("receive-location", (data) => {

    const { id, username, latitude, longitude } = data;

    userDetails[id] = { username, latitude, longitude };

    const distance =
        myLat && myLng
            ? getDistance(myLat, myLng, latitude, longitude).toFixed(2)
            : null;

    let label = username;

    if (distance) {
        label += `\n${distance} km away`;
    }

    if (markers[id]) {

        markers[id].setLatLng([latitude, longitude]);

        markers[id].setTooltipContent(label);

    } else {

        markers[id] = L.marker([latitude, longitude])
            .addTo(map)
            .bindTooltip(label, {
                permanent: true,
                direction: "top"
            });

    }

    if (firstLoad) {
    map.setView([latitude, longitude], 16);
    firstLoad = false;
}

});

/* ---------------- USER DISCONNECT ---------------- */

socket.on("user-disconnected", (id) => {

    if (markers[id]) {

        map.removeLayer(markers[id]);

        delete markers[id];
    }

});


/* ---------------- UI HELPERS ---------------- */


function renderMembers(users){

    membersDiv.innerHTML="";

    users.forEach(user=>{

        const div=document.createElement("div");

        div.className="member";

        div.innerHTML="🟢 "+user.username;

        div.onclick=()=>{

            const data=userDetails[user.id];

            if(!data){

                return;

            }

            const distance=myLat&&myLng
            ?getDistance(
                myLat,
                myLng,
                data.latitude,
                data.longitude
            ).toFixed(2)
            :"--";

            document.getElementById(
                "locationInfo"
            ).innerHTML=

            `

            👤 <b>${data.username}</b>

            <br>

            📍 Latitude :
            ${data.latitude.toFixed(5)}

            <br>

            📍 Longitude :
            ${data.longitude.toFixed(5)}

            <br>

            📏 Distance :
            ${distance} km

            `;

            map.setView(
                [data.latitude,data.longitude],
                18
            );

        };

        membersDiv.appendChild(div);

    });

}


function showMap() {

    home.style.display = "none";
    mapDiv.style.display = "block";
    sidebar.style.display = "block";

    setTimeout(() => {
        map.invalidateSize();
    }, 300);

}

/* ---------------- COPY ROOM ---------------- */

copyBtn.addEventListener("click", () => {

    navigator.clipboard.writeText(roomKey);

    alert("Room Key Copied!");

});

