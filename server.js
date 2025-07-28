// server.js
// This file sets up the Node.js server using Express and Socket.IO for real-time communication.
// It now also handles AI requests securely on the backend, using native fetch, and passes reply data.

const express = require('express'); // Import the Express framework
const http = require('http'); // Import the HTTP module to create a server
const socketIo = require('socket.io'); // Import Socket.IO for real-time communication
const path = require('path'); // Import the path module for working with file paths
// Note: 'fetch' is now native in Node.js v18+ (your v22.13.0), so no 'require('node-fetch')' is needed.

const app = express(); // Create an Express application
const server = http.createServer(app); // Create an HTTP server using the Express app
// Initialize Socket.IO with the HTTP server.
const io = socketIo(server, {
    cors: {
        origin: "*", // Allow all origins for development. In production, specify your domain.
        methods: ["GET", "POST"] // Allow GET and POST requests
    }
});

const PORT = process.env.PORT || 3000; // Define the port, use environment variable or default to 3000

// --- IMPORTANT: Get Gemini API Key from Environment Variable ---
// This is the secure way to handle API keys.
// For local testing, you will set this in your terminal (e.g., export GEMINI_API_KEY=YOUR_KEY).
// For Render deployment, you will set this in Render's environment variable settings.
const GEMINI_API_KEY = 'AIzaSyBm2vvQdkrxplgoa0ri_aSBkfJWCc-rt-0'
;

// --- Console log to check if API key is loaded ---
console.log('Server starting. GEMINI_API_KEY:', GEMINI_API_KEY ? '******' + GEMINI_API_KEY.substring(GEMINI_API_KEY.length - 4) : 'NOT SET');


// Check if API key is set
if (!GEMINI_API_KEY) {
    console.error('ERROR: GEMINI_API_KEY environment variable is not set!');
    console.error('AI features will not work. Please set it before starting the server.');
    // Optionally, you might want to exit the process or disable AI features gracefully
    // process.exit(1);
}

// Middleware to parse JSON bodies from incoming requests (for AI endpoint)
app.use(express.json());

// Serve static files from the 'public' directory.
// This means index.html, style.css, and script.js will be accessible.
app.use(express.static(path.join(__dirname, 'public')));

// Store connected users and their assigned colors.
const users = {};
// Keep track of users who are currently typing.
const typingUsers = new Set();

// Function to generate a random RGB color.
function getRandomColor() {
    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);
    return `rgb(${r}, ${g}, ${b})`;
}

// --- NEW: AI Proxy Endpoint ---
// This endpoint receives requests from the client (script.js) and securely calls the Gemini API.
app.post('/ask-ai', async (req, res) => {
    const userPrompt = req.body.prompt; // Get the prompt from the client's request
    if (!userPrompt) {
        return res.status(400).json({ error: 'Prompt is required.' });
    }
    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'Gemini API key is not configured on the server.' });
    }

    try {
        const chatHistory = [{ role: "user", parts: [{ text: userPrompt }] }];
        const payload = { contents: chatHistory };
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

        // Using native fetch API directly (available in Node.js v18+)
        const geminiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const geminiResult = await geminiResponse.json();

        if (geminiResponse.ok && geminiResult.candidates && geminiResult.candidates.length > 0 &&
            geminiResult.candidates[0].content && geminiResult.candidates[0].content.parts &&
            geminiResult.candidates[0].content.parts.length > 0) {
            const aiText = geminiResult.candidates[0].content.parts[0].text;
            res.json({ response: aiText }); // Send AI's response back to the client
        } else {
            console.error('Gemini API response structure unexpected or error from Gemini:', geminiResult);
            res.status(500).json({ error: geminiResult.error ? geminiResult.error.message : 'AI could not generate a valid response.' });
        }

    } catch (error) {
        console.error('Error calling Gemini API from server:', error);
        res.status(500).json({ error: 'Failed to connect to AI service.' });
    }
});


// Socket.IO connection handler.
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join chat', (username) => {
        const userColor = getRandomColor();
        users[socket.id] = { name: username, color: userColor };
        console.log(`${username} joined with color ${userColor}`);

        io.emit('user joined', username);
        io.emit('update users', Object.keys(users).length);
        socket.emit('set color', userColor);

        socket.emit('chat message', {
            username: 'Bro_Chatz Admin',
            message: `Welcome, ${username}! Enjoy your chat.`,
            color: 'rgb(255, 255, 0)'
        });
    });

    // Modified to accept and broadcast replyTo data
    socket.on('chat message', (msgData) => {
        const user = users[socket.id];
        if (user) {
            // Ensure msgData is an object to include replyTo
            const messageToSend = {
                username: user.name,
                message: msgData.message, // The actual message text
                color: user.color,
                replyTo: msgData.replyTo || null // Include replyTo if present
            };
            console.log(`Message from ${user.name}: ${messageToSend.message}`);
            io.emit('chat message', messageToSend);
        }
    });

    socket.on('typing', () => {
        const user = users[socket.id];
        if (user && !typingUsers.has(user.name)) {
            typingUsers.add(user.name);
            socket.broadcast.emit('user typing', Array.from(typingUsers));
        }
    });

    socket.on('stop typing', () => {
        const user = users[socket.id];
        if (user && typingUsers.has(user.name)) {
            typingUsers.delete(user.name);
            socket.broadcast.emit('user typing', Array.from(typingUsers));
        }
    });

    socket.on('react message', ({ messageId, emoji, reactorName }) => {
        console.log(`${reactorName} reacted with ${emoji} to message ID ${messageId}`);
        io.emit('message reacted', { messageId, emoji, reactorName });
    });

    socket.on('disconnect', () => {
        const user = users[socket.id];
        if (user) {
            console.log('User disconnected:', user.name);
            if (typingUsers.has(user.name)) {
                typingUsers.delete(user.name);
                socket.broadcast.emit('user typing', Array.from(typingUsers));
            }
            delete users[socket.id];
            io.emit('user exited', user.name);
            io.emit('update users', Object.keys(users).length);
        } else {
            console.log('A user disconnected (unknown user)');
        }
    });
});

// Start the server and listen on the defined port.
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open your browser to http://localhost:${PORT}`);
});