const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

let onlineUsers = {};

io.on("connection", (socket) => {
  socket.on("new-user", (username) => {
    socket.username = username;
    onlineUsers[socket.id] = username;
    io.emit("user-connected", username);
    io.emit("update-online-count", Object.keys(onlineUsers).length);
  });

  socket.on("chat-message", (data) => {
    socket.broadcast.emit("chat-message", data);
  });

  socket.on("typing", (name) => {
    socket.broadcast.emit("typing", name);
  });

  socket.on("stop-typing", (name) => {
    socket.broadcast.emit("stop-typing", name);
  });

  socket.on("disconnect", () => {
    const name = onlineUsers[socket.id];
    delete onlineUsers[socket.id];
    io.emit("user-disconnected", name);
    io.emit("update-online-count", Object.keys(onlineUsers).length);
  });
});

http.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
