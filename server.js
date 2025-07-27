const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const PORT = process.env.PORT || 3000;

app.use(express.static('public')); // Serves index.html and script.js

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Handle Socket.IO connections
io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('chat message', (data) => {
        io.emit('chat message', data); // send to all clients
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

http.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
