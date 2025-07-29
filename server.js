// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*", // Allow all origins for development. Restrict this in production.
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// --- Server-Side Data Stores ---
let users = {}; // Stores { socket.id: { username: 'user', color: 'rgb(x,y,z)', lastTypingTime: 0 } }
let messageHistory = []; // Stores { username, message, timestamp, messageId, replyTo, reactions, type }
let messageIdCounter = 0; // Unique ID counter for messages
let typingUsers = {}; // Stores { username: lastTypingTime } for current typers

// --- Configuration for AI (Gemini) ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyC0vAo8oWOb22IGUy2J5TrzrKFxobpMj5g'; // *** IMPORTANT: Set this via environment variable! ***

console.log('Server starting. GEMINI_API_KEY:', GEMINI_API_KEY ? '******' + GEMINI_API_KEY.substring(GEMINI_API_KEY.length - 4) : 'NOT SET');

if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
    console.error('ERROR: GEMINI_API_KEY environment variable is not set or is default!');
    console.error('AI features will not work. Please set it before starting the server.');
}

// Middleware to parse JSON bodies from incoming requests (for AI endpoint)
app.use(express.json());

// Function to generate a random RGB color.
function getRandomColor() {
    const r = Math.floor(Math.random() * 200); // Lighter colors
    const g = Math.floor(Math.random() * 200);
    const b = Math.floor(Math.random() * 200);
    return `rgb(${r}, ${g}, ${b})`;
}

// Helper to get current timestamp
function getCurrentTimestamp() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// --- NEW: AI Proxy Endpoint ---
app.post('/ask-ai', async (req, res) => {
    const userPrompt = req.body.prompt;
    if (!userPrompt) {
        return res.status(400).json({ error: 'Prompt is required.' });
    }
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
        return res.status(500).json({ error: 'Gemini API key is not configured on the server.' });
    }

    try {
        const chatHistory = [{ role: "user", parts: [{ text: userPrompt }] }];
        const payload = { contents: chatHistory };
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

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
            res.json({ response: aiText });
        } else {
            console.error('Gemini API response structure unexpected or error from Gemini:', geminiResult);
            res.status(500).json({ error: geminiResult.error ? geminiResult.error.message : 'AI could not generate a valid response.' });
        }

    } catch (error) {
        console.error('Error calling Gemini API from server:', error);
        res.status(500).json({ error: 'Failed to connect to AI service.' });
    }
});


// --- Socket.IO Connection Handler ---
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Update and send online user count immediately
    io.emit('user_count', Object.keys(users).length);

    // Send existing message history to the newly connected user
    socket.emit('message_history', JSON.parse(JSON.stringify(messageHistory))); // Deep copy to avoid reference issues

    // Handle initial username setting (from welcome screen)
    socket.on('set_username', (username) => {
        const trimmedUsername = username.trim();

        if (!trimmedUsername || trimmedUsername.length < 2 || trimmedUsername.length > 20) {
            socket.emit('admin_message', 'Username must be between 2 and 20 characters long.');
            return;
        }

        const usernameTaken = Object.values(users).some(user => user.username.toLowerCase() === trimmedUsername.toLowerCase());
        if (usernameTaken) {
            socket.emit('admin_message', `Username "${trimmedUsername}" is already taken. Please choose another.`);
            return;
        }

        const userColor = getRandomColor();
        const oldUserData = users[socket.id];

        if (oldUserData && oldUserData.username) {
            // User changing their name (unlikely with welcome screen, but good to handle)
            const oldUsername = oldUserData.username;
            users[socket.id] = { username: trimmedUsername, color: userColor, lastTypingTime: 0 };
            const adminMsg = `${oldUsername} is now known as ${trimmedUsername}.`;
            const messageData = {
                username: 'Admin',
                message: adminMsg,
                timestamp: getCurrentTimestamp(),
                messageId: `msg-${++messageIdCounter}`,
                type: 'admin'
            };
            messageHistory.push(messageData);
            io.emit('admin_message', messageData);
            console.log(`${oldUsername} changed name to ${trimmedUsername}`);
        } else {
            // New user joining for the first time
            users[socket.id] = { username: trimmedUsername, color: userColor, lastTypingTime: 0 };
            socket.emit('admin_message', {
                username: 'Admin',
                message: `Welcome, ${trimmedUsername}!`,
                timestamp: getCurrentTimestamp(),
                messageId: `msg-${++messageIdCounter}`,
                type: 'admin'
            });
            socket.broadcast.emit('user_status', { username: trimmedUsername, status: 'joined' });
            console.log(`${trimmedUsername} joined.`);
        }

        io.emit('user_count', Object.keys(users).length);
    });

    // Handle incoming chat messages
    socket.on('chat_message', (messageText, replyToMessageId = null) => {
        const userData = users[socket.id];
        const username = userData ? userData.username : 'Anonymous';
        const color = userData ? userData.color : 'gray';

        if (username === 'Anonymous') {
            socket.emit('admin_message', {
                username: 'Admin',
                message: 'Please set your username before sending messages.',
                timestamp: getCurrentTimestamp(),
                messageId: `msg-${++messageIdCounter}`,
                type: 'admin'
            });
            return;
        }

        const messageId = `msg-${++messageIdCounter}`;

        let replyToData = null;
        if (replyToMessageId) {
            const originalMessage = messageHistory.find(msg => msg.messageId === replyToMessageId);
            if (originalMessage) {
                replyToData = {
                    messageId: originalMessage.messageId,
                    username: originalMessage.username,
                    text: originalMessage.message
                };
            }
        }

        const messageData = {
            username: username,
            message: messageText,
            timestamp: getCurrentTimestamp(),
            messageId: messageId,
            replyTo: replyToData,
            reactions: {}, // Initialize with empty reactions
            type: 'user',
            color: color // Pass user's color
        };

        messageHistory.push(messageData);
        io.emit('chat_message', messageData);
        console.log(`[${getCurrentTimestamp()}] ${username}: ${messageText}`);

        // Handle AI question if message starts with /ai
        if (messageText.toLowerCase().startsWith('/ai ')) {
            const prompt = messageText.substring(4).trim();
            console.log(`AI request from ${username}: ${prompt}`);
            // Call the AI proxy endpoint internally
            fetch(`http://localhost:${PORT}/ask-ai`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: prompt })
            })
            .then(res => res.json())
            .then(aiResult => {
                if (aiResult.response) {
                    const aiMessageData = {
                        username: 'Bro_Chatz AI',
                        message: aiResult.response,
                        timestamp: getCurrentTimestamp(),
                        messageId: `msg-${++messageIdCounter}`,
                        type: 'admin', // Use 'admin' type for AI responses
                        color: 'rgb(120, 200, 255)' // A distinct color for AI
                    };
                    messageHistory.push(aiMessageData);
                    io.emit('chat_message', aiMessageData); // Emit as a regular chat message with admin type
                } else if (aiResult.error) {
                    const errorMsgData = {
                        username: 'Admin',
                        message: `AI Error: ${aiResult.error}`,
                        timestamp: getCurrentTimestamp(),
                        messageId: `msg-${++messageIdCounter}`,
                        type: 'admin'
                    };
                    messageHistory.push(errorMsgData);
                    io.emit('chat_message', errorMsgData);
                }
            })
            .catch(error => {
                console.error('Error calling AI service from server (internal fetch):', error);
                const errorMsgData = {
                    username: 'Admin',
                    message: `AI Service connection error.`,
                    timestamp: getCurrentTimestamp(),
                    messageId: `msg-${++messageIdCounter}`,
                    type: 'admin'
                };
                messageHistory.push(errorMsgData);
                io.emit('chat_message', errorMsgData);
            });
        }
    });

    // Handle typing indicator
    socket.on('typing', () => {
        const userData = users[socket.id];
        if (userData && userData.username) {
            typingUsers[userData.username] = Date.now(); // Store last typing time
            // Send updated list of typers to everyone except the one typing
            socket.broadcast.emit('typing_users_update', Object.keys(typingUsers));
        }
    });

    socket.on('stop_typing', () => {
        const userData = users[socket.id];
        if (userData && userData.username) {
            delete typingUsers[userData.username]; // Remove user from typers
            socket.broadcast.emit('typing_users_update', Object.keys(typingUsers));
        }
    });

    // Handle message reactions
    socket.on('react_to_message', (messageId, emoji) => {
        const userData = users[socket.id];
        if (!userData || !userData.username) {
            socket.emit('admin_message', {
                username: 'Admin',
                message: 'Please set your username before reacting to messages.',
                timestamp: getCurrentTimestamp(),
                messageId: `msg-${++messageIdCounter}`,
                type: 'admin'
            });
            return;
        }

        const targetMessage = messageHistory.find(msg => msg.messageId === messageId);
        if (targetMessage) {
            targetMessage.reactions = targetMessage.reactions || {};
            // Increment count for the emoji
            targetMessage.reactions[emoji] = (targetMessage.reactions[emoji] || 0) + 1;

            // Broadcast the entire updated reactions object for this message
            io.emit('message_reacted', {
                messageId: messageId,
                updatedReactions: targetMessage.reactions
            });
        }
    });

    // Handle user disconnection
    socket.on('disconnect', () => {
        const userData = users[socket.id];
        if (userData && userData.username) {
            delete users[socket.id];
            delete typingUsers[userData.username]; // Ensure they are removed from typers list
            io.emit('user_count', Object.keys(users).length);
            io.emit('user_status', { username: userData.username, status: 'left' });
            // Update other clients about typing users (if any)
            socket.broadcast.emit('typing_users_update', Object.keys(typingUsers));
            console.log(`${userData.username} disconnected.`);
        } else {
            io.emit('user_count', Object.keys(users).length);
            console.log(`Anonymous user disconnected: ${socket.id}`);
        }
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open your browser to http://localhost:${PORT}`);
    console.log(`To use AI, send a message starting with '/ai ' (e.g., '/ai What is the capital of France?')`);
});