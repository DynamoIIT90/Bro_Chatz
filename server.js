const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);

app.use(express.static("public"));

let users = {};

io.on("connection", (socket) => {
  socket.on("user-joined", ({ name, color }) => {
    users[socket.id] = { name, color };
    io.emit("user-joined", { name });
    io.emit("update-online-count", Object.keys(users).length);
  });

  socket.on("chat-message", (data) => {
    io.emit("chat-message", data);
  });

  socket.on("typing", (name) => {
    socket.broadcast.emit("typing", name);
  });

  socket.on("disconnect", () => {
    const user = users[socket.id];
    if (user) {
      io.emit("user-left", { name: user.name });
      delete users[socket.id];
      io.emit("update-online-count", Object.keys(users).length);
    }
  });
});

server.listen(3000, () => console.log("Server running on http://localhost:3000"));
