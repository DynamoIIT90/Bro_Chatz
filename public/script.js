// script.js
// This file handles all client-side logic for the Bro_Chatz application.
// The Gemini API key is now securely handled on the server-side.
// Added reply functionality and theme toggling.

// Establish a Socket.IO connection to the server.
const socket = io();

// --- Get DOM Elements ---
const welcomeScreen = document.getElementById('welcome-screen');
const chatScreen = document.getElementById('chat-screen');
const usernameInput = document.getElementById('username-input');
const startChatBtn = document.getElementById('start-chat-btn');
const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const onlineUsersCount = document.getElementById('online-users-count');
const typingIndicator = document.getElementById('typing-indicator');
const userStatusNotifications = document.getElementById('user-status-notifications');
const actionPopup = document.getElementById('action-popup'); // Renamed from emojiReactionPopup
const emojiOptionsContainer = actionPopup.querySelector('.emoji-options');
const replyButton = document.getElementById('reply-button'); // New reply button
const themeToggleBtn = document.getElementById('theme-toggle-btn'); // NEW: Theme toggle button

// --- Global Variables ---
let username = '';
let userColor = ''; // To store the color assigned by the server
let typingTimeout; // To manage the typing indicator delay
const TYPING_DELAY = 2000; // 2 seconds delay for typing indicator to disappear
let currentMessageForAction = null; // Stores the message element being acted upon (reaction or reply)
let messageIdCounter = 0; // Simple counter for unique message IDs
let isAILoading = false; // Flag to prevent multiple AI requests
let replyingToMessage = null; // Stores data of the message being replied to {id, username, text}
let isTyping = false; // Flag to track typing state for the local user

// Available emojis for reactions
const emojis = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

// --- Utility Functions ---

// Function to generate a unique ID for messages (client-side)
function generateMessageId() {
    return `msg-${Date.now()}-${messageIdCounter++}`;
}

// Function to darken or lighten a color (for username text)
function adjustColor(color, percent) {
    // Expects color in 'rgb(r, g, b)' format
    const parts = color.match(/\d+/g).map(Number);
    const r = parts[0];
    const g = parts[1];
    const b = parts[2];

    const newR = Math.min(255, Math.max(0, r + (r * percent / 100)));
    const newG = Math.min(255, Math.max(0, g + (g * percent / 100)));
    const newB = Math.min(255, Math.max(0, b + (b * percent / 100)));

    return `rgb(${Math.round(newR)}, ${Math.round(newG)}, ${Math.round(newB)})`;
}

// Function to display user status notifications (join/exit, and now replies)
function displayUserStatus(msg) {
    const notificationDiv = document.createElement('div');
    notificationDiv.classList.add('user-status-message');
    notificationDiv.textContent = msg;
    userStatusNotifications.appendChild(notificationDiv);

    notificationDiv.addEventListener('animationend', () => {
        notificationDiv.remove();
    });
}

// Function to add a new message to the chat display
function addMessage(data, isSelf = false) {
    const messageId = data.id || generateMessageId(); // Use provided ID or generate new
    const messageBubble = document.createElement('div');
    messageBubble.classList.add('message-bubble');
    // Add a class for the initial animation
    messageBubble.classList.add('user-message');
    messageBubble.dataset.messageId = messageId; // Store message ID for reactions

    // Defensive check for data.color
    const messageColor = data.color || 'rgb(128, 128, 128)'; // Default to grey if color is undefined

    // Set background and border color based on user's assigned color (Default theme values)
    let bubbleBgColor = messageColor.replace('rgb', 'rgba').replace(')', ', 0.1)'); // 10% opacity for default
    let bubbleBorderColor = messageColor.replace('rgb', 'rgba').replace(')', ', 0.3)'); // 30% opacity for default

    // Override for dark theme if active
    if (document.body.classList.contains('dark-theme')) {
        bubbleBgColor = messageColor.replace('rgb', 'rgba').replace(')', ', 0.2)'); // 20% opacity for dark theme
        bubbleBorderColor = messageColor.replace('rgb', 'rgba').replace(')', ', 0.5)'); // 50% opacity for dark theme
    }

    messageBubble.style.backgroundColor = bubbleBgColor;
    messageBubble.style.border = `1px solid ${bubbleBorderColor}`;

    // Admin messages have a distinct style
    if (data.username === 'Bro_Chatz Admin' || data.username === 'Bro_Chatz AI') {
        messageBubble.classList.add('admin'); // Reusing admin class for AI for consistent styling
        // Set specific color for AI messages
        if (data.username === 'Bro_Chatz AI') {
            // Default theme AI color
            messageBubble.style.backgroundColor = 'rgba(173, 216, 230, 0.1)'; // Light blue for AI, lower opacity
            messageBubble.style.borderColor = 'rgba(173, 216, 230, 0.3)';

            // Dark theme AI color override
            if (document.body.classList.contains('dark-theme')) {
                messageBubble.style.backgroundColor = 'rgba(173, 216, 230, 0.2)'; // Light blue for AI, higher opacity for dark theme
                messageBubble.style.borderColor = 'rgba(173, 216, 230, 0.5)';
            }
        }
    }

    // --- Add reply snippet if message is a reply ---
    if (data.replyTo) {
        const replySnippet = document.createElement('div');
        replySnippet.classList.add('reply-snippet');
        replySnippet.dataset.replyToId = data.replyTo.id; // Store ID of original message

        const replyUsername = document.createElement('span');
        replyUsername.classList.add('reply-username');
        replyUsername.textContent = `${data.replyTo.username}: `;

        const replyText = document.createElement('span');
        // Truncate long messages for snippet
        const snippetText = data.replyTo.text.length > 50 ?
                                data.replyTo.text.substring(0, 47) + '...' :
                                data.replyTo.text;
        replyText.textContent = `"${snippetText}"`;

        replySnippet.appendChild(replyUsername);
        replySnippet.appendChild(replyText);
        messageBubble.appendChild(replySnippet);

        // Add click listener to scroll to original message
        replySnippet.addEventListener('click', () => {
            const originalMessage = document.querySelector(`[data-message-id="${data.replyTo.id}"]`);
            if (originalMessage) {
                originalMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
                originalMessage.classList.add('highlight'); // Add highlight animation
                setTimeout(() => {
                    originalMessage.classList.remove('highlight');
                }, 1500); // Remove highlight after animation
            }
        });
    }

    // Create username span
    const usernameSpan = document.createElement('span');
    usernameSpan.classList.add('username');
    usernameSpan.textContent = data.username;
    // Adjust username color for better contrast against the bubble
    // Darken for default theme, lighten for dark theme
    if (document.body.classList.contains('dark-theme')) {
        usernameSpan.style.color = adjustColor(messageColor, data.username === 'Bro_Chatz Admin' || data.username === 'Bro_Chatz AI' ? 0 : 50);
    } else {
        usernameSpan.style.color = adjustColor(messageColor, data.username === 'Bro_Chatz Admin' || data.username === 'Bro_Chatz AI' ? 0 : -50); // Darken for default
    }

    // Create message text span
    const messageTextSpan = document.createElement('span');
    messageTextSpan.classList.add('message-text');
    messageTextSpan.textContent = data.message;

    // Create reactions container
    const reactionsDiv = document.createElement('div');
    reactionsDiv.classList.add('message-reactions');
    reactionsDiv.dataset.messageId = messageId; // Link reactions to message ID

    messageBubble.appendChild(usernameSpan);
    messageBubble.appendChild(messageTextSpan);
    messageBubble.appendChild(reactionsDiv); // Add reactions container

    messagesContainer.appendChild(messageBubble);

    // Scroll to the bottom of the chat
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // --- Long Press / Click for Action Popup (Emoji + Reply) ---
    let pressTimer;
    const LONG_PRESS_THRESHOLD = 500; // ms

    messageBubble.addEventListener('mousedown', (e) => {
        if (data.username === 'Bro_Chatz Admin' || data.username === 'Bro_Chatz AI') return; // No actions on admin/AI messages
        pressTimer = setTimeout(() => {
            messageBubble.classList.add('long-press-active');
            showActionPopup(e, messageId);
        }, LONG_PRESS_THRESHOLD);
    });

    messageBubble.addEventListener('mouseup', () => {
        clearTimeout(pressTimer);
        messageBubble.classList.remove('long-press-active');
    });

    messageBubble.addEventListener('mouseleave', () => {
        clearTimeout(pressTimer);
        messageBubble.classList.remove('long-press-active');
    });

    // For touch devices
    messageBubble.addEventListener('touchstart', (e) => {
        if (data.username === 'Bro_Chatz Admin' || data.username === 'Bro_Chatz AI') return;
        e.preventDefault(); // Prevent default touch behavior (e.g., scrolling)
        pressTimer = setTimeout(() => {
            messageBubble.classList.add('long-press-active');
            showActionPopup(e, messageId);
        }, LONG_PRESS_THRESHOLD);
    });

    messageBubble.addEventListener('touchend', () => {
        clearTimeout(pressTimer);
        messageBubble.classList.remove('long-press-active');
    });

    messageBubble.addEventListener('touchcancel', () => {
        clearTimeout(pressTimer);
        messageBubble.classList.remove('long-press-active');
    });
}

// Function to show the action popup (emoji + reply)
function showActionPopup(event, messageId) {
    currentMessageForAction = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!currentMessageForAction) return;

    // Position the popup near the message or click/touch point
    let x, y;
    if (event.touches && event.touches.length > 0) {
        x = event.touches[0].clientX;
        y = event.touches[0].clientY;
    } else {
        x = event.clientX;
        y = event.clientY;
    }

    // Adjust position to keep popup within viewport
    const popupWidth = actionPopup.offsetWidth;
    const popupHeight = actionPopup.offsetHeight;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let finalX = x;
    let finalY = y;

    // Ensure popup doesn't go off right edge
    if (x + popupWidth > viewportWidth) {
        finalX = viewportWidth - popupWidth - 10; // 10px padding from right
    }
    // Ensure popup doesn't go off bottom edge
    if (y + popupHeight > viewportHeight) {
        finalY = viewportHeight - popupHeight - 10; // 10px padding from bottom
    }
    // Ensure popup doesn't go off left edge
    if (finalX < 10) {
        finalX = 10;
    }
    // Ensure popup doesn't go off top edge
    if (finalY < 10) {
        finalY = 10;
    }

    actionPopup.style.left = `${finalX}px`;
    actionPopup.style.top = `${finalY}px`;
    actionPopup.classList.add('active');
}

// Function to hide the action popup
function hideActionPopup() {
    actionPopup.classList.remove('active');
    currentMessageForAction = null;
}

// Function to add a reaction to a message
function addReactionToMessage(messageId, emoji, reactorName) {
    const targetMessage = document.querySelector(`.message-bubble[data-message-id="${messageId}"]`);
    if (!targetMessage) return;

    const reactionsDiv = targetMessage.querySelector('.message-reactions');
    if (!reactionsDiv) return;

    // Check if this emoji reaction from this user already exists
    const existingReaction = reactionsDiv.querySelector(`.reaction-item[data-emoji="${emoji}"][data-reactor="${reactorName}"]`);
    if (existingReaction) {
        // If it exists, for simplicity, we'll just return.
        return;
    }

    const reactionItem = document.createElement('span');
    reactionItem.classList.add('reaction-item');
    reactionItem.dataset.emoji = emoji; // Store emoji for lookup
    reactionItem.dataset.reactor = reactorName; // Store reactor name for lookup

    reactionItem.innerHTML = `${emoji} <small>${reactorName}</small>`; // Show emoji and reactor name
    reactionsDiv.appendChild(reactionItem);
}

// --- LLM Integration: Bro_Chatz AI Assistant (Now calls server endpoint) ---
async function askGemini(prompt) {
    if (isAILoading) {
        addMessage({
            username: 'Bro_Chatz Admin',
            message: 'Please wait, the AI is currently processing another request.',
            color: 'rgb(255, 255, 0)'
        });
        return;
    }

    isAILoading = true;
    messageInput.disabled = true;
    sendButton.disabled = true;
    sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; // Show spinner

    addMessage({
        username: 'Bro_Chatz AI',
        message: 'Thinking...',
        color: 'rgb(173, 216, 230)', // Light blue for AI
        id: 'ai-thinking-message' // Unique ID for the thinking message
    });
    messagesContainer.scrollTop = messagesContainer.scrollHeight; // Scroll to thinking message

    try {
        // Call your server's new /ask-ai endpoint
        const response = await fetch('/ask-ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt }) // Send the prompt to your server
        });

        const result = await response.json();

        // Remove the "Thinking..." message
        const thinkingMessage = document.getElementById('ai-thinking-message');
        if (thinkingMessage) {
            thinkingMessage.remove();
        }

        if (response.ok && result.response) { // Check for successful response from your server
            addMessage({
                username: 'Bro_Chatz AI',
                message: result.response, // Use the AI response from your server
                color: 'rgb(173, 216, 230)' // Light blue for AI
            });
        } else {
            addMessage({
                username: 'Bro_Chatz Admin',
                message: result.error || 'Bro_Chatz AI could not generate a response. Please try again.',
                color: 'rgb(255, 255, 0)'
            });
            console.error('AI response error from server:', result.error);
        }

    } catch (error) {
        // Remove the "Thinking..." message on error
        const thinkingMessage = document.getElementById('ai-thinking-message');
        if (thinkingMessage) {
            thinkingMessage.remove();
        }
        addMessage({
            username: 'Bro_Chatz Admin',
            message: 'Error connecting to Bro_Chatz AI service. Please check your connection or try again later.',
            color: 'rgb(255, 255, 0)'
        });
        console.error('Error calling AI endpoint on server:', error);
    } finally {
        isAILoading = false;
        messageInput.disabled = false;
        sendButton.disabled = false;
        sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>'; // Restore send icon
        messageInput.focus();
    }
}

// --- Theme Toggling Logic ---
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'rgb'); // Save preference
    // Update button icon (optional, using font-awesome for sun/moon)
    themeToggleBtn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

// --- Event Listeners ---

// Handle "Start Chat" button click
startChatBtn.addEventListener('click', () => {
    const enteredUsername = usernameInput.value.trim();
    if (enteredUsername) {
        username = enteredUsername;
        socket.emit('join chat', username); // Tell the server a user joined
        welcomeScreen.classList.remove('active');
        // Delay adding chat-screen.active to allow for smooth transition after welcome screen hides
        setTimeout(() => {
            chatScreen.classList.add('active');
            messageInput.focus(); // Focus on message input
        }, 500); // Match welcome screen transition duration
    } else {
        usernameInput.placeholder = 'Please enter a name!';
        usernameInput.classList.add('shake'); // Add a shake animation for feedback
        setTimeout(() => usernameInput.classList.remove('shake'), 500);
    }
});

// Allow pressing Enter in username input to start chat
usernameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        startChatBtn.click();
    }
});

// Handle sending messages
sendButton.addEventListener('click', () => {
    const message = messageInput.value.trim();
    if (message) {
        if (message.startsWith('/ask ')) {
            const prompt = message.substring(5).trim(); // Remove '/ask '
            if (prompt) {
                askGemini(prompt);
            } else {
                addMessage({
                    username: 'Bro_Chatz Admin',
                    message: 'Please provide a question after /ask (e.g., /ask What is the weather like?)',
                    color: 'rgb(255, 255, 0)'
                });
            }
        } else {
            // Send message with replyTo data if available
            socket.emit('chat message', {
                message: message,
                replyTo: replyingToMessage // Pass the replyTo object
            });

            // NEW: Emit notification if this message is a reply to someone else
            if (replyingToMessage && replyingToMessage.username !== username) {
                socket.emit('send_reply_notification', {
                    repliedToUsername: replyingToMessage.username,
                    replierUsername: username
                });
            }

            replyingToMessage = null; // Clear reply state after sending
        }
        messageInput.value = ''; // Clear input field
        clearTimeout(typingTimeout); // Clear any pending typing timeout
        socket.emit('stop typing'); // Immediately send stop typing
        typingIndicator.classList.remove('active'); // Hide indicator
        isTyping = false; // Reset typing flag after sending message
    }
});

// Allow pressing Enter in message input to send message
messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        sendButton.click();
    }
});

// Typing indicator logic
messageInput.addEventListener('input', () => {
    // If user wasn't typing before, emit 'typing' event to server
    if (!isTyping) {
        socket.emit('typing');
        isTyping = true; // Set flag to true
    }

    // Clear the existing 'stop typing' timeout and set a new one
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        socket.emit('stop typing');
        isTyping = false; // Reset flag after timeout
        typingIndicator.classList.remove('active'); // Hide indicator
    }, TYPING_DELAY);
});

// Hide action popup when clicking outside
document.addEventListener('click', (e) => {
    if (actionPopup.classList.contains('active') &&
        !actionPopup.contains(e.target) &&
        !e.target.closest('.message-bubble')) { // Don't hide if clicking on a message bubble
        hideActionPopup();
    }
});

// Populate emoji options in the action popup
emojis.forEach(emoji => {
    const emojiSpan = document.createElement('span');
    emojiSpan.classList.add('emoji-option');
    emojiSpan.textContent = emoji;
    emojiSpan.addEventListener('click', () => {
        if (currentMessageForAction) {
            const messageId = currentMessageForAction.dataset.messageId;
            socket.emit('react message', { messageId, emoji, reactorName: username });
            hideActionPopup();
        }
    });
    emojiOptionsContainer.appendChild(emojiSpan);
});

// Handle Reply button click
replyButton.addEventListener('click', () => {
    if (currentMessageForAction) {
        const messageId = currentMessageForAction.dataset.messageId;
        const originalUsername = currentMessageForAction.querySelector('.username').textContent;
        const originalText = currentMessageForAction.querySelector('.message-text').textContent;

        replyingToMessage = {
            id: messageId,
            username: originalUsername,
            text: originalText
        };

        messageInput.value = ''; // Ensure it's empty
        messageInput.focus();
        hideActionPopup();
    }
});

// NEW: Theme Toggle Button Listener
themeToggleBtn.addEventListener('click', toggleTheme);


// --- Socket.IO Event Handlers (Receiving from Server) ---

// Receive assigned color from server
socket.on('set color', (color) => {
    userColor = color;
    console.log('My assigned color is:', userColor);
});

// Receive chat messages from server
socket.on('chat message', (data) => {
    const isSelf = data.username === username;
    addMessage(data, isSelf);
});

// Update online users count
socket.on('update users', (count) => {
    onlineUsersCount.textContent = count;
});

// Handle user joined notification
socket.on('user joined', (joinedUsername) => {
    if (joinedUsername !== username) { // Don't show notification for self
        displayUserStatus(`${joinedUsername} entered the chatz`);
    }
});

// Handle user exited notification
socket.on('user exited', (exitedUsername) => {
    if (exitedUsername !== username) { // Don't show notification for self
        displayUserStatus(`${exitedUsername} exited the chatz`);
    }
});

// Handle typing indicator updates
socket.on('user typing', (typingUsernames) => {
    const filteredTyping = typingUsernames.filter(name => name !== username); // Exclude self
    if (filteredTyping.length > 0) {
        typingIndicator.classList.add('active');
        if (filteredTyping.length === 1) {
            typingIndicator.textContent = `${filteredTyping[0]} is typing...`;
        } else {
            const lastUser = filteredTyping.pop();
            const text = filteredTyping.length > 0
                ? `${filteredTyping.join(', ')} and ${lastUser} are typing...`
                : `${lastUser} are typing...`;
            typingIndicator.textContent = text;
        }
    } else {
        typingIndicator.classList.remove('active');
    }
});

// Handle message reactions
socket.on('message reacted', ({ messageId, emoji, reactorName }) => {
    addReactionToMessage(messageId, emoji, reactorName);
});

// Handle incoming reply notifications
socket.on('receive_reply_notification', ({ repliedToUsername, replierUsername }) => {
    if (repliedToUsername === username) { // Only show notification if this client is the one who was replied to
        displayUserStatus(`${replierUsername} replied to you!`);
    }
});


// --- Initial Setup ---
// Ensure the welcome screen is active on page load
document.addEventListener('DOMContentLoaded', () => {
    welcomeScreen.classList.add('active');
    usernameInput.focus();

    // Load theme preference from localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>'; // Set sun icon for dark theme
    } else {
        themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>'; // Set moon icon for RGB theme
    }

    // Add the theme toggle button to the header once chat screen is active
    // This is implicitly done if the button is already in index.html
    // but ensures the icon is correct from the start.
});