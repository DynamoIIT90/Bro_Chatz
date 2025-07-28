const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const port = process.env.PORT || 3000;
app.use(express.static('public'));

let users = {};
let typingUsers = [];

io.on('connection', (socket) => {
  let username = '';

  socket.on('setUsername', (name) => {
    username = name;
    users[socket.id] = name;
    io.emit('updateUserCount', Object.keys(users).length);
    io.emit('userNotification', { user: name, action: 'joined' });
  });

  socket.on('chat message', (data) => {
    io.emit('chat message', data);
  });

  socket.on('typing', (name) => {
    if (!typingUsers.includes(name)) {
      typingUsers.push(name);
      io.emit('typingStatus', typingUsers);
    }
  });

  socket.on('stopTyping', (name) => {
    typingUsers = typingUsers.filter(u => u !== name);
    io.emit('typingStatus', typingUsers);
  });

  socket.on('disconnect', () => {
    delete users[socket.id];
    io.emit('updateUserCount', Object.keys(users).length);
    if (username) {
      typingUsers = typingUsers.filter(u => u !== username);
      io.emit('userNotification', { user: username, action: 'left' });
    }
  });
});

http.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
