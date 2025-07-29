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
let userStatusNotifications; // For user join/leave messages

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
    // Select all DOM elements once the document's structure is fully loaded
    welcomeScreen = document.getElementById('welcome-screen');
    chatScreen = document.getElementById('chat-screen');
    usernameInput = document.getElementById('username-input');
    startChatBtn = document.getElementById('start-chat-btn');
    chatHeader = document.querySelector('.chat-header');
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

    // --- Initial UI Setup ---
    if (welcomeScreen) {
        welcomeScreen.classList.add('active'); // Ensure welcome screen is visible initially
    }
    if (usernameInput) {
        usernameInput.focus(); // Automatically focus the username input for convenience
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
                // Provide visual feedback if username is empty
                if (usernameInput) {
                    usernameInput.placeholder = 'Please enter a name!';
                    usernameInput.classList.add('shake'); // Add a shake animation
                    setTimeout(() => usernameInput.classList.remove('shake'), 500); // Remove shake after animation
                }
            }
        });
    }

    // Allow starting chat by pressing Enter in the username input field
    if (usernameInput) {
        usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (startChatBtn) {
                    startChatBtn.click(); // Simulate a click on the "Start Chat" button
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
                e.preventDefault(); // Prevent default Enter key behavior (like new line)
                sendMessage();
            }
        });

        // --- Typing Indicator Logic ---
        messageInput.addEventListener('input', () => {
            if (messageInput.value.trim() !== '') {
                socket.emit('typing'); // Notify server that user is typing
                clearTimeout(typingTimer); // Reset the timer
                typingTimer = setTimeout(() => {
                    socket.emit('stop_typing'); // Notify server when typing stops
                }, TYPING_DELAY);
            } else {
                clearTimeout(typingTimer);
                socket.emit('stop_typing'); // Ensure stop_typing is sent if input is cleared
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
    socket.emit('stop_typing'); // Ensure typing indicator is turned off
}

// --- Message Display Function ---
function displayMessage(username, message, timestamp, type = 'user', messageId = null, replyTo = null, reactions = {}, color = null) {
    if (!messagesContainer) return;

    const messageBubble = document.createElement('div');
    messageBubble.classList.add('message-bubble');

    // Add 'me' or 'other' class based on the sender
    if (username === currentUsername && type === 'user') {
        messageBubble.classList.add('me');
    } else if (type === 'user') { // For other users' messages
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

    messageBubble.innerHTML = `
        ${replySnippetHtml}
        <span class="username" ${color ? `style="color: ${color};"` : ''}>${username}</span>
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

    actionPopup.style.left = `${x}px`;
    actionPopup.style.top = `${y}px`;
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
        return; // Don't allow long press on admin messages
    }

    if (e.button === 2) { // Right-click (mouse event)
        e.preventDefault();
    }
    if (e.cancelable && e.touches) { // Check for touch events and if default can be prevented
        e.preventDefault();
    }

    lastTouchTargetMessage = targetBubble;
    if (lastTouchTargetMessage) {
        lastTouchTargetMessage.classList.add('long-press-active');
    }

    if (lastTouchTargetMessage) {
        lastTouchTargetMessage.dataset.initialX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        lastTouchTargetMessage.dataset.initialY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    }

    lastTouchStartTime = Date.now();
    longPressTimer = setTimeout(() => {
        if (lastTouchTargetMessage && actionPopup) {
            const rect = lastTouchTargetMessage.getBoundingClientRect();
            let popupX, popupY;

            // Temporarily make popup visible (but off-screen) to get its true dimensions
            actionPopup.style.visibility = 'hidden';
            actionPopup.classList.add('active');
            const popupHeight = actionPopup.offsetHeight;
            const popupWidth = actionPopup.offsetWidth;
            actionPopup.classList.remove('active');
            actionPopup.style.visibility = '';

            // Calculate popup Y position: try above, if not enough space, place below
            if (rect.top - popupHeight - 10 > 0) {
                popupY = rect.top - popupHeight - 10;
            } else {
                popupY = rect.bottom + 10;
            }

            // Calculate popup X position: centered above/below the message bubble
            popupX = rect.left + rect.width / 2 - popupWidth / 2;

            // Clamp X position to stay within window bounds
            popupX = Math.max(10, Math.min(popupX, window.innerWidth - popupWidth - 10));

            showActionPopup(popupX, popupY);
        }
    }, LONG_PRESS_THRESHOLD);
}

function handlePointerUp(e) {
    clearTimeout(longPressTimer);
    longPressTimer = null;

    if (lastTouchTargetMessage) {
        if (Date.now() - lastTouchStartTime < LONG_PRESS_THRESHOLD) {
            // This was a short tap, not a long press
            lastTouchTargetMessage.classList.remove('long-press-active');
            // If the popup was already active from a previous long press, hide it
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

        if (distance > 10) { // A threshold of 10 pixels movement
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

    if (type === 'joined') { // Use 'joined' and 'left' to match server events
        statusDiv.classList.add('join');
    } else if (type === 'left') {
        statusDiv.classList.add('leave');
    }

    userStatusNotifications.appendChild(statusDiv);

    setTimeout(() => {
        statusDiv.remove();
    }, 12000);
}


// --- Socket.IO Event Handlers (Receiving messages/updates from server) ---

socket.on('connect', () => {
    console.log('Connected to chat server!');
    // No action needed here, username is set on start chat button click
});

socket.on('disconnect', () => {
    console.log('Disconnected from chat server!');
    displayUserStatus('You have been disconnected. Please refresh to rejoin.', 'left');
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
    }
});

// Receive a regular chat message (also used for AI responses now)
socket.on('chat_message', (data) => {
    const { username, message, timestamp, messageId, replyTo, reactions, type, color } = data;
    displayMessage(username, message, timestamp, type, messageId, replyTo, reactions, color);
});

// Receive an admin message (e.g., welcome, error messages)
// Note: Admin messages from server now include full message data structure
socket.on('admin_message', (data) => {
    const { username, message, timestamp, messageId, type } = data; // destructure fully
    displayMessage(username, message, timestamp, type, messageId);
    // No color needed as it's typically set by CSS for admin messages
});


// Handle 'typing_users_update' event from server
socket.on('typing_users_update', (typersArray) => {
    if (typingIndicator) {
        // Filter out the current user if they are in the typers list
        const otherTypers = typersArray.filter(user => user !== currentUsername);

        if (otherTypers.length > 0) {
            typingIndicator.textContent = `${otherTypers.join(', ')} is typing...`;
            typingIndicator.classList.add('active');
        } else {
            typingIndicator.classList.remove('active');
            typingIndicator.textContent = ''; // Clear text when no one is typing
        }
    }
});

// Handle user joined/left status updates
socket.on('user_status', (data) => {
    const { username, status } = data;
    if (username !== currentUsername) {
        displayUserStatus(`${username} has ${status === 'joined' ? 'joined' : 'left'}.`, status);
    }
    // No need to update user count here, server already sends 'user_count' separately
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