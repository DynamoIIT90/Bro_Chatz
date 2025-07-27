const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

const users = {};
const colors = {};

function getRandomDarkColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 10)];
  }
  return color;
}

io.on('connection', (socket) => {
  socket.on('new-user', (name) => {
    users[socket.id] = name;
    colors[socket.id] = getRandomDarkColor();
    io.emit('user-connected', name);
    io.emit('update-user-count', Object.keys(users).length);
  });

  socket.on('chat-message', (data) => {
    const name = users[socket.id];
    const color = colors[socket.id];
    if (name) {
      io.emit('chat-message', { name, message: data.message, color });
    }
  });

  socket.on('typing', () => {
    const name = users[socket.id];
    if (name) {
      socket.broadcast.emit('typing', name);
    }
  });

  socket.on('stop-typing', () => {
    const name = users[socket.id];
    if (name) {
      socket.broadcast.emit('stop-typing', name);
    }
  });

  socket.on('disconnect', () => {
    const name = users[socket.id];
    delete users[socket.id];
    delete colors[socket.id];
    io.emit('user-disconnected', name);
    io.emit('update-user-count', Object.keys(users).length);
  });
});

http.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
