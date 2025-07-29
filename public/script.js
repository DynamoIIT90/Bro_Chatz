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
// Connect to the Socket.IO server (it automatically connects to the server
// from which this client-side script was served, e.g., http://localhost:3000)
const socket = io();

// --- Global Variables ---
let currentUsername = '';
let typingTimer; // Used to manage the "typing..." indicator timeout
const TYPING_DELAY = 1000; // 1 second before 'stop_typing' is emitted
let longPressTimer; // Timer for detecting long presses on messages
const LONG_PRESS_THRESHOLD = 500; // 500 milliseconds for a long press
let lastTouchStartTime; // To help distinguish between a quick tap and a long press
let lastTouchTargetMessage = null; // Stores the message bubble element currently being long-pressed

// FIX: Declare currentReplyMessageId as a global variable
let currentReplyMessageId = null; // Stores the ID of the message being replied to

// --- Event Listeners and Initial Setup (Ensures DOM is ready) ---
document.addEventListener('DOMContentLoaded', () => {
    // Select all DOM elements once the document's structure is fully loaded
    welcomeScreen = document.getElementById('welcome-screen');
    chatScreen = document.getElementById('chat-screen');
    usernameInput = document.getElementById('username-input');
    startChatBtn = document.getElementById('start-chat-btn');
    chatHeader = document.querySelector('.chat-header'); // Using class selector here
    themeToggleBtn = document.getElementById('theme-toggle-btn');
    onlineUsersCount = document.getElementById('online-users-count');
    messagesContainer = document.getElementById('messages');
    messageInput = document.getElementById('message-input');
    sendButton = document.getElementById('send-button');
    typingIndicator = document.getElementById('typing-indicator');
    actionPopup = document.getElementById('action-popup');
    emojiOptionsContainer = document.querySelector('.emoji-options'); // Using class selector here
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
                if (welcomeScreen) {
                    welcomeScreen.classList.remove('active'); // Hide the welcome screen
                }

                // Add a slight delay before showing chat screen for a smoother CSS transition
                setTimeout(() => {
                    if (chatScreen) {
                        chatScreen.classList.add('active'); // Show the main chat screen
                    }
                    if (messageInput) {
                        messageInput.focus(); // Focus the message input field
                    }
                }, 500); // This delay should match the transition duration in style.css for welcome-screen
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
    if (cancelReplyBtn) { // Defensive check in case HTML element is missing
        cancelReplyBtn.addEventListener('click', cancelReply);
    }

    if (replyButton) { // Defensive check
        replyButton.addEventListener('click', () => {
            if (lastTouchTargetMessage) {
                // Get details of the message being replied to
                const messageId = lastTouchTargetMessage.dataset.messageId;
                // Defensive checks for child elements
                const usernameEl = lastTouchTargetMessage.querySelector('.username');
                const messageTextEl = lastTouchTargetMessage.querySelector('.message-text');

                const username = usernameEl ? usernameEl.textContent : 'Unknown';
                const text = messageTextEl ? messageTextEl.textContent : 'No content';

                activateReplyMode(messageId, username, text); // Enter reply mode
                hideActionPopup(); // Hide the context menu
            }
        });
    }

    // --- Emoji Reaction Feature ---
    // Populate the emoji options within the action popup
    const emojis = ['👍', '❤️', '😂', '😮', '😢', '😡', '🙏']; // A selection of common emojis
    if (emojiOptionsContainer) {
        emojis.forEach(emoji => {
            const span = document.createElement('span');
            span.classList.add('emoji-option');
            span.textContent = emoji;
            span.addEventListener('click', () => {
                if (lastTouchTargetMessage) {
                    const messageId = lastTouchTargetMessage.dataset.messageId;
                    socket.emit('react_to_message', messageId, emoji); // Send reaction to server
                    hideActionPopup(); // Hide the context menu
                }
            });
            emojiOptionsContainer.appendChild(span); // Add emoji option to the popup
        });
    }


    // --- Global Click Listener to Hide Action Popup ---
    // Hides the reply/reaction popup if the user clicks anywhere outside of it or the target message
    document.addEventListener('click', (event) => {
        if (actionPopup && actionPopup.classList.contains('active')) {
            // Check if the click occurred outside the popup AND outside the message bubble
            // that triggered the popup (to prevent immediate re-triggering on accidental click)
            if (!actionPopup.contains(event.target) && (!lastTouchTargetMessage || !lastTouchTargetMessage.contains(event.target))) {
                 hideActionPopup();
            }
        }
    });

    // --- Long Press / Right Click Event Handling (Delegated to messagesContainer) ---
    // These events are handled on the parent 'messagesContainer' for efficiency
    // and to work with dynamically added messages.
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
    document.body.classList.toggle('dark-theme'); // Add/remove 'dark-theme' class to body
    const isDark = document.body.classList.contains('dark-theme');
    // Change icon based on current theme
    if (themeToggleBtn) { // Defensive check
        themeToggleBtn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light'); // Save theme preference in local storage
}

function loadThemePreference() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        if (themeToggleBtn) { // Defensive check
            themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
        }
    } else {
        document.body.classList.remove('dark-theme');
        if (themeToggleBtn) { // Defensive check
            themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
        }
    }
}

// --- Message Sending Function ---
function sendMessage() {
    const messageText = messageInput ? messageInput.value.trim() : '';
    if (messageText) {
        // If currentReplyMessageId is set, send as a reply
        if (currentReplyMessageId) {
            socket.emit('chat_message', messageText, currentReplyMessageId);
            cancelReply(); // Exit reply mode after sending the reply
        } else {
            // Otherwise, send as a regular message
            socket.emit('chat_message', messageText);
        }
        if (messageInput) {
            messageInput.value = ''; // Clear the message input field
        }
        socket.emit('stop_typing'); // Ensure typing indicator is turned off
    }
}

// --- Message Display Function ---
function displayMessage(username, message, timestamp, type = 'user', messageId = null, replyTo = null, reactions = {}) {
    if (!messagesContainer) return; // Exit if container not found

    const messageBubble = document.createElement('div');
    messageBubble.classList.add('message-bubble');
    if (type === 'admin') {
        messageBubble.classList.add('admin'); // Style admin messages differently
    }

    if (messageId) {
        messageBubble.dataset.messageId = messageId; // Store message ID for replies/reactions
    }

    let replySnippetHtml = '';
    // If this message is a reply to another message, create the reply snippet HTML
    if (replyTo && replyTo.username && replyTo.text) {
        replySnippetHtml = `
            <div class="reply-snippet" data-replied-message-id="${replyTo.messageId}">
                <span class="reply-username">@${replyTo.username}</span>
                <span class="reply-text">${replyTo.text}</span>
            </div>
        `;
    }

    // Generate HTML for existing reactions on the message
    const reactionsHtml = Object.entries(reactions).map(([emoji, count]) => `
        <span class="reaction-item">${emoji} <small>${count}</small></span>
    `).join('');

    messageBubble.innerHTML = `
        ${replySnippetHtml}
        <span class="username">${username}</span>
        <span class="message-text">${message}</span>
        <span class="timestamp">${timestamp}</span>
        <div class="message-reactions">${reactionsHtml}</div>
    `;

    messagesContainer.appendChild(messageBubble); // Add the new message to the chat container
    messagesContainer.scrollTop = messagesContainer.scrollHeight; // Auto-scroll to the bottom of the chat

    // Add click listener to reply snippet to scroll to the original message
    if (replyTo && replyTo.messageId) {
        const snippet = messageBubble.querySelector('.reply-snippet');
        if (snippet) {
            snippet.addEventListener('click', () => {
                const originalMessage = messagesContainer.querySelector(`[data-message-id="${replyTo.messageId}"]`);
                if (originalMessage) {
                    originalMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    originalMessage.classList.add('highlight'); // Temporarily highlight the original message
                    setTimeout(() => originalMessage.classList.remove('highlight'), 1500); // Remove highlight after animation
                }
            });
        }
    }
}

// --- Reply Mode Functions ---
function activateReplyMode(messageId, username, text) {
    currentReplyMessageId = messageId; // Store the ID of the message being replied to
    if (replySnippetContainer && replySnippetText) { // Defensive check
        replySnippetContainer.classList.add('active'); // Show the reply snippet UI
        // Display a short preview of the message being replied to
        replySnippetText.innerHTML = `Replying to: <span class="reply-username">@${username}</span> "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`;
    }
    if (messageInput) {
        messageInput.focus(); // Focus the message input field
    }
}

function cancelReply() {
    currentReplyMessageId = null; // Clear the reply mode
    if (replySnippetContainer && replySnippetText) { // Defensive check added here
        replySnippetContainer.classList.remove('active'); // Hide the reply snippet UI
        replySnippetText.textContent = ''; // Clear the reply snippet text
    }
    if (messageInput) {
        messageInput.focus(); // Keep focus on the message input
    }
}

// --- Action Popup Functions (for reactions/replies context menu) ---
function showActionPopup(x, y) {
    if (!actionPopup) return; // Defensive check

    actionPopup.style.left = `${x}px`;
    actionPopup.style.top = `${y}px`;
    actionPopup.classList.add('active'); // Make the popup visible
}

function hideActionPopup() {
    if (actionPopup) { // Defensive check
        actionPopup.classList.remove('active'); // Hide the popup
    }
    if (lastTouchTargetMessage) {
        lastTouchTargetMessage.classList.remove('long-press-active'); // Remove long-press highlight
    }
    lastTouchTargetMessage = null; // Clear the reference to the message that triggered the popup
}

// --- Pointer/Touch Event Handlers for Long Press (Context Menu) ---
function handlePointerDown(e) {
    // Determine the message bubble that was clicked/touched
    const targetBubble = e.target.closest('.message-bubble');
    // Only proceed if it's a message bubble and not an admin message
    if (!targetBubble || targetBubble.classList.contains('admin')) {
        return;
    }

    // Prevent default browser context menu on right-click
    if (e.button === 2) { // Right-click (mouse event)
        e.preventDefault();
    }
    // Prevent default touch behavior (like scrolling/zooming on long press)
    if (e.cancelable && e.touches) { // Check for touch events and if default can be prevented
        e.preventDefault();
    }

    lastTouchTargetMessage = targetBubble; // Store the target message bubble
    if (lastTouchTargetMessage) { // Defensive check
        lastTouchTargetMessage.classList.add('long-press-active'); // Add immediate visual feedback
    }


    // Store initial touch/mouse position to detect movement
    if (lastTouchTargetMessage) { // Defensive check
        lastTouchTargetMessage.dataset.initialX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        lastTouchTargetMessage.dataset.initialY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    }

    lastTouchStartTime = Date.now(); // Record the start time of the press
    longPressTimer = setTimeout(() => {
        // If the timer completes, it's a long press
        if (lastTouchTargetMessage && actionPopup) { // Defensive check for actionPopup
            const rect = lastTouchTargetMessage.getBoundingClientRect(); // Get position of the message bubble
            let popupX, popupY;

            // Temporarily make popup visible (but off-screen) to get its true dimensions
            actionPopup.style.visibility = 'hidden';
            actionPopup.classList.add('active');
            const popupHeight = actionPopup.offsetHeight;
            const popupWidth = actionPopup.offsetWidth;
            actionPopup.classList.remove('active');
            actionPopup.style.visibility = ''; // Reset visibility

            // Calculate popup Y position: try above, if not enough space, place below
            if (rect.top - popupHeight - 10 > 0) { // 10px buffer
                popupY = rect.top - popupHeight - 10;
            } else {
                popupY = rect.bottom + 10;
            }

            // Calculate popup X position: centered above/below the message bubble
            popupX = rect.left + rect.width / 2 - popupWidth / 2;

            // Clamp X position to stay within window bounds
            popupX = Math.max(10, Math.min(popupX, window.innerWidth - popupWidth - 10));

            showActionPopup(popupX, popupY); // Display the action popup
        }
    }, LONG_PRESS_THRESHOLD);
}

function handlePointerUp(e) {
    clearTimeout(longPressTimer); // Clear any pending long press timer
    longPressTimer = null; // Reset timer reference

    // Only proceed if there was a message targeted by a pointer down
    if (lastTouchTargetMessage) {
        // If it was a short tap (timer didn't complete), remove active class immediately
        if (Date.now() - lastTouchStartTime < LONG_PRESS_THRESHOLD) {
             lastTouchTargetMessage.classList.remove('long-press-active');
             hideActionPopup(); // Ensure popup is hidden on a short tap
        }
        // If it was a long press that triggered the popup, lastTouchTargetMessage
        // will be cleared by hideActionPopup when the user interacts with the popup or clicks away.
    }

    // Clear initial position data
    if (lastTouchTargetMessage && lastTouchTargetMessage.dataset) {
        delete lastTouchTargetMessage.dataset.initialX;
        delete lastTouchTargetMessage.dataset.initialY;
    }
}

function handlePointerMove(e) {
    // If a long press timer is active and there's a target message
    if (longPressTimer && lastTouchTargetMessage) {
        const initialX = parseFloat(lastTouchTargetMessage.dataset.initialX || '0'); // Default to '0' if undefined
        const initialY = parseFloat(lastTouchTargetMessage.dataset.initialY || '0'); // Default to '0' if undefined

        const currentX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const currentY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

        const distance = Math.sqrt(Math.pow(currentX - initialX, 2) + Math.pow(currentY - initialY, 2));

        // If pointer moves significantly before the long press threshold is met, cancel it
        if (distance > 10) { // A threshold of 10 pixels movement
            clearTimeout(longPressTimer);
            longPressTimer = null; // Reset timer
            if (lastTouchTargetMessage) {
                lastTouchTargetMessage.classList.remove('long-press-active');
            }
        }
    }
}

// --- User Status Notification Functions ---
function displayUserStatus(message, type = 'join') {
    if (!userStatusNotifications) return; // Exit if container not found

    const statusDiv = document.createElement('div');
    statusDiv.classList.add('user-status-message');
    statusDiv.textContent = message;

    // Add specific class for styling based on status type
    if (type === 'join') {
        statusDiv.classList.add('join');
    } else if (type === 'leave') {
        statusDiv.classList.add('leave');
    }

    userStatusNotifications.appendChild(statusDiv); // Add to the notification area

    // Automatically remove the notification after a set time (e.g., 12 seconds, matching CSS animation)
    setTimeout(() => {
        statusDiv.remove();
    }, 12000);
}


// --- Socket.IO Event Handlers (Receiving messages/updates from server) ---

// When successfully connected to the chat server
socket.on('connect', () => {
    console.log('Connected to chat server!');
});

// When disconnected from the chat server
socket.on('disconnect', () => {
    console.log('Disconnected from chat server!');
    displayUserStatus('You have been disconnected. Please refresh to rejoin.', 'leave');
});

// Update the count of online users
socket.on('user_count', (count) => {
    if (onlineUsersCount) {
        onlineUsersCount.textContent = count;
    }
});

// Receive a regular chat message
socket.on('chat_message', (data) => {
    const { username, message, timestamp, messageId, replyTo, reactions } = data;
    displayMessage(username, message, timestamp, 'user', messageId, replyTo, reactions);
});

// Receive an admin message
socket.on('admin_message', (message) => {
    displayMessage('Admin', message, getCurrentTimestamp(), 'admin');
});

// Handle 'typing' event from other users
socket.on('typing', (username) => {
    if (username !== currentUsername && typingIndicator) { // Only show for other users, not self, and check indicator
        typingIndicator.textContent = `${username} is typing...`;
        typingIndicator.classList.add('active');
    }
});

// Handle 'stop_typing' event from other users
socket.on('stop_typing', (username) => {
    if (username !== currentUsername && typingIndicator) {
        typingIndicator.classList.remove('active');
        // A simple check to clear text: ensures it's cleared only if no other 'is typing' text exists
        // (For multiple typers, a more sophisticated array-based approach would be needed)
        if (!typingIndicator.textContent.includes(' is typing')) { // Ensures we don't clear if another user is typing
            typingIndicator.textContent = '';
        }
    }
});

// Handle user joined/left status updates
socket.on('user_status', (data) => {
    const { username, status } = data;
    if (username !== currentUsername) { // Only show for other users, not self
        displayUserStatus(`${username} has ${status === 'joined' ? 'joined' : 'left'}.`, status);
    }
});

// Handle message reaction updates
socket.on('message_reacted', ({ messageId, updatedReactions }) => {
    if (messagesContainer) { // Defensive check
        const messageBubble = messagesContainer.querySelector(`[data-message-id="${messageId}"]`);
        if (messageBubble) {
            const reactionsContainer = messageBubble.querySelector('.message-reactions');
            if (reactionsContainer) {
                // Rebuild the reactions HTML based on the updated counts
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