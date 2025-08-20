const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Load environment variables with error handling
try {
    require('dotenv').config();
    console.log('✅ Environment variables loaded');
} catch (error) {
    console.log('⚠️ No .env file found, using environment variables');
}

const app = express();
const server = createServer(app);

// Enhanced Socket.IO configuration for Render deployment
const io = new Server(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production' ? false : "*",
        methods: ["GET", "POST"],
        credentials: false
    },
    allowEIO3: true,
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6,
    serveClient: false
});

// Minimal middleware to avoid body-parser issues
app.use(express.static(path.join(__dirname, 'public')));

// Manual JSON parsing to avoid body-parser
app.use((req, res, next) => {
    if (req.method === 'POST' && req.headers['content-type'] === 'application/json') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                req.body = JSON.parse(body);
            } catch (e) {
                req.body = {};
            }
            next();
        });
    } else {
        next();
    }
});

// Health check endpoint for Render
app.get('/health', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
        status: 'OK', 
        message: 'BRO_CHATZ is running!',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    }));
});

// Root route with error handling
app.get('/', (req, res) => {
    try {
        const indexPath = path.join(__dirname, 'public', 'index.html');
        res.sendFile(indexPath, (err) => {
            if (err) {
                console.error('Error sending index.html:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Server Error: Unable to load the application');
            }
        });
    } catch (error) {
        console.error('Route error:', error);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server Error');
    }
});

// Store connected users
const onlineUsers = new Map();
const restrictedUsernames = ['developer', 'DEVELOPER', 'Developer', 'DEVEL0PER', 'devel0per'];
const userColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
];

// Enhanced Gemini AI Integration with better error handling
let genAI, model;

async function initializeGeminiAI() {
    try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
            genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.trim());
            model = genAI.getGenerativeModel({ 
                model: "gemini-1.5-flash",
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024,
                }
            });
            console.log('✅ Gemini AI initialized successfully');
            return true;
        } else {
            console.log('⚠️ GEMINI_API_KEY not found in environment variables');
            return false;
        }
    } catch (error) {
        console.log('⚠️ Gemini AI initialization failed:', error.message);
        return false;
    }
}

// Initialize AI on startup
initializeGeminiAI();

async function generateAIResponse(prompt) {
    try {
        if (!model) {
            return "Sorry, AI service is currently unavailable. Please try again later!";
        }
        
        // Add safety check for prompt
        if (!prompt || prompt.trim().length === 0) {
            return "Please provide a valid prompt for the AI to respond to!";
        }
        
        const result = await model.generateContent(prompt.trim());
        const response = await result.response;
        const text = response.text();
        
        return text || "I'm unable to generate a response right now. Please try again!";
    } catch (error) {
        console.error('AI Error:', error);
        if (error.message?.includes('API_KEY')) {
            return "AI service configuration error. Please contact the administrator.";
        }
        return "Sorry, I'm having trouble processing your request right now. Please try again later!";
    }
}

// Enhanced Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('🚀 New user connected:', socket.id);

    // Handle user joining with validation
    socket.on('user-joined', (userData) => {
    try {
        let username, isDeveloper = false;
        
        // Handle both old string format and new object format
        if (typeof userData === 'string') {
            username = userData.trim();
        } else {
            username = userData.username ? userData.username.trim() : '';
            isDeveloper = userData.isDeveloper || false;

        }

        // Validate username
        if (!username || username.length === 0) {
            socket.emit('error-message', { message: 'Invalid username provided' });
            return;
        }

        const cleanUsername = username.substring(0, 50);
        
        // Check if it's a developer login
        if (isDeveloper) {
            if (cleanUsername !== 'DEVELOPER') {
                socket.emit('error-message', { message: 'Invalid developer credentials' });
                return;
            }
        } else {
            // Check for restricted usernames for normal users
            if (restrictedUsernames.some(restricted => 
                cleanUsername.toLowerCase() === restricted.toLowerCase())) {
                socket.emit('error-message', { 
                    message: 'This username is reserved. Please choose another one.' 
                });
                return;
            }
        }
        
        // Check if username is already taken
        const existingUser = Array.from(connectedUsers.values()).find(user => 
            user.username.toLowerCase() === cleanUsername.toLowerCase()
        );
        
        if (existingUser) {
            socket.emit('username-taken', { 
                message: 'Username is already taken. Please choose another one.' 
            });
            return;
        }

        // Assign unique color
        const colorIndex = connectedUsers.size % userColors.length;
        const userColor = userColors[colorIndex];
        
        // Get client IP address
        const clientIP = socket.handshake.headers['x-forwarded-for'] || 
                        socket.handshake.headers['x-real-ip'] || 
                        socket.conn.remoteAddress || 
                        socket.handshake.address || 
                        'Unknown';

        onlineUsers.set(socket.id, {
    username: cleanUsername,
    color: userColor,
    joinTime: new Date(),
    isDeveloper: isDeveloper,
    ip: clientIP
});

// ✅ update count + dev panel immediately
io.emit('update-online-count', onlineUsers.size);
io.emit('online-users-list', Array.from(onlineUsers.values()));


        // Send welcome message
        const welcomeMessage = isDeveloper ? 
            `👑 Welcome back, Developer! You have full administrative access.` :
            `🎉 Welcome to BRO_CHATZ, ${cleanUsername}! Ready to chat with awesome people? Let's get this party started! 🚀`;
            
        socket.emit('admin-message', {
            message: welcomeMessage,
            timestamp: new Date(),
            type: 'welcome'
        });

        // Notify all users about new join (except for developer)
        if (!isDeveloper) {
            socket.broadcast.emit('user-notification', {
                message: `${cleanUsername} entered the chatz`,
                type: 'join',
                username: cleanUsername,
                color: userColor,
                timestamp: new Date()
            });
        }
    } catch (error) {
        console.error('Error in user-joined:', error);
    }
});


    // Enhanced chat message handling
    socket.on('chat-message', (data) => {
        try {
            const user = connectedUsers.get(socket.id);
            if (!user) {
                socket.emit('error-message', { message: 'User not found. Please refresh and rejoin.' });
                return;
            }

            if (!data || !data.message || typeof data.message !== 'string') {
                return; // Ignore invalid messages
            }

            const message = data.message.trim();
            if (message.length === 0 || message.length > 1000) {
                return; // Ignore empty or too long messages
            }

            // Check if it's an AI command
            if (message.startsWith('/ai ')) {
                const aiPrompt = message.substring(4).trim();
                
                if (aiPrompt.length === 0) {
                    socket.emit('ai-response', {
                        prompt: aiPrompt,
                        response: "Please provide a prompt after /ai command. Example: /ai What is JavaScript?",
                        timestamp: new Date()
                    });
                    return;
                }
                
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
                    message: message,
                    username: user.username,
                    color: user.color,
                    timestamp: new Date(),
                    messageId: Date.now() + Math.random(),
                    replyTo: data.replyTo || null
                };
                
                io.emit('chat-message', messageData);
            }
        } catch (error) {
            console.error('Error in chat-message:', error);
        }
    });

    // Handle typing indicators with validation
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

    // Handle message reactions with validation
    socket.on('message-reaction', (data) => {
        try {
            const user = connectedUsers.get(socket.id);
            if (user && data && data.messageId && data.emoji) {
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
socket.on('get-online-users', () => {
    socket.emit('online-users-list', Array.from(onlineUsers.values()));
    });

    // Handle user disconnection
socket.on('disconnect', () => {
    try {
        onlineUsers.delete(socket.id);

        // ✅ update count and dev list again
        io.emit('update-online-count', onlineUsers.size);
        io.emit('online-users-list', Array.from(onlineUsers.values()));

        console.log(`User disconnected: ${socket.id}`);
    } catch (err) {
        console.error('Error in disconnect:', err);
    }
});                
            
    // Handle connection errors
    socket.on('error', (error) => {
        console.error('Socket error for', socket.id, ':', error);
    });
});

// Enhanced error handling
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Don't exit the process in production
    if (process.env.NODE_ENV !== 'production') {
        process.exit(1);
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully...');
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

// Start server with enhanced configuration
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
    console.log(`🚀 BRO_CHATZ Server running on ${HOST}:${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔑 Gemini AI: ${process.env.GEMINI_API_KEY ? 'Enabled' : 'Disabled'}`);
    console.log(`📊 Node.js version: ${process.version}`);
    console.log(`🕒 Server started at: ${new Date().toISOString()}`);
}).on('error', (error) => {
    console.error('Server failed to start:', error);
    process.exit(1);
});