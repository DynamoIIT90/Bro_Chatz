// --- Global Flag for DOMContentLoaded (CRITICAL for preventing duplicate listeners) ---
let domContentLoadedFired = false;

// --- DOM Elements (Declared here, selected once DOM is fully loaded) ---
let welcomeScreen;
let chatScreen;
let usernameInput;
let startChatBtn;
let chatHeader;
let themeToggleBtn;
let onlineUsersCount;
let messagesContainer;
let messageInput;
let sendButton;
let typingIndicator;
let actionPopup;
let emojiOptionsContainer;
let replyButton;
let replySnippetContainer;
let replySnippetText;
let cancelReplyBtn;
let userStatusNotifications;

// --- Socket.IO Client Setup ---
const socket = io();

// --- Global Variables ---
let currentUsername = '';
let myAssignedColor = ''; // To store the color assigned by the server for 'me' messages
let typingTimer; // Used to manage the "typing..." indicator timeout
const TYPING_DELAY = 1000; // 1 second before 'stop_typing' is emitted
let longPressTimer; // Timer for detecting long presses on messages
const LONG_PRESS_THRESHOLD = 500; // 500 milliseconds for a long press
let lastTouchStartTime; // To help distinguish between a quick tap and a long press
let lastTouchTargetMessage = null; // Stores the message bubble element currently being long-pressed
let currentReplyMessageId = null; // Stores the ID of the message being replied to

// --- Event Listeners and Initial Setup (Ensures DOM is ready) ---
document.addEventListener('DOMContentLoaded', () => {
    // Prevent re-initialization if DOMContentLoaded fires multiple times
    if (domContentLoadedFired) {
        console.warn('DOMContentLoaded fired more than once, skipping re-initialization.');
        return;
    }
    domContentLoadedFired = true; // Set the flag to true after the first execution

    console.log('DOM fully loaded. Initializing...');

    // Select all DOM elements once the document's structure is fully loaded
    welcomeScreen = document.getElementById('welcome-screen');
    chatScreen = document.getElementById('chat-screen');
    usernameInput = document.getElementById('username-input');
    startChatBtn = document.getElementById('start-chat-btn');
    chatHeader = document.querySelector('.chat-header'); // This may not be directly used for header but generally exists
    themeToggleBtn = document.getElementById('theme-toggle-btn');
    onlineUsersCount = document.getElementById('online-users-count');
    messagesContainer = document.getElementById('messages');
    messageInput = document.getElementById('message-input');
    sendButton = document.getElementById('send-button');
    typingIndicator = document.getElementById('typing-indicator');
    actionPopup = document.getElementById('action-popup');
    emojiOptionsContainer = document.querySelector('.emoji-options');
    replyButton = document.getElementById('reply-button');
    replySnippetContainer = document.getElementById('reply-snippet-container');
    replySnippetText = document.getElementById('reply-snippet-text');
    cancelReplyBtn = document.getElementById('cancel-reply-btn');
    userStatusNotifications = document.getElementById('user-status-notifications');

    console.log('Elements selected.');

    // --- Initial UI Setup ---
    // Ensure welcome screen is active and chat screen is not
    if (welcomeScreen) {
        welcomeScreen.classList.add('active');
    }
    if (chatScreen) {
        chatScreen.classList.remove('active');
    }
    if (usernameInput) {
        usernameInput.focus();
    }

    // Load user's theme preference from browser's local storage
    loadThemePreference();

    // --- Core Event Listeners ---

    // Handle "Start Chat" button click
    if (startChatBtn) {
        startChatBtn.addEventListener('click', () => {
            const enteredUsername = usernameInput ? usernameInput.value.trim() : '';
            if (enteredUsername) {
                currentUsername = enteredUsername;
                socket.emit('set_username', currentUsername); // Send the chosen username to the server
            } else {
                if (usernameInput) {
                    usernameInput.placeholder = 'Please enter a name!';
                    usernameInput.classList.add('shake');
                    setTimeout(() => usernameInput.classList.remove('shake'), 500);
                }
            }
        });
    }

    // Allow starting chat by pressing Enter in the username input field
    if (usernameInput) {
        usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // Prevent newline in input
                if (startChatBtn) {
                    startChatBtn.click();
                }
            }
        });
    }

    // Toggle between light and dark themes
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // Send message when the send button is clicked
    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }

    // Send message when Enter key is pressed in the message input (unless Shift is held)
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { // Shift+Enter will allow a new line
                e.preventDefault();
                sendMessage();
            }
        });

        // --- Typing Indicator Logic ---
        messageInput.addEventListener('input', () => {
            if (messageInput.value.trim() !== '') {
                socket.emit('typing');
                clearTimeout(typingTimer);
                typingTimer = setTimeout(() => {
                    socket.emit('stop_typing');
                }, TYPING_DELAY);
            } else {
                clearTimeout(typingTimer);
                socket.emit('stop_typing');
            }
        });
    }

    // --- Reply Feature Event Listeners ---
    if (cancelReplyBtn) {
        cancelReplyBtn.addEventListener('click', cancelReply);
    }

    if (replyButton) {
        replyButton.addEventListener('click', () => {
            if (lastTouchTargetMessage) {
                const messageId = lastTouchTargetMessage.dataset.messageId;
                const usernameEl = lastTouchTargetMessage.querySelector('.username');
                const messageTextEl = lastTouchTargetMessage.querySelector('.message-text');

                const username = usernameEl ? usernameEl.textContent : 'Unknown';
                const text = messageTextEl ? messageTextEl.textContent : 'No content';

                activateReplyMode(messageId, username, text);
                hideActionPopup();
            }
        });
    }

    // --- Emoji Reaction Feature ---
    const emojis = ['👍', '❤️', '😂', '😮', '😢', '😡', '🙏'];
    if (emojiOptionsContainer) {
        emojis.forEach(emoji => {
            const span = document.createElement('span');
            span.classList.add('emoji-option');
            span.textContent = emoji;
            span.addEventListener('click', () => {
                if (lastTouchTargetMessage) {
                    const messageId = lastTouchTargetMessage.dataset.messageId;
                    socket.emit('react_to_message', messageId, emoji);
                    hideActionPopup();
                }
            });
            emojiOptionsContainer.appendChild(span);
        });
    }

    // --- Global Click Listener to Hide Action Popup ---
    document.addEventListener('click', (event) => {
        if (actionPopup && actionPopup.classList.contains('active')) {
            // Check if click is outside popup AND not on the message bubble that triggered it
            if (!actionPopup.contains(event.target) && (!lastTouchTargetMessage || !lastTouchTargetMessage.contains(event.target))) {
                hideActionPopup();
            }
        }
    });

    // --- Long Press / Right Click Event Handling (Delegated to messagesContainer) ---
    if (messagesContainer) {
        messagesContainer.addEventListener('mousedown', handlePointerDown);
        messagesContainer.addEventListener('mouseup', handlePointerUp);
        messagesContainer.addEventListener('mousemove', handlePointerMove);
        messagesContainer.addEventListener('touchstart', handlePointerDown);
        messagesContainer.addEventListener('touchend', handlePointerUp);
        messagesContainer.addEventListener('touchmove', handlePointerMove);

        // Prevent context menu on right-click for messages container to allow custom popup
        messagesContainer.addEventListener('contextmenu', (e) => {
            const targetBubble = e.target.closest('.message-bubble');
            if (targetBubble && !targetBubble.classList.contains('admin')) {
                e.preventDefault();
                lastTouchTargetMessage = targetBubble;
                if (lastTouchTargetMessage) {
                    lastTouchTargetMessage.classList.add('long-press-active');
                }
                // Show popup at mouse position for right-click
                showActionPopup(e.clientX, e.clientY);
            }
        });
    }
});

// --- Theme Toggling Functions ---
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    if (themeToggleBtn) {
        themeToggleBtn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

function loadThemePreference() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        if (themeToggleBtn) {
            themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
        }
    } else {
        document.body.classList.remove('dark-theme');
        if (themeToggleBtn) {
            themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
        }
    }
}

// --- Message Sending Function ---
async function sendMessage() {
    const messageText = messageInput ? messageInput.value.trim() : '';
    if (!messageText) return;

    if (messageText.toLowerCase().startsWith('/ai ')) {
        // Handle AI command
        const prompt = messageText.substring(4).trim();
        if (prompt) {
            appendAdminMessage("Connecting to Bro_Chatz AI...");
            try {
                const response = await fetch('/ask-ai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: prompt })
                });
                const data = await response.json();
                if (data.response) {
                    // AI response will be received via 'chat_message' event from server
                } else {
                    appendAdminMessage(`AI Error: ${data.error || 'Unknown error'}`);
                }
            } catch (error) {
                console.error('Error fetching AI response:', error);
                appendAdminMessage('Failed to connect to AI service.');
            }
        } else {
            appendAdminMessage('Please provide a prompt for the AI (e.g., /ai What is the weather?).');
        }
    } else {
        // Regular message or reply
        if (currentReplyMessageId) {
            socket.emit('chat_message', messageText, currentReplyMessageId);
            cancelReply();
        } else {
            socket.emit('chat_message', messageText);
        }
    }

    if (messageInput) {
        messageInput.value = '';
    }
    socket.emit('stop_typing');
}

// --- Message Display Function ---
function displayMessage(username, message, timestamp, type = 'user', messageId = null, replyTo = null, reactions = {}, color = null) {
    if (!messagesContainer) return;

    const messageBubble = document.createElement('div');
    messageBubble.classList.add('message-bubble');

    if (username === currentUsername && type === 'user') {
        messageBubble.classList.add('me');
    } else if (type === 'user') {
        messageBubble.classList.add('other');
    }

    if (type === 'admin') {
        messageBubble.classList.add('admin');
    }

    if (messageId) {
        messageBubble.dataset.messageId = messageId;
    }

    let replySnippetHtml = '';
    if (replyTo && replyTo.username && replyTo.text) {
        replySnippetHtml = `
            <div class="reply-snippet" data-replied-message-id="${replyTo.messageId}">
                <span class="reply-username">@${replyTo.username}</span>
                <span class="reply-text">${replyTo.text}</span>
            </div>
        `;
    }

    const reactionsHtml = Object.entries(reactions).map(([emoji, count]) => `
        <span class="reaction-item">${emoji} <small>${count}</small></span>
    `).join('');

    // Dynamically apply color style to username span if a color is provided
    const usernameSpanStyle = color ? `style="color: ${color};"` : '';

    messageBubble.innerHTML = `
        ${replySnippetHtml}
        <span class="username" ${usernameSpanStyle}>${username}</span>
        <span class="message-text">${message}</span>
        <span class="timestamp">${timestamp}</span>
        <div class="message-reactions">${reactionsHtml}</div>
    `;

    messagesContainer.appendChild(messageBubble);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Add click listener to reply snippet to scroll to the original message
    if (replyTo && replyTo.messageId) {
        const snippet = messageBubble.querySelector('.reply-snippet');
        if (snippet) {
            snippet.addEventListener('click', () => {
                const originalMessage = messagesContainer.querySelector(`[data-message-id="${replyTo.messageId}"]`);
                if (originalMessage) {
                    originalMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    originalMessage.classList.add('highlight');
                    setTimeout(() => originalMessage.classList.remove('highlight'), 1500);
                }
            });
        }
    }
}

// Helper function to append an admin message
function appendAdminMessage(message) {
    displayMessage('Admin', message, getCurrentTimestamp(), 'admin');
}

// --- Reply Mode Functions ---
function activateReplyMode(messageId, username, text) {
    currentReplyMessageId = messageId;
    if (replySnippetContainer && replySnippetText) {
        replySnippetContainer.classList.add('active');
        replySnippetText.innerHTML = `Replying to: <span class="reply-username">@${username}</span> "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`;
    }
    if (messageInput) {
        messageInput.focus();
    }
}

function cancelReply() {
    currentReplyMessageId = null;
    if (replySnippetContainer && replySnippetText) {
        replySnippetContainer.classList.remove('active');
        replySnippetText.textContent = '';
    }
    if (messageInput) {
        messageInput.focus();
    }
}

// --- Action Popup Functions (for reactions/replies context menu) ---
function showActionPopup(x, y) {
    if (!actionPopup) return;

    // Position the popup
    actionPopup.style.left = `${x}px`;
    actionPopup.style.top = `${y}px`;

    // Ensure it's within viewport bounds
    // Temporarily make active to get dimensions
    actionPopup.classList.add('active');
    const popupRect = actionPopup.getBoundingClientRect();

    // Adjust if it goes off screen right
    if (popupRect.right > window.innerWidth - 10) {
        actionPopup.style.left = `${window.innerWidth - popupRect.width - 10}px`;
    }
    // Adjust if it goes off screen bottom
    if (popupRect.bottom > window.innerHeight - 10) {
        actionPopup.style.top = `${window.innerHeight - popupRect.height - 10}px`;
    }
    // Adjust if it goes off screen top (less likely for context menu)
    if (popupRect.top < 10) {
        actionPopup.style.top = '10px';
    }

    actionPopup.classList.add('active');
}

function hideActionPopup() {
    if (actionPopup) {
        actionPopup.classList.remove('active');
    }
    if (lastTouchTargetMessage) {
        lastTouchTargetMessage.classList.remove('long-press-active');
    }
    lastTouchTargetMessage = null;
}

// --- Pointer/Touch Event Handlers for Long Press (Context Menu) ---
function handlePointerDown(e) {
    const targetBubble = e.target.closest('.message-bubble');
    if (!targetBubble || targetBubble.classList.contains('admin')) {
        return; // Don't allow long press/right click on admin messages
    }

    // Only proceed if it's a left click or a touch
    if (e.button === 0 || e.touches) {
        // Prevent default context menu on touch devices
        if (e.touches && e.cancelable) {
            e.preventDefault();
        }

        lastTouchTargetMessage = targetBubble;
        if (lastTouchTargetMessage) {
            lastTouchTargetMessage.classList.add('long-press-active');
            lastTouchTargetMessage.dataset.initialX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
            lastTouchTargetMessage.dataset.initialY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
        }

        lastTouchStartTime = Date.now();
        longPressTimer = setTimeout(() => {
            if (lastTouchTargetMessage && actionPopup) {
                const rect = lastTouchTargetMessage.getBoundingClientRect();
                let popupX, popupY;

                // Try to show popup above the message first
                popupX = rect.left + rect.width / 2; // Center horizontally with message
                popupY = rect.top; // Start at top of message

                showActionPopup(popupX, popupY);
            }
        }, LONG_PRESS_THRESHOLD);
    }
}

function handlePointerUp(e) {
    clearTimeout(longPressTimer);
    longPressTimer = null;

    if (lastTouchTargetMessage) {
        if (Date.now() - lastTouchStartTime < LONG_PRESS_THRESHOLD) {
            // This was a short tap, remove highlight immediately
            lastTouchTargetMessage.classList.remove('long-press-active');
            // If the popup was already active (e.g., from a previous long press), hide it
            if (actionPopup && actionPopup.classList.contains('active')) {
                hideActionPopup();
            }
        }
        // If it was a long press that triggered the popup, lastTouchTargetMessage
        // will be cleared by hideActionPopup when the user interacts with the popup or clicks away.
    }

    if (lastTouchTargetMessage && lastTouchTargetMessage.dataset) {
        delete lastTouchTargetMessage.dataset.initialX;
        delete lastTouchTargetMessage.dataset.initialY;
    }
}

function handlePointerMove(e) {
    if (longPressTimer && lastTouchTargetMessage) {
        const initialX = parseFloat(lastTouchTargetMessage.dataset.initialX || '0');
        const initialY = parseFloat(lastTouchTargetMessage.dataset.initialY || '0');

        const currentX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const currentY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

        const distance = Math.sqrt(Math.pow(currentX - initialX, 2) + Math.pow(currentY - initialY, 2));

        if (distance > 10) { // A threshold of 10 pixels movement to cancel long press
            clearTimeout(longPressTimer);
            longPressTimer = null;
            if (lastTouchTargetMessage) {
                lastTouchTargetMessage.classList.remove('long-press-active');
            }
        }
    }
}

// --- User Status Notification Functions ---
function displayUserStatus(message, type = 'join') {
    if (!userStatusNotifications) return;

    const statusDiv = document.createElement('div');
    statusDiv.classList.add('user-status-message');
    statusDiv.textContent = message;

    if (type === 'joined') {
        statusDiv.classList.add('join');
    } else if (type === 'left') {
        statusDiv.classList.add('leave');
    }

    userStatusNotifications.appendChild(statusDiv);

    // Remove status message after a delay
    setTimeout(() => {
        statusDiv.remove();
    }, 12000); // Remove after 12 seconds
}


// --- Socket.IO Event Handlers (Receiving messages/updates from server) ---

socket.on('connect', () => {
    console.log('Connected to chat server!');
});

socket.on('disconnect', () => {
    console.log('Disconnected from chat server!');
    displayUserStatus('You have been disconnected. Please refresh to rejoin.', 'left');
});

// IMPORTANT: Handle the 'username_set' event from the server
socket.on('username_set', (data) => {
    console.log('Server confirmed username set:', data.username);
    currentUsername = data.username;
    myAssignedColor = data.color; // Store the color for 'me' messages

    // --- Screen Switching Logic ---
    if (welcomeScreen && chatScreen && messageInput) {
        welcomeScreen.classList.remove('active'); // Hide welcome screen
        chatScreen.classList.add('active'); // Show chat screen
        messageInput.focus(); // Focus the message input
        console.log('Switched to chat screen. Message input focused.');
    } else {
        console.error('Could not find welcomeScreen, chatScreen, or messageInput to switch views.');
    }
});

// IMPORTANT: Handle errors when setting username
socket.on('username_set_error', (errorData) => {
    console.error('Username setting failed:', errorData.message);
    if (usernameInput) {
        usernameInput.classList.add('shake');
        usernameInput.placeholder = errorData.message;
        setTimeout(() => {
            usernameInput.classList.remove('shake');
            usernameInput.placeholder = 'Enter your username'; // Reset placeholder after shake
        }, 1000);
    }
    appendAdminMessage(`Error: ${errorData.message}`);
});


// Update the count of online users
socket.on('user_count', (count) => {
    if (onlineUsersCount) {
        onlineUsersCount.textContent = count;
    }
});

// Receive existing message history on connection
socket.on('message_history', (history) => {
    if (messagesContainer) {
        messagesContainer.innerHTML = ''; // Clear existing messages
        history.forEach(msg => {
            displayMessage(msg.username, msg.message, msg.timestamp, msg.type, msg.messageId, msg.replyTo, msg.reactions, msg.color);
        });
        messagesContainer.scrollTop = messagesContainer.scrollHeight; // Scroll to bottom after loading history
    }
});

// Receive a regular chat message (also used for AI responses now)
socket.on('chat_message', (data) => {
    const { username, message, timestamp, messageId, replyTo, reactions, type, color } = data;
    displayMessage(username, message, timestamp, type, messageId, replyTo, reactions, color);
});

// Receive an admin message (e.g., welcome, error messages)
socket.on('admin_message', (data) => {
    const { username, message, timestamp, messageId, type } = data;
    displayMessage(username, message, timestamp, type, messageId);
});


// Handle 'typing_users_update' event from server
socket.on('typing_users_update', (typersArray) => {
    if (typingIndicator) {
        const otherTypers = typersArray.filter(user => user !== currentUsername);

        if (otherTypers.length > 0) {
            typingIndicator.textContent = `${otherTypers.join(', ')} is typing...`;
            typingIndicator.classList.add('active');
        } else {
            typingIndicator.classList.remove('active');
            typingIndicator.textContent = '';
        }
    }
});

// Handle user joined/left status updates
socket.on('user_status', (data) => {
    const { username, status } = data;
    if (username !== currentUsername) {
        displayUserStatus(`${username} has ${status === 'joined' ? 'joined' : 'left'}.`, status);
    }
});

// Handle message reaction updates
socket.on('message_reacted', ({ messageId, updatedReactions }) => {
    if (messagesContainer) {
        const messageBubble = messagesContainer.querySelector(`[data-message-id="${messageId}"]`);
        if (messageBubble) {
            const reactionsContainer = messageBubble.querySelector('.message-reactions');
            if (reactionsContainer) {
                reactionsContainer.innerHTML = Object.entries(updatedReactions).map(([emoji, count]) => `
                    <span class="reaction-item">${emoji} <small>${count}</small></span>
                `).join('');
            }
        }
    }
});

// --- Utility Functions ---
// Gets the current time formatted as HH:MM AM/PM
function getCurrentTimestamp() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}