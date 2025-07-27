const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

let usersOnline = 0;
let typingUsers = [];

io.on('connection', (socket) => {
  usersOnline++;
  io.emit('updateUserCount', usersOnline);

  socket.on('setUsername', (username) => {
    socket.username = username;
  });

  socket.on('chat message', (data) => {
    io.emit('chat message', {
      user: data.user,
      message: data.message,
      color: data.color  // ✅ Broadcast color with message
    });
  });

  socket.on('typing', (username) => {
    if (!typingUsers.includes(username)) {
      typingUsers.push(username);
      io.emit('typingStatus', typingUsers);
    }
  });

  socket.on('stopTyping', (username) => {
    typingUsers = typingUsers.filter(name => name !== username);
    io.emit('typingStatus', typingUsers);
  });

  socket.on('disconnect', () => {
    usersOnline--;
    io.emit('updateUserCount', usersOnline);
    typingUsers = typingUsers.filter(name => name !== socket.username);
    io.emit('typingStatus', typingUsers);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
