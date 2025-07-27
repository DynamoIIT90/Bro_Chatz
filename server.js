const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

// Serve the public folder
app.use(express.static("public"));

// Socket.io real-time chat
io.on("connection", (socket) => {
    console.log("A user connected");

    socket.on("chat message", (data) => {
        io.emit("chat message", data);
    });

    socket.on("disconnect", () => {
        console.log("A user disconnected");
    });
});

// Start the server
http.listen(3000, () => {
    console.log("Server running at http://localhost:3000");
});
