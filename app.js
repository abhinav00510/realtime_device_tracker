const express = require("express");
const app = express();
const path = require("path");

const http = require("http");
const server = http.createServer(app);

const socketio = require("socket.io");
const io = socketio(server);

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.render("index");
});

const rooms = {};

function generateRoomKey() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}

io.on("connection", (socket) => {

    console.log("Connected:", socket.id);

    socket.on("create-room", (username) => {

        const roomKey = generateRoomKey();

        rooms[roomKey] = [];

        rooms[roomKey].push({
            id: socket.id,
            username: username
        });

        socket.join(roomKey);

        socket.roomKey = roomKey;
        socket.username = username;

        socket.emit("room-created", roomKey);

        io.to(roomKey).emit("room-users", rooms[roomKey]);
    });

    socket.on("join-room", ({ roomKey, username }) => {

        roomKey = roomKey.toUpperCase();

        if (!rooms[roomKey]) {
            socket.emit("invalid-room");
            return;
        }

        if (rooms[roomKey].length >= 5) {
            socket.emit("room-full");
            return;
        }

        rooms[roomKey].push({
            id: socket.id,
            username: username
        });

        socket.join(roomKey);

        socket.roomKey = roomKey;
        socket.username = username;

        socket.emit("joined-room", roomKey);

        io.to(roomKey).emit("room-users", rooms[roomKey]);

    });

    socket.on("send-location", (data) => {

        if (!socket.roomKey) return;

        io.to(socket.roomKey).emit("receive-location", {
            id: socket.id,
            username: socket.username,
            latitude: data.latitude,
            longitude: data.longitude
        });

    });

    socket.on("disconnect", () => {

        const roomKey = socket.roomKey;

        if (roomKey && rooms[roomKey]) {

            rooms[roomKey] = rooms[roomKey].filter(
                user => user.id !== socket.id
            );

            io.to(roomKey).emit("user-disconnected", socket.id);

            io.to(roomKey).emit("room-users", rooms[roomKey]);

            if (rooms[roomKey].length === 0) {
                delete rooms[roomKey];
            }
        }

        console.log("Disconnected:", socket.id);

    });

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
});