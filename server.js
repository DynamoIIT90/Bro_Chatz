const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
// Store posts in memory
const posts = new Map();

// Load environment variables with error handling
try {
    require('dotenv').config();
    console.log('✅ Environment variables loaded');
} catch (error) {
    console.log('⚠️ No .env file found, using environment variables');
}

const app = express();
const server = createServer(app);
// DM System Storage
const dmMessages = new Map(); // userId-userId -> messages array
const dmTypingUsers = new Map(); // userId -> Set of users they're typing to

// Enhanced Socket.IO configuration for Render deployment
const io = new Server(server, {
    cors: {
    origin: "*",   // allow all for now
    methods: ["GET", "POST"],
    credentials: true
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
 onlineUsers = new Map();
const restrictedUsernames = ['developer', 'DEVELOPER', 'Developer', 'DEVEL0PER', 'devel0per'];
const userColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
];

// ================= WORD FILTER SYSTEM =================
const BLOCKED_WORDS = ['nigga', 'fuck', 'bitch', 'madarchod', 'madharchod', 'randi', 'rand', 'bsdk', 'bhosdiwale', 'bhosdi', 'bhenchod', 'benchod', 'chod', 'chud', 'sperm', 'land', 'launda', 'lund', 'boob', 'pussy', 'chuchi', 'sex', 'sexy', 'chutiye', 'chut', 'chutiya', '$ex', 'nipple', 'jhaant', 'jant', 'rande']; // Add or remove words separated by commas
const userWarnings = new Map(); // Track user warnings (socketId -> count)

function containsBlockedWord(message) {
    const lowerMessage = message.toLowerCase();
    return BLOCKED_WORDS.some(word => {
        // Check if word exists as whole word or part of text
        const regex = new RegExp(`\\b${word}\\b|${word}`, 'i');
        return regex.test(lowerMessage);
    });
}

function handleMessageViolation(socket, user) {
    const currentWarnings = (userWarnings.get(socket.id) || 0) + 1;
    userWarnings.set(socket.id, currentWarnings);
    
    // Send warning to user
    socket.emit('message-blocked', {
        message: `⚠️ Your message was blocked for containing inappropriate content. Warning ${currentWarnings}/3`,
        warningCount: currentWarnings
    });
    
    // Kick after 3 violations
    if (currentWarnings >= 3) {
        socket.emit('user-kicked', { 
            username: user.username,
            reason: 'Multiple violations of chat guidelines'
        });
        
        io.emit('admin-message', { 
            message: `🚫 ${user.username} was removed for violating chat guidelines`,
            timestamp: new Date(),
            type: 'kick'
        });
        
        // Disconnect user
        setTimeout(() => {
            socket.disconnect(true);
            onlineUsers.delete(socket.id);
            userWarnings.delete(socket.id);
            io.emit('update-online-count', onlineUsers.size);
        }, 1000);
        
        console.log(`🚫 ${user.username} kicked for word filter violations`);
    } else {
        console.log(`⚠️ ${user.username} warned (${currentWarnings}/3)`);
    }
}

let currentPhonk = "phonk.mp3"; // default track
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

    // ===== User joined =====
    socket.on('user-joined', (userData) => {
        try {
            let username, isDeveloper = false;

            // Handle string or object format
            if (typeof userData === 'string') {
                username = userData.trim();
            } else {
                username = userData.username ? userData.username.trim() : '';
                isDeveloper = userData.isDeveloper || false;
            }

            if (!username || username.length === 0) {
                socket.emit('error-message', { message: 'Invalid username provided' });
                return;
            }

            const cleanUsername = username.substring(0, 50);

                // ===== POSTS SYSTEM =====
    socket.on('create-post', (data) => {
        const postId = Date.now().toString();
        const post = {
            id: postId,
            author: data.author,
            content: data.content,
            reactions: {},
            comments: [],
            impressions: 0,
            timestamp: new Date()
        };
        posts.set(postId, post);
        io.emit('post-created', post);
    });

    socket.on('post-react', ({ postId, emoji, user }) => {
        const post = posts.get(postId);
        if (!post) return;
        if (!post.reactions[emoji]) post.reactions[emoji] = [];
        if (!post.reactions[emoji].includes(user)) {
            post.reactions[emoji].push(user);
        }
        io.emit('post-updated', post);
    });

    socket.on('post-comment', ({ postId, user, comment }) => {
        const post = posts.get(postId);
        if (!post) return;
        post.comments.push({ user, text: comment, time: new Date() });
        io.emit('post-updated', post);
    });

    socket.on('post-edit', ({ postId, newContent }) => {
        const post = posts.get(postId);
        if (!post) return;
        post.content = newContent;
        io.emit('post-updated', post);
    });

    socket.on('post-delete', ({ postId }) => {
        if (posts.has(postId)) {
            posts.delete(postId);
            io.emit('post-deleted', { postId });
        }
    });

    socket.on('post-impression', ({ postId }) => {
        const post = posts.get(postId);
        if (!post) return;
        post.impressions++;
        io.emit('post-updated', post);
    });


            // Developer validation
            if (isDeveloper) {
                if (cleanUsername !== 'DEVELOPER') {
                    socket.emit('error-message', { message: 'Invalid developer credentials' });
                    return;
                }
            } else {
                if (restrictedUsernames.some(restricted => cleanUsername.toLowerCase() === restricted.toLowerCase())) {
                    socket.emit('error-message', { message: 'This username is reserved. Please choose another one.' });
                    return;
                }
            }

            // Check duplicate
            const existingUser = Array.from(onlineUsers.values()).find(user => user.username.toLowerCase() === cleanUsername.toLowerCase());
            if (existingUser) {
                socket.emit('username-taken', { message: 'Username is already taken. Please choose another one.' });
                return;
            }

            // Assign color
            const colorIndex = onlineUsers.size % userColors.length;
            const userColor = userColors[colorIndex];

            // Get client IP
            const clientIP = socket.handshake.headers['x-forwarded-for'] || 
                             socket.handshake.headers['x-real-ip'] || 
                             socket.conn.remoteAddress || 
                             socket.handshake.address || 
                             'Unknown';

            // Add user
            onlineUsers.set(socket.id, {
                username: cleanUsername,
                color: userColor,
                joinTime: new Date(),
                isDeveloper: isDeveloper,
                ip: clientIP
            });

            // Update counts & list
            io.emit('update-online-count', onlineUsers.size);
            io.emit('online-users-list', Array.from(onlineUsers.values()));

            // Welcome message
            const welcomeMessage = isDeveloper ? 
                `👑 Welcome back, Developer! You have full administrative access.` :
                `🎉 Welcome to BRO_CHATZ, ${cleanUsername}! Ready to chat with awesome people? Let's get this party started! 🚀`;

            socket.emit('admin-message', { message: welcomeMessage, timestamp: new Date(), type: 'welcome' });

// ===== Get users for DM =====
socket.on('get-users-for-dm', () => {
    const users = Array.from(onlineUsers.values()).map(user => ({
        id: [...onlineUsers.entries()].find(([id, u]) => u.username === user.username)?.[0],
        username: user.username,
        color: user.color,
        isDeveloper: user.isDeveloper
    }));
    socket.emit('users-for-dm', users);
});

// ===== DM Message =====
socket.on('dm-message', (data) => {
    try {
        const sender = onlineUsers.get(socket.id);
        if (!sender) return;

        const { targetUserId, message, messageId, isGIF } = data;
        
        // Find target user
        const targetUser = onlineUsers.get(targetUserId);
        if (!targetUser) return;

        // Create message object
        const messageData = {
            senderId: socket.id,
            targetUserId: targetUserId,
            senderName: sender.username,
            senderColor: sender.color,
            message: message,
            messageId: messageId,
            timestamp: new Date(),
            isGIF: isGIF || false,
            status: 'delivered'
        };

        // Store message
        const conversationId = [socket.id, targetUserId].sort().join('-');
        if (!dmMessages.has(conversationId)) {
            dmMessages.set(conversationId, []);
        }
        dmMessages.get(conversationId).push(messageData);

        // Send to target user
io.to(targetUserId).emit('dm-message', messageData);

// Echo back to sender too (so their UI adds it)
socket.emit('dm-message', { ...messageData, isOwn: true });

// Confirm delivery status
socket.emit('dm-message-status', {
    messageId: messageId,
    status: 'delivered'
});


    } catch (error) {
        console.error('Error in dm-message:', error);
    }
});

// ===== DM Typing =====
socket.on('dm-typing-start', (data) => {
    try {
        const user = onlineUsers.get(socket.id);
        if (!user) return;

        const { targetUserId } = data;
        io.to(targetUserId).emit('dm-typing-start', {
            senderId: socket.id,
            username: user.username,
            color: user.color
        });
    } catch (error) {
        console.error('Error in dm-typing-start:', error);
    }
});

socket.on('dm-typing-stop', (data) => {
    try {
        const user = onlineUsers.get(socket.id);
        if (!user) return;

        const { targetUserId } = data;
        io.to(targetUserId).emit('dm-typing-stop', {
            senderId: socket.id,
            username: user.username
        });
    } catch (error) {
        console.error('Error in dm-typing-stop:', error);
    }
});

// ===== DM Message Read =====
socket.on('dm-message-read', (data) => {
    try {
        const { senderId, messageId } = data;
        
        // Update message status
        io.to(senderId).emit('dm-message-status', {
            messageId: messageId,
            status: 'read'
        });
        
        // Update stored message status
        const conversationId = [socket.id, senderId].sort().join('-');
        const messages = dmMessages.get(conversationId);
        if (messages) {
            const message = messages.find(msg => msg.messageId === messageId);
            if (message) {
                message.status = 'read';
            }
        }
    } catch (error) {
        console.error('Error in dm-message-read:', error);
    }
});

// ===== Delete DM Message =====
socket.on('delete-dm-message', (data) => {
    try {
        const { targetUserId, messageId } = data;
        
        // Remove from storage
        const conversationId = [socket.id, targetUserId].sort().join('-');
        const messages = dmMessages.get(conversationId);
        if (messages) {
            const index = messages.findIndex(msg => msg.messageId === messageId);
            if (index > -1) {
                messages.splice(index, 1);
            }
        }
        
        // Notify target user
        io.to(targetUserId).emit('dm-message-deleted', {
            messageId: messageId,
            senderId: socket.id
        });
        
    } catch (error) {
        console.error('Error in delete-dm-message:', error);
    }
});

// ===== DM Reactions =====
socket.on('dm-reaction', (data) => {
    try {
        const user = onlineUsers.get(socket.id);
        if (!user) return;

        const { targetUserId, messageId, emoji } = data;
        
        io.to(targetUserId).emit('dm-reaction', {
            senderId: socket.id,
            senderName: user.username,
            senderColor: user.color,
            messageId: messageId,
            emoji: emoji,
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Error in dm-reaction:', error);
    }
});

    // ===== Developer Phonk broadcasting =====
if (cleanUsername === "DEVELOPER") {
    // When developer joins, everyone hears current track
    io.emit("playPhonk", { track: currentPhonk });
}

// Allow developer to change Phonk
socket.on("changePhonk", (trackPath) => {
    const user = onlineUsers.get(socket.id);
    if (user && user.isDeveloper) {
        currentPhonk = trackPath; // save server-side
        io.emit("playPhonk", { track: currentPhonk }); // broadcast to all
        console.log(`🎵 Phonk changed to: ${trackPath}`);
    }
});


            // Notify all users (except dev) of join
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

    // ===== Chat message =====
   socket.on('chat-message', (data) => {
    try {
        const user = onlineUsers.get(socket.id);
        if (!user) {
            socket.emit('error-message', { message: 'User not found. Please refresh and rejoin.' });
            return;
        }

        if (!data || !data.message || typeof data.message !== 'string') return;

        const message = data.message.trim();
        if (message.length === 0 || message.length > 1000) return;

        // ===== CHECK FOR BLOCKED WORDS (Skip for developers) =====
if (!user.isDeveloper && containsBlockedWord(message)) {
    handleMessageViolation(socket, user);
    return; // Stop message from being sent
}

        // AI command
        if (message.startsWith('/ai ')) {
            const aiPrompt = message.substring(4).trim();
            if (aiPrompt.length === 0) {
                socket.emit('ai-response', {
                    prompt: aiPrompt,
                    response: "Please provide a prompt after /ai command.",
                    timestamp: new Date()
                });
                return;
            }
            socket.emit('ai-typing', true);
            generateAIResponse(aiPrompt).then(aiResponse => {
                socket.emit('ai-typing', false);
                socket.emit('ai-response', { prompt: aiPrompt, response: aiResponse, timestamp: new Date() });
            }).catch(error => {
                console.error('AI response error:', error);
                socket.emit('ai-typing', false);
                socket.emit('ai-response', { prompt: aiPrompt, response: "AI error, try again!", timestamp: new Date() });
            });
        } else {
            // Normal chat
            const messageData = {
                message,
                username: user.username,
                color: user.color,
                timestamp: new Date(),
                messageId: Date.now() + Math.random(),
                replyTo: data.replyTo || null,
                isDeveloper: user.isDeveloper
            };
            io.emit('chat-message', messageData);
        }
    } catch (error) {
        console.error('Error in chat-message:', error);
    }
});

    // ===== Typing =====
    socket.on('typing-start', () => {
        try {
            const user = onlineUsers.get(socket.id);
            if (user) {
                socket.broadcast.emit('user-typing', { username: user.username, color: user.color, isTyping: true });
            }
        } catch (error) { console.error('Error in typing-start:', error); }
    });

    socket.on('typing-stop', () => {
        try {
            const user = onlineUsers.get(socket.id);
            if (user) {
                socket.broadcast.emit('user-typing', { username: user.username, color: user.color, isTyping: false });
            }
        } catch (error) { console.error('Error in typing-stop:', error); }
    });

    // ===== Message reaction =====
    socket.on('message-reaction', (data) => {
        try {
            const user = onlineUsers.get(socket.id);
            if (user && data && data.messageId && data.emoji) {
                io.emit('message-reaction', { messageId: data.messageId, emoji: data.emoji, username: user.username, color: user.color, timestamp: new Date() });
            }
        } catch (error) { console.error('Error in message-reaction:', error); }
    });

    // ===== Online users =====
    socket.on('get-online-users', () => {
        socket.emit('online-users-list', Array.from(onlineUsers.values()));
    });

    // ===== WARN user (DEV) =====
    socket.on('warn-user', (data) => {
        try {
            const { username, reason } = data;
            const userEntry = [...onlineUsers.entries()].find(([id, u]) => u.username === username);
            if (userEntry) {
                const [targetId, user] = userEntry;
                io.to(targetId).emit('user-warned', { username, reason });
                console.log(`⚠️ ${username} warned: ${reason}`);
            }
        } catch (err) { console.error('Error in warn-user:', err); }
    });

    // ===== KICK user (DEV) =====
    socket.on('kick-user', (data) => {
        try {
            const { username } = data;
            const userEntry = [...onlineUsers.entries()].find(([id, u]) => u.username === username);
            if (userEntry) {
                const [targetId, user] = userEntry;

                io.to(targetId).emit('user-kicked', { username });
                io.emit('kick-notification', { username });

                io.sockets.sockets.get(targetId)?.disconnect(true);
                onlineUsers.delete(targetId);

                io.emit('update-online-count', onlineUsers.size);
                io.emit('online-users-list', Array.from(onlineUsers.values()));

                console.log(`🚫 ${username} kicked out`);
            }
        } catch (err) { console.error('Error in kick-user:', err); }
    });

// ADD this code to your server.js file, insert it just before the disconnect event handler

// ================= POSTS SYSTEM SERVER HANDLERS =================

// Posts storage (in-memory)
const postsStorage = new Map(); // postId -> post object
const postComments = new Map(); // postId -> comments array
const postReactions = new Map(); // postId -> reactions object

// ===== Create Post =====
socket.on('create-post', (postData) => {
    try {
        const user = onlineUsers.get(socket.id);
        if (!user) return;

        // Validate post data
        if (!postData.content || postData.content.trim().length === 0) {
            socket.emit('error-message', { message: 'Post content cannot be empty' });
            return;
        }

        if (postData.content.length > 500) {
            socket.emit('error-message', { message: 'Post content too long (max 500 characters)' });
            return;
        }

        // Create post object
        const post = {
            id: postData.id,
            content: postData.content.trim(),
            image: postData.image || null,
            author: user.username,
            authorColor: user.color,
            isDeveloper: user.isDeveloper,
            timestamp: new Date(),
            reactions: {},
            impressions: 0
        };

        // Store post
        postsStorage.set(post.id, post);
        postComments.set(post.id, []);
        postReactions.set(post.id, {});

        // Broadcast to all users
        io.emit('post-created', post);

        console.log(`📝 New post created by ${user.username}: ${post.content.substring(0, 50)}...`);

    } catch (error) {
        console.error('Error in create-post:', error);
        socket.emit('error-message', { message: 'Failed to create post' });
    }
});

// ===== Edit Post =====
socket.on('edit-post', (data) => {
    try {
        const user = onlineUsers.get(socket.id);
        if (!user) return;

        const { postId, content } = data;
        const post = postsStorage.get(postId);

        if (!post) {
            socket.emit('error-message', { message: 'Post not found' });
            return;
        }

        // Check ownership
        if (post.author !== user.username && !user.isDeveloper) {
            socket.emit('error-message', { message: 'You can only edit your own posts' });
            return;
        }

        // Validate content
        if (!content || content.trim().length === 0) {
            socket.emit('error-message', { message: 'Post content cannot be empty' });
            return;
        }

        if (content.length > 500) {
            socket.emit('error-message', { message: 'Post content too long' });
            return;
        }

        // Update post
        post.content = content.trim();
        post.edited = true;
        post.editedAt = new Date();

        // Broadcast update
        io.emit('post-updated', {
            postId: postId,
            content: post.content,
            edited: true,
            editedAt: post.editedAt
        });

        console.log(`✏️ Post edited by ${user.username}: ${postId}`);

    } catch (error) {
        console.error('Error in edit-post:', error);
    }
});

// ===== Delete Post =====
socket.on('delete-post', (data) => {
    try {
        const user = onlineUsers.get(socket.id);
        if (!user) return;

        const { postId } = data;
        const post = postsStorage.get(postId);

        if (!post) {
            socket.emit('error-message', { message: 'Post not found' });
            return;
        }

        // Check ownership or developer privileges
        if (post.author !== user.username && !user.isDeveloper) {
            socket.emit('error-message', { message: 'You can only delete your own posts' });
            return;
        }

        // Delete post and related data
        postsStorage.delete(postId);
        postComments.delete(postId);
        postReactions.delete(postId);

        // Broadcast deletion
        io.emit('post-deleted', { postId: postId });

        console.log(`🗑️ Post deleted by ${user.username}: ${postId}`);

    } catch (error) {
        console.error('Error in delete-post:', error);
    }
});

// ===== Post Comment =====
socket.on('post-comment', (commentData) => {
    try {
        const user = onlineUsers.get(socket.id);
        if (!user) return;

        // Validate comment
        if (!commentData.content || commentData.content.trim().length === 0) {
            socket.emit('error-message', { message: 'Comment cannot be empty' });
            return;
        }

        if (commentData.content.length > 300) {
            socket.emit('error-message', { message: 'Comment too long (max 300 characters)' });
            return;
        }

        const post = postsStorage.get(commentData.postId);
        if (!post) {
            socket.emit('error-message', { message: 'Post not found' });
            return;
        }

        // Create comment object
        const comment = {
            id: commentData.id,
            postId: commentData.postId,
            content: commentData.content.trim(),
            author: user.username,
            authorColor: user.color,
            isDeveloper: user.isDeveloper,
            timestamp: new Date()
        };

        // Store comment
        if (!postComments.has(commentData.postId)) {
            postComments.set(commentData.postId, []);
        }
        postComments.get(commentData.postId).push(comment);

        // Broadcast comment
        io.emit('post-comment', comment);

        // Notify post author if different user
        if (post.author !== user.username) {
            const authorSocket = [...onlineUsers.entries()].find(([id, u]) => u.username === post.author);
            if (authorSocket) {
                io.to(authorSocket[0]).emit('comment-notification', {
                    commenterName: user.username,
                    postId: commentData.postId,
                    message: `${user.username} commented on your post`
                });
            }
        }

        console.log(`💬 New comment by ${user.username} on post ${commentData.postId}`);

    } catch (error) {
        console.error('Error in post-comment:', error);
    }
});

// ===== Post Reaction =====
socket.on('post-reaction', (data) => {
    try {
        const user = onlineUsers.get(socket.id);
        if (!user) return;

        const { postId, emoji } = data;
        const post = postsStorage.get(postId);
        
        if (!post) return;

        // Get current reactions for this post
        let reactions = postReactions.get(postId) || {};
        let userReactions = reactions[user.username] || [];

        // Toggle reaction
        if (userReactions.includes(emoji)) {
            // Remove reaction
            reactions[emoji] = Math.max(0, (reactions[emoji] || 0) - 1);
            userReactions = userReactions.filter(r => r !== emoji);
        } else {
            // Add reaction
            reactions[emoji] = (reactions[emoji] || 0) + 1;
            userReactions.push(emoji);
        }

        reactions[user.username] = userReactions;
        postReactions.set(postId, reactions);

        // Broadcast reaction update
        io.emit('post-reaction', {
            postId: postId,
            emoji: emoji,
            count: reactions[emoji],
            username: user.username
        });

        console.log(`👍 Reaction ${emoji} by ${user.username} on post ${postId}`);

    } catch (error) {
        console.error('Error in post-reaction:', error);
    }
});

// ===== Post Impression =====
socket.on('post-impression', (data) => {
    try {
        const { postId } = data;
        const post = postsStorage.get(postId);
        
        if (post) {
            post.impressions = (post.impressions || 0) + 1;
            
            // Optionally broadcast impression update
            io.emit('post-impression-update', {
                postId: postId,
                impressions: post.impressions
            });
        }
    } catch (error) {
        console.error('Error in post-impression:', error);
    }
});

// ===== Get All Posts =====
socket.on('get-posts', () => {
    try {
        const posts = Array.from(postsStorage.values())
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        socket.emit('posts-list', posts);
    } catch (error) {
        console.error('Error in get-posts:', error);
    }
});

// ===== Get Post Comments =====
socket.on('get-post-comments', (data) => {
    try {
        const { postId } = data;
        const comments = postComments.get(postId) || [];
        
        socket.emit('post-comments', {
            postId: postId,
            comments: comments
        });
    } catch (error) {
        console.error('Error in get-post-comments:', error);
    }
});

    // ===== Disconnect =====
    socket.on('disconnect', () => {
        try {
            const user = onlineUsers.get(socket.id);
            if (user) {
                // Broadcast exit popup
                socket.broadcast.emit('user-notification', {
                    message: `${user.username} exited the chatz`,
                    type: 'exit',
                    username: user.username,
                    color: user.color,
                    timestamp: new Date()
                });
            }

            onlineUsers.delete(socket.id);

            // Update counts
            io.emit('update-online-count', onlineUsers.size);
            io.emit('online-users-list', Array.from(onlineUsers.values()));

            console.log(`User disconnected: ${socket.id}`);
        } catch (err) {
            console.error('Error in disconnect:', err);
        }
    });

    // ===== Connection errors =====
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