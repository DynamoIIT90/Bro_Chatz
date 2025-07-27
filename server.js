const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

let users = {};
let typingUsers = {};

io.on('connection', socket => {
  let currentUser = '';

  socket.on('join', username => {
    currentUser = username;
    users[socket.id] = username;
    io.emit('user joined', username);
    io.emit('online users', Object.keys(users).length);
  });

  socket.on('chat message', ({ user, msg, color }) => {
    io.emit('chat message', { user, msg, color });
  });

  socket.on('typing', name => {
    typingUsers[socket.id] = name;
    io.emit('user typing', Object.values(typingUsers));
    setTimeout(() => {
      delete typingUsers[socket.id];
      io.emit('user typing', Object.values(typingUsers));
    }, 3000);
  });

  socket.on('disconnect', () => {
    if (users[socket.id]) {
      io.emit('user left', users[socket.id]);
      delete users[socket.id];
      delete typingUsers[socket.id];
      io.emit('online users', Object.keys(users).length);
      io.emit('user typing', Object.values(typingUsers));
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
