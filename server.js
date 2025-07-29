const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: false
    },
    allowEIO3: true,
    transports: ['websocket', 'polling']
});

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Health check endpoint for Render
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'BRO_CHATZ is running!' });
});

// Main route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Store connected users
const connectedUsers = new Map();
const userColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
];

// Gemini AI Integration
let genAI, model;

try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    if (process.env.GEMINI_API_KEY) {
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        console.log('✅ Gemini AI initialized successfully');
    } else {
        console.log('⚠️ GEMINI_API_KEY not found in environment variables');
    }
} catch (error) {
    console.log('⚠️ Gemini AI initialization failed:', error.message);
}

async function generateAIResponse(prompt) {
    try {
        if (!model) {
            return "Sorry, AI service is currently unavailable. Please try again later!";
        }
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('AI Error:', error);
        return "Sorry, I'm having trouble processing your request right now. Please try again later!";
    }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('🚀 New user connected:', socket.id);

    // Handle user joining
    socket.on('user-joined', (username) => {
        try {
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
            
            console.log(`👋 User ${username} joined with color ${userColor}`);
        } catch (error) {
            console.error('Error in user-joined:', error);
        }
    });

    // Handle regular chat messages
    socket.on('chat-message', (data) => {
        try {
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
                    }).catch(error => {
                        console.error('AI response error:', error);
                        socket.emit('ai-typing', false);
                        socket.emit('ai-response', {
                            prompt: aiPrompt,
                            response: "Sorry, I encountered an error. Please try again!",
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
        } catch (error) {
            console.error('Error in chat-message:', error);
        }
    });

    // Handle typing indicators
    socket.on('typing-start', () => {
        try {
            const user = connectedUsers.get(socket.id);
            if (user) {
                socket.broadcast.emit('user-typing', {
                    username: user.username,
                    color: user.color,
                    isTyping: true
                });
            }
        } catch (error) {
            console.error('Error in typing-start:', error);
        }
    });

    socket.on('typing-stop', () => {
        try {
            const user = connectedUsers.get(socket.id);
            if (user) {
                socket.broadcast.emit('user-typing', {
                    username: user.username,
                    color: user.color,
                    isTyping: false
                });
            }
        } catch (error) {
            console.error('Error in typing-stop:', error);
        }
    });

    // Handle message reactions
    socket.on('message-reaction', (data) => {
        try {
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
        } catch (error) {
            console.error('Error in message-reaction:', error);
        }
    });

    // Handle user disconnection
    socket.on('disconnect', () => {
        try {
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
                
                console.log(`👋 User ${user.username} disconnected`);
            }
        } catch (error) {
            console.error('Error in disconnect:', error);
        }
        console.log('❌ User disconnected:', socket.id);
    });
});

// Error handling
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 BRO_CHATZ Server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔑 Gemini AI: ${process.env.GEMINI_API_KEY ? 'Enabled' : 'Disabled'}`);
});