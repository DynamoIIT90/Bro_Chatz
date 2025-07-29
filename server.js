const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Store connected users
const connectedUsers = new Map();
const userColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
];

// Gemini AI Integration
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateAIResponse(prompt) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('AI Error:', error);
        return "Sorry, I'm having trouble processing your request right now. Please try again later!";
    }
}

io.on('connection', (socket) => {
    console.log('New user connected:', socket.id);

    // Handle user joining
    socket.on('user-joined', (username) => {
        // Assign unique color
        const colorIndex = connectedUsers.size % userColors.length;
        const userColor = userColors[colorIndex];
        
        connectedUsers.set(socket.id, {
            username,
            color: userColor,
            joinTime: new Date()
        });

        // Send welcome message from BRO CHATZ ADMIN
        socket.emit('admin-message', {
            message: `🎉 Welcome to BRO_CHATZ, ${username}! Ready to chat with awesome people? Let's get this party started! 🚀`,
            timestamp: new Date(),
            type: 'welcome'
        });

        // Notify all users about new join
        socket.broadcast.emit('user-notification', {
            message: `${username} entered the chatz`,
            type: 'join',
            username,
            color: userColor,
            timestamp: new Date()
        });

        // Update online count
        io.emit('update-online-count', connectedUsers.size);
        
        // Send user their assigned color
        socket.emit('user-color-assigned', { color: userColor });
    });

    // Handle regular chat messages
    socket.on('chat-message', (data) => {
        const user = connectedUsers.get(socket.id);
        if (user) {
            // Check if it's an AI command
            if (data.message.startsWith('/ai ')) {
                const aiPrompt = data.message.substring(4);
                
                // Send typing indicator for AI
                socket.emit('ai-typing', true);
                
                generateAIResponse(aiPrompt).then(aiResponse => {
                    socket.emit('ai-typing', false);
                    socket.emit('ai-response', {
                        prompt: aiPrompt,
                        response: aiResponse,
                        timestamp: new Date()
                    });
                });
            } else {
                // Regular message to all users
                const messageData = {
                    message: data.message,
                    username: user.username,
                    color: user.color,
                    timestamp: new Date(),
                    messageId: Date.now() + Math.random(),
                    replyTo: data.replyTo || null
                };
                
                io.emit('chat-message', messageData);
            }
        }
    });

    // Handle typing indicators
    socket.on('typing-start', () => {
        const user = connectedUsers.get(socket.id);
        if (user) {
            socket.broadcast.emit('user-typing', {
                username: user.username,
                color: user.color,
                isTyping: true
            });
        }
    });

    socket.on('typing-stop', () => {
        const user = connectedUsers.get(socket.id);
        if (user) {
            socket.broadcast.emit('user-typing', {
                username: user.username,
                color: user.color,
                isTyping: false
            });
        }
    });

    // Handle message reactions
    socket.on('message-reaction', (data) => {
        const user = connectedUsers.get(socket.id);
        if (user) {
            io.emit('message-reaction', {
                messageId: data.messageId,
                emoji: data.emoji,
                username: user.username,
                color: user.color,
                timestamp: new Date()
            });
        }
    });

    // Handle user disconnection
    socket.on('disconnect', () => {
        const user = connectedUsers.get(socket.id);
        if (user) {
            // Notify all users about user leaving
            socket.broadcast.emit('user-notification', {
                message: `${user.username} exited the chatz`,
                type: 'leave',
                username: user.username,
                color: user.color,
                timestamp: new Date()
            });
            
            connectedUsers.delete(socket.id);
            
            // Update online count
            io.emit('update-online-count', connectedUsers.size);
        }
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 BRO_CHATZ Server running on port ${PORT}`);
});