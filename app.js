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

io.on("connection", (socket) => {
    console.log("Connected");

    socket.on("send-location", (data) => {
        io.emit("receive-location", {
            id: socket.id,
            latitude: data.latitude,
            longitude: data.longitude
        });
    });

    socket.on("disconnect", () => {
        io.emit("user-disconnected", socket.id);
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});