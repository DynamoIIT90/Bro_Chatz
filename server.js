const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

let users = {};
let typingUsers = new Set();

io.on('connection', socket => {
  socket.on('new-user', username => {
    users[socket.id] = username;
    io.emit('user-list', Object.keys(users).length);
    socket.broadcast.emit('entry-exit', `${username} entered the chatz`);
  });

  socket.on('chat-message', data => {
    io.emit('chat-message', data);
  });

  socket.on('typing', username => {
    typingUsers.add(username);
    io.emit('typing', Array.from(typingUsers));
    setTimeout(() => {
      typingUsers.delete(username);
      io.emit('typing', Array.from(typingUsers));
    }, 1500);
  });

  socket.on('disconnect', () => {
    const username = users[socket.id];
    delete users[socket.id];
    io.emit('user-list', Object.keys(users).length);
    if (username) {
      socket.broadcast.emit('entry-exit', `${username} exited the chatz`);
    }
  });
});

http.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
