const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static(__dirname));

let userCount = 0;

io.on("connection", (socket) => {
  let currentUser = "";

  userCount++;
  io.emit("user count", userCount);

  socket.on("join", (username) => {
    currentUser = username;
    io.emit("notify", `${username} entered the chatz`);
  });

  socket.on("chat message", (data) => {
    io.emit("chat message", data);
  });

  socket.on("typing", (data) => {
    socket.broadcast.emit("typing", data);
  });

  socket.on("disconnect", () => {
    userCount--;
    io.emit("user count", userCount);
    if (currentUser) {
      io.emit("notify", `${currentUser} exited the chatz`);
    }
  });
});

http.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
