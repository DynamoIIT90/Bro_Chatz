// Socket.IO Connection
const socket = io();

// DOM Elements
const welcomeScreen = document.getElementById('welcomeScreen');
const chatScreen = document.getElementById('chatScreen');
const usernameInput = document.getElementById('usernameInput');
const startChatBtn = document.getElementById('startChatBtn');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const onlineCount = document.getElementById('onlineCount');
const typingIndicators = document.getElementById('typingIndicators');
const reactionPicker = document.getElementById('reactionPicker');
const replyPreview = document.getElementById('replyPreview');
const notificationContainer = document.getElementById('notificationContainer');
const aiModal = document.getElementById('aiModal');
const aiMessages = document.getElementById('aiMessages');
const aiCloseBtn = document.getElementById('aiCloseBtn');
const loadingScreen = document.getElementById('loadingScreen');

// Global Variables
let currentUser = null;
let userColor = '#ffffff';
let typingTimer = null;
let isTyping = false;
let selectedMessage = null;
let replyingTo = null;
let isDeveloper = false;
let onlineUsers = new Map();
let phonkAudio = new Audio();
phonkAudio.loop = false;





// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    createParticleField();
    initializeEventListeners();
    
    // Auto-resize textarea
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
});

// Create Particle Field Effect
function createParticleField() {
    const particleField = document.querySelector('.particle-field');
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'absolute';
        particle.style.width = Math.random() * 3 + 1 + 'px';
        particle.style.height = particle.style.width;
        particle.style.background = `hsl(${Math.random() * 360}, 70%, 60%)`;
        particle.style.borderRadius = '50%';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.opacity = Math.random() * 0.5 + 0.2;
        particle.style.animation = `floatParticle ${Math.random() * 20 + 10}s linear infinite`;
        particle.style.animationDelay = Math.random() * 20 + 's';
        particleField.appendChild(particle);
    }
}

// Add particle float animation dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes floatParticle {
        0% { transform: translate(0, 0) rotate(0deg); }
        25% { transform: translate(${Math.random() * 100 - 50}px, ${Math.random() * 100 - 50}px) rotate(90deg); }
        50% { transform: translate(${Math.random() * 100 - 50}px, ${Math.random() * 100 - 50}px) rotate(180deg); }
        75% { transform: translate(${Math.random() * 100 - 50}px, ${Math.random() * 100 - 50}px) rotate(270deg); }
        100% { transform: translate(0, 0) rotate(360deg); }
    }
`;
document.head.appendChild(style);

// Initialize Event Listeners
function initializeEventListeners() {
    // Welcome Screen Events
    usernameInput.addEventListener('input', function() {
        const value = this.value.trim();
        startChatBtn.disabled = value.length < 2;
        
        if (value.length >= 2) {
            startChatBtn.classList.add('ready');
        } else {
            startChatBtn.classList.remove('ready');
        }
    });
// Elite Mode Events
    const developerUsername = document.getElementById('developerUsername');
    const developerPassword = document.getElementById('developerPassword');
    const eliteLoginBtn = document.getElementById('eliteLoginBtn');

    function checkEliteCredentials() {
        const username = developerUsername.value.trim();
        const password = developerPassword.value.trim();
        
        eliteLoginBtn.disabled = !(username && password);
    }

    developerUsername.addEventListener('input', checkEliteCredentials);
    developerPassword.addEventListener('input', checkEliteCredentials);

    eliteLoginBtn.addEventListener('click', function() {
    const username = developerUsername.value.trim();
    const password = developerPassword.value.trim();
    
    if (username.toLowerCase() === 'developer' && password === 'vivekisgod8085') {
        isDeveloper = true;
        currentUser = 'DEVELOPER';
        startChat();

        // Play Phonk track once per session
        if (!sessionStorage.getItem('phonkPlayed')) {
            phonkAudio.src = 'phonk.mp3'; // <-- replace with actual path
            phonkAudio.play().catch(err => console.log('Audio play blocked:', err));
            
            phonkAudio.onended = () => {
                phonkAudio.src = ''; // unload track
            };
            
            sessionStorage.setItem('phonkPlayed', 'true'); // mark as played
        }
    } else {
        alert('Invalid developer credentials!');
    }
});

eliteLoginBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
  developerPassword.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !eliteLoginBtn.disabled) {
        eliteLoginBtn.click();
    }
});

    // Developer Panel Events
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const developerPanel = document.getElementById('developerPanel');
    const panelCloseBtn = document.getElementById('panelCloseBtn');
    const warnModal = document.getElementById('warnModal');
    const warnCloseBtn = document.getElementById('warnCloseBtn');
    const sendWarnBtn = document.getElementById('sendWarnBtn');
    const cancelWarnBtn = document.getElementById('cancelWarnBtn');

    hamburgerBtn.addEventListener('click', function() {
        this.classList.toggle('active');
        developerPanel.classList.toggle('open');
        requestOnlineUsers();
    });

    panelCloseBtn.addEventListener('click', function() {
        hamburgerBtn.classList.remove('active');
        developerPanel.classList.remove('open');
    });

    // Warn Modal Events
    warnCloseBtn.addEventListener('click', closeWarnModal);
    cancelWarnBtn.addEventListener('click', closeWarnModal);

    sendWarnBtn.addEventListener('click', function() {
        const reason = document.getElementById('warnReason').value.trim();
        const userName = document.getElementById('warnUserName').textContent;
        
        if (reason) {
            socket.emit('warn-user', { username: userName, reason: reason });
            closeWarnModal();
        } else {
            alert('Please enter a warning reason!');
        }
    
    });

    usernameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !startChatBtn.disabled) {
            startChat();
        }
    });

    startChatBtn.addEventListener('click', startChat);

    // Chat Screen Events
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    messageInput.addEventListener('input', function() {
        if (!isTyping && this.value.trim()) {
            isTyping = true;
            socket.emit('typing-start');
        }
        
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
            if (isTyping) {
                isTyping = false;
                socket.emit('typing-stop');
            }
        }, 4000);
    });

    sendBtn.addEventListener('click', sendMessage);

    // AI Modal Events
    aiCloseBtn.addEventListener('click', closeAIModal);

    // Click outside to close modals
    document.addEventListener('click', function(e) {
        if (!reactionPicker.contains(e.target) && !e.target.closest('.message-bubble')) {
            hideReactionPicker();
        }
        
        if (e.target === aiModal) {
            closeAIModal();
        }
    });

    // Long press for mobile
    let longPressTimer;
    chatMessages.addEventListener('touchstart', function(e) {
        const messageBubble = e.target.closest('.message-bubble');
        if (messageBubble) {
            longPressTimer = setTimeout(() => {
                showReactionPicker(e, messageBubble);
            }, 500);
        }
    });

    chatMessages.addEventListener('touchend', function() {
        clearTimeout(longPressTimer);
    });

    // Context menu for desktop
    chatMessages.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        const messageBubble = e.target.closest('.message-bubble');
        if (messageBubble) {
            showReactionPicker(e, messageBubble);
        }
    });

    // Reaction picker events
    document.querySelectorAll('.reaction-emoji').forEach(emoji => {
        emoji.addEventListener('click', function() {
            if (selectedMessage) {
                const emojiValue = this.dataset.emoji;
                addReactionAnimation(this);
                socket.emit('message-reaction', {
                    messageId: selectedMessage.dataset.messageId,
                    emoji: emojiValue
                });
                hideReactionPicker();
            }
        });
    });

    document.getElementById('replyBtn').addEventListener('click', function() {
        if (selectedMessage) {
            startReply(selectedMessage);
            hideReactionPicker();
        }
    });
}
// Start Chat Function
function startChat() {
    let username;

    if (isDeveloper) {
        username = "DEVELOPER";  // force dev username
    } else {
        username = usernameInput.value.trim();
        if (username.length < 2) return;
    }

    currentUser = username;
    // Developer Phonk — play once per browser session
if (currentUser === "DEVELOPER" && !sessionStorage.getItem('phonkPlayed')) {
    const phonkAudio = new Audio('phonk.mp3'); // file path relative to public folder
    phonkAudio.volume = 0.5; // optional volume
    phonkAudio.play().catch(() => {
        console.log('Autoplay blocked, will play after user interaction');
    });
    phonkAudio.addEventListener('ended', () => {
        console.log('Phonk finished playing');
    });
    sessionStorage.setItem('phonkPlayed', 'true');
}

    // Show loading screen
    showLoadingScreen();
    
    // Add button click animation
    startChatBtn.classList.add('clicked');
    
    setTimeout(() => {
        // Connect to socket
        socket.emit('user-joined', { username: username, isDeveloper: isDeveloper });

// Show developer controls if developer
if (isDeveloper) {
    document.getElementById('developerControls').style.display = 'block';
}
        
        // Transition to chat screen
        setTimeout(() => {
            welcomeScreen.classList.remove('active');
            chatScreen.classList.add('active');
            hideLoadingScreen();
            messageInput.focus();
        }, 1000);
    }, 500);
}

// Send Message Function
function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;

    // Check if it's an AI command
    if (message.startsWith('/ai ')) {
        openAIModal();
        const aiPrompt = message.substring(4);
        addAIMessage(aiPrompt, 'user');
        showAITyping();
    }

    // Send message data
    const messageData = {
        message: message,
        replyTo: replyingTo
    };

    socket.emit('chat-message', messageData);

    // Add send animation
    sendBtn.classList.add('sending');
    setTimeout(() => {
        sendBtn.classList.remove('sending');
    }, 600);

    // Clear input and reply
    messageInput.value = '';
    messageInput.style.height = 'auto';
    clearReply();

    // Stop typing indicator
    if (isTyping) {
        isTyping = false;
        socket.emit('typing-stop');
    }
}

// Socket Event Listeners
socket.on('user-color-assigned', function(data) {
    userColor = data.color;
});

socket.on('admin-message', function(data) {
    addAdminMessage(data.message);
});

socket.on('chat-message', function(data) {
    addMessage(data);
    playMessageSound();
});

socket.on('user-notification', function(data) {
    showUserNotification(data);
});

socket.on('update-online-count', function(count) {
    updateOnlineCount(count);
});

socket.on('user-typing', function(data) {
    if (data.isTyping) {
        showTypingIndicator(data);
    } else {
        hideTypingIndicator(data.username);
    }
});

socket.on('message-reaction', function(data) {
    addMessageReaction(data);
    if (data.username !== currentUser) {
        showReactionNotification(data);
    }
});

socket.on('ai-response', function(data) {
    hideAITyping();
    addAIMessage(data.response, 'bot');
});

socket.on('ai-typing', function(isTyping) {
    if (isTyping) {
        showAITyping();
    } else {
        hideAITyping();
    }
});
socket.on('online-users-list', function(users) {
    displayOnlineUsers(users);
});

socket.on('user-kicked', function(data) {
    if (data.username === currentUser && !isDeveloper) {
        alert('You have been kicked out by the developer!');
        location.reload();
    }
});

socket.on('user-warned', function(data) {
    if (data.username === currentUser) {
        alert(`⚠️ WARNING: You are being warned for: ${data.reason}`);
    }
});

socket.on('kick-notification', function(data) {
    addAdminMessage(`🚫 ${data.username} was kicked out by DEVELOPER`);
});

// Message Functions
function addMessage(data) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    messageDiv.dataset.messageId = data.messageId;

    const isOwnMessage = data.username === currentUser;
    
    let replyHtml = '';
    if (data.replyTo) {
        replyHtml = `
            <div class="reply-preview" style="border-left-color: ${data.replyTo.color}">
                <strong>${data.replyTo.username}:</strong> ${data.replyTo.message.substring(0, 50)}${data.replyTo.message.length > 50 ? '...' : ''}
            </div>
        `;
    }

    messageDiv.innerHTML = `
        <div class="message-bubble" style="border-left: 3px solid ${data.color}">
            ${replyHtml}
            <div class="message-header">
                <span class="username" style="color: ${data.color}">
    ${data.username}
    ${data.isDeveloper ? '<i class="fas fa-check-circle developer-badge" title="Verified Developer"></i>' : ''}
</span>
                <span class="timestamp">${formatTime(data.timestamp)}</span>
            </div>
            <div class="message-content">${escapeHtml(data.message)}</div>
            <div class="message-reactions"></div>
        </div>
    `;

    chatMessages.appendChild(messageDiv);
    scrollToBottom();
    
    // Add entrance animation
    setTimeout(() => {
        messageDiv.style.transform = 'translateY(0)';
        messageDiv.style.opacity = '1';
    }, 50);
}

function addAdminMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message admin-message';
    
    messageDiv.innerHTML = `
        <div class="message-bubble">
            <div class="message-content">
                <i class="fas fa-robot"></i> ${message}
            </div>
        </div>
    `;

    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

function addAIMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-chat-message ai-${type}-message`;
    
    const avatar = type === 'user' ? '👤' : '🤖';
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <span>${avatar} ${type === 'user' ? 'You' : 'AI Assistant'}</span>
        </div>
        <div class="message-content">${escapeHtml(message)}</div>
    `;

    aiMessages.appendChild(messageDiv);
    aiMessages.scrollTop = aiMessages.scrollHeight;
}

// Typing Indicators
function showTypingIndicator(data) {
    // Remove existing indicator for this user
    hideTypingIndicator(data.username);
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.dataset.username = data.username;
    
    typingDiv.innerHTML = `
        <span style="color: ${data.color}">${data.username}</span> is typing
        <div class="typing-dots">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;
    
    typingIndicators.appendChild(typingDiv);
    scrollToBottom();
}

function hideTypingIndicator(username) {
    const existingIndicator = typingIndicators.querySelector(`[data-username="${username}"]`);
    if (existingIndicator) {
        existingIndicator.style.animation = 'typingSlideOut 0.3s ease-in forwards';
        setTimeout(() => {
            existingIndicator.remove();
        }, 300);
    }
}

// AI Modal Functions
function openAIModal() {
    aiModal.style.display = 'flex';
    aiMessages.innerHTML = '';
    addAIMessage("Hello! I'm your AI assistant. How can I help you today?", 'bot');
}

function closeAIModal() {
    aiModal.style.display = 'none';
}

function showAITyping() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'ai-chat-message ai-bot-message ai-typing';
    typingDiv.innerHTML = `
        <div class="message-header">
            <span>🤖 AI Assistant</span>
        </div>
        <div class="typing-dots">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;
    aiMessages.appendChild(typingDiv);
    aiMessages.scrollTop = aiMessages.scrollHeight;
}

function hideAITyping() {
    const typingMessage = aiMessages.querySelector('.ai-typing');
    if (typingMessage) {
        typingMessage.remove();
    }
}

// Reaction System
function showReactionPicker(event, messageBubble) {
    selectedMessage = messageBubble.closest('.message');
    
    const rect = messageBubble.getBoundingClientRect();
    reactionPicker.style.display = 'block';
    reactionPicker.style.left = Math.min(rect.left, window.innerWidth - 200) + 'px';
    reactionPicker.style.top = (rect.top - reactionPicker.offsetHeight - 10) + 'px';
    
    // Add show animation
    reactionPicker.style.animation = 'pickerSlideIn 0.3s ease-out';
}

function hideReactionPicker() {
    reactionPicker.style.display = 'none';
    selectedMessage = null;
}

function addReactionAnimation(emojiElement) {
    // Create floating emoji animation
    const floatingEmoji = document.createElement('div');
    floatingEmoji.textContent = emojiElement.textContent;
    floatingEmoji.style.position = 'fixed';
    floatingEmoji.style.left = emojiElement.getBoundingClientRect().left + 'px';
    floatingEmoji.style.top = emojiElement.getBoundingClientRect().top + 'px';
    floatingEmoji.style.fontSize = '2rem';
    floatingEmoji.style.pointerEvents = 'none';
    floatingEmoji.style.zIndex = '9999';
    floatingEmoji.style.animation = 'reactionFloat 1s ease-out forwards';
    
    document.body.appendChild(floatingEmoji);
    
    setTimeout(() => {
        floatingEmoji.remove();
    }, 1000);
}

// Add reaction float animation
const reactionStyle = document.createElement('style');
reactionStyle.textContent = `
    @keyframes reactionFloat {
        0% { transform: scale(1) translateY(0); opacity: 1; }
        50% { transform: scale(1.5) translateY(-30px); opacity: 0.8; }
        100% { transform: scale(0.5) translateY(-60px); opacity: 0; }
    }
    
    @keyframes typingSlideOut {
        0% { opacity: 1; transform: translateX(0); }
        100% { opacity: 0; transform: translateX(-20px); }
    }
`;
document.head.appendChild(reactionStyle);

function addMessageReaction(data) {
    const message = document.querySelector(`[data-message-id="${data.messageId}"]`);
    if (message) {
        const reactionsContainer = message.querySelector('.message-reactions');
        
        // Check if reaction already exists
        let existingReaction = reactionsContainer.querySelector(`[data-emoji="${data.emoji}"]`);
        
        if (existingReaction) {
            const count = existingReaction.querySelector('.reaction-count');
            count.textContent = parseInt(count.textContent) + 1;
            existingReaction.style.animation = 'reactionBounce 0.3s ease-out';
        } else {
            const reactionElement = document.createElement('span');
            reactionElement.className = 'message-reaction';
            reactionElement.dataset.emoji = data.emoji;
            reactionElement.innerHTML = `
                ${data.emoji} <span class="reaction-count">1</span>
            `;
            reactionElement.style.animation = 'reactionSlideIn 0.3s ease-out';
            reactionsContainer.appendChild(reactionElement);
        }
    }
}

// Reply System
function startReply(messageElement) {
    const username = messageElement.querySelector('.username').textContent;
    const messageContent = messageElement.querySelector('.message-content').textContent;
    const userColor = messageElement.querySelector('.username').style.color;
    
    replyingTo = {
        username: username,
        message: messageContent,
        color: userColor
    };
    
    replyPreview.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
                <strong style="color: ${userColor}">Replying to ${username}:</strong>
                <div style="color: rgba(255,255,255,0.7); font-size: 0.9rem; margin-top: 2px;">
                    ${messageContent.substring(0, 50)}${messageContent.length > 50 ? '...' : ''}
                </div>
            </div>
            <button onclick="clearReply()" style="background: none; border: none; color: rgba(255,255,255,0.5); cursor: pointer; font-size: 1.2rem;">×</button>
        </div>
    `;
    replyPreview.style.display = 'block';
    messageInput.focus();
}

function clearReply() {
    replyingTo = null;
    replyPreview.style.display = 'none';
}

// Notification System
function showUserNotification(data) {
    const notification = document.createElement('div');
    notification.className = `notification ${data.type}`;
    
    const icon = data.type === 'join' ? '🎉' : '👋';
    
    notification.innerHTML = `
        <div class="notification-content">
            ${icon} <strong style="color: ${data.color}">${data.username}</strong> ${data.message}
        </div>
    `;
    
    notificationContainer.appendChild(notification);
    
    // Auto remove after animation
    setTimeout(() => {
        notification.classList.add('notification-burst');
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 3000);
}

function showReactionNotification(data) {
    const notification = document.createElement('div');
    notification.className = 'notification reaction';
    
    notification.innerHTML = `
        <div class="notification-content">
            ${data.emoji} <strong style="color: ${data.color}">${data.username}</strong> reacted to your message
        </div>
    `;
    
    notificationContainer.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('notification-burst');
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 2000);
}

// Utility Functions
function updateOnlineCount(count) {
    onlineCount.textContent = count;
    
    // Add pulse animation
    onlineCount.style.animation = 'none';
    setTimeout(() => {
        onlineCount.style.animation = 'countPulse 0.5s ease-out';
    }, 10);
}

// Add count pulse animation
const countStyle = document.createElement('style');
countStyle.textContent = `
    @keyframes countPulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
    }
    
    @keyframes reactionBounce {
        0% { transform: scale(1); }
        50% { transform: scale(1.3); }
        100% { transform: scale(1); }
    }
    
    @keyframes reactionSlideIn {
        0% { opacity: 0; transform: scale(0.5); }
        100% { opacity: 1; transform: scale(1); }
    }
    
    .message-reaction {
        display: inline-block;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 15px;
        padding: 4px 8px;
        margin: 5px 5px 0 0;
        font-size: 0.8rem;
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    .message-reaction:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: scale(1.1);
    }
    
    .reaction-count {
        font-weight: 600;
        margin-left: 3px;
    }
`;
document.head.appendChild(countStyle);

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function playMessageSound() {
    // Create a subtle notification sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
}

function showLoadingScreen() {
    loadingScreen.style.display = 'flex';
}

function hideLoadingScreen() {
    loadingScreen.style.display = 'none';
}

// Initialize particle effects on scroll
chatMessages.addEventListener('scroll', function() {
    if (Math.random() > 0.95) { // 5% chance on scroll
        createScrollParticle();
    }
});

function createScrollParticle() {
    const particle = document.createElement('div');
    particle.style.position = 'absolute';
    particle.style.width = '4px';
    particle.style.height = '4px';
    particle.style.background = `hsl(${Math.random() * 360}, 70%, 60%)`;
    particle.style.borderRadius = '50%';
    particle.style.right = '10px';
    particle.style.top = Math.random() * chatMessages.offsetHeight + 'px';
    particle.style.pointerEvents = 'none';
    particle.style.animation = 'particleFade 2s ease-out forwards';
    
    chatMessages.appendChild(particle);
    
    setTimeout(() => {
        particle.remove();
    }, 2000);
}

// Add final particle animation
const particleStyle = document.createElement('style');
particleStyle.textContent = `
    @keyframes particleFade {
        0% { opacity: 1; transform: translateX(0); }
        100% { opacity: 0; transform: translateX(-50px); }
    }
`;
document.head.appendChild(particleStyle);

// Add some final polish effects
document.addEventListener('mousemove', function(e) {
    if (Math.random() > 0.99) { // Very rare cursor trail
        createCursorTrail(e.clientX, e.clientY);
    }
});

function createCursorTrail(x, y) {
    const trail = document.createElement('div');
    trail.style.position = 'fixed';
    trail.style.left = x + 'px';
    trail.style.top = y + 'px';
    trail.style.width = '3px';
    trail.style.height = '3px';
    trail.style.background = `hsl(${Math.random() * 360}, 70%, 60%)`;
    trail.style.borderRadius = '50%';
    trail.style.pointerEvents = 'none';
    trail.style.zIndex = '999';
    trail.style.animation = 'trailFade 1s ease-out forwards';
    
    document.body.appendChild(trail);
    
    setTimeout(() => {
        trail.remove();
    }, 1000);
}

// Add trail animation
const trailStyle = document.createElement('style');
trailStyle.textContent = `
    @keyframes trailFade {
        0% { opacity: 0.8; transform: scale(1); }
        100% { opacity: 0; transform: scale(0); }
    }
`;
document.head.appendChild(trailStyle);

// Developer Functions
function requestOnlineUsers() {
    if (isDeveloper) {
        socket.emit('get-online-users');
    }
}

function displayOnlineUsers(users) {
    const usersList = document.getElementById('onlineUsersList');
    usersList.innerHTML = '';
    
    users.forEach(user => {
        if (user.username !== 'DEVELOPER') { // Don't show developer in the list
            const userDiv = document.createElement('div');
            userDiv.className = 'user-item';
            userDiv.innerHTML = `
                <div class="user-info">
                    <div class="user-name" style="color: ${user.color}">${user.username}</div>
                    <div class="user-ip">IP: ${user.ip}</div>
                </div>
                <div class="user-actions">
                    <button class="user-action-btn kick-btn" onclick="kickUser('${user.username}')">Kick</button>
                    <button class="user-action-btn warn-btn" onclick="openWarnModal('${user.username}')">Warn</button>
                </div>
            `;
            usersList.appendChild(userDiv);
        }
    });
}

function kickUser(username) {
    if (confirm(`Are you sure you want to kick ${username}?`)) {
        socket.emit('kick-user', { username: username });
    }
}

function openWarnModal(username) {
    document.getElementById('warnUserName').textContent = username;
    document.getElementById('warnReason').value = '';
    warnModal.style.display = 'flex';
}

function closeWarnModal() {
    warnModal.style.display = 'none';
}

// Check for restricted usernames
function isRestrictedUsername(username) {
    const restricted = ['developer', 'DEVELOPER', 'Developer', 'DEVEL0PER', 'devel0per'];
    return restricted.includes(username);
}