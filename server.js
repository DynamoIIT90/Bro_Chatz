const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Track online users and typing users
let onlineUsers = 0;
let typingUsers = new Set();

io.on('connection', (socket) => {
  console.log('A user connected');
  onlineUsers++;
  io.emit('updateUserCount', onlineUsers);

  socket.on('setUsername', (username) => {
    socket.username = username;
  });

  socket.on('chat message', (data) => {
    io.emit('chat message', data);
  });

  socket.on('typing', (username) => {
    typingUsers.add(username);
    io.emit('typingStatus', Array.from(typingUsers));
  });

  socket.on('stopTyping', (username) => {
    typingUsers.delete(username);
    io.emit('typingStatus', Array.from(typingUsers));
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
    onlineUsers--;
    io.emit('updateUserCount', onlineUsers);

    // Remove typing user if they disconnect
    typingUsers.delete(socket.username);
    io.emit('typingStatus', Array.from(typingUsers));
  });
});

http.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
