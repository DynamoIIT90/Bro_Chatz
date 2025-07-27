const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

let onlineUsers = {};
let typingUsers = {};

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('setUsername', (username) => {
    socket.username = username;
    onlineUsers[socket.id] = username;

    io.emit('updateUserCount', Object.keys(onlineUsers).length);

    // Notify all users someone joined
    io.emit('userNotification', { user: username, action: 'joined' });
  });

  socket.on('chat message', (data) => {
    io.emit('chat message', data);
  });

  socket.on('typing', (username) => {
    typingUsers[socket.id] = username;
    io.emit('typingStatus', Object.values(typingUsers));
  });

  socket.on('stopTyping', () => {
    delete typingUsers[socket.id];
    io.emit('typingStatus', Object.values(typingUsers));
  });

  socket.on('disconnect', () => {
    const username = onlineUsers[socket.id];
    delete onlineUsers[socket.id];
    delete typingUsers[socket.id];

    io.emit('updateUserCount', Object.keys(onlineUsers).length);
    io.emit('typingStatus', Object.values(typingUsers));

    if (username) {
      // Notify all users someone left
      io.emit('userNotification', { user: username, action: 'left' });
    }

    console.log('A user disconnected');
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
