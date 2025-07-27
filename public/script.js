const socket = io();
let username = "";

// Assign a random color to this user (preserved until refresh)
const userColor = '#' + Math.floor(Math.random() * 16777215).toString(16);

// DOM elements
const welcome = document.getElementById('welcome');
const chatWindow = document.getElementById('chatWindow');
const usernameInput = document.getElementById('username');
const messages = document.getElementById('messages');
const chatInput = document.getElementById('chatInput');

// Create online user counter
const onlineUsersDisplay = document.createElement('div');
onlineUsersDisplay.style.position = 'fixed';
onlineUsersDisplay.style.top = '10px';
onlineUsersDisplay.style.right = '10px';
onlineUsersDisplay.style.fontSize = '12px';
onlineUsersDisplay.style.color = 'white';
onlineUsersDisplay.style.background = '#ff4444';
onlineUsersDisplay.style.padding = '2px 6px';
onlineUsersDisplay.style.borderRadius = '20px';
onlineUsersDisplay.style.animation = 'blink 1s infinite';
onlineUsersDisplay.innerText = '🔴 0 online';
document.body.appendChild(onlineUsersDisplay);

// Create typing indicator
const typingIndicator = document.createElement('div');
typingIndicator.style.fontSize = '12px';
typingIndicator.style.color = 'gray';
typingIndicator.style.margin = '5px 10px';
typingIndicator.style.fontStyle = 'italic';
messages.parentNode.insertBefore(typingIndicator, messages.nextSibling);

// Create notification container
const notificationBanner = document.createElement('div');
notificationBanner.style.position = 'absolute';
notificationBanner.style.top = '0';
notificationBanner.style.left = '50%';
notificationBanner.style.transform = 'translateX(-50%)';
notificationBanner.style.zIndex = '9999';
notificationBanner.style.fontSize = '12px';
notificationBanner.style.color = '#fff';
notificationBanner.style.background = 'rgba(0, 0, 0, 0.6)';
notificationBanner.style.padding = '6px 12px';
notificationBanner.style.borderRadius = '10px';
notificationBanner.style.opacity = '0';
notificationBanner.style.transition = 'opacity 0.5s ease';
chatWindow.appendChild(notificationBanner);

// Show notification
function showNotification(user, action) {
  notificationBanner.innerText = `${user} ${action} the chatz`;
  notificationBanner.style.opacity = '1';
  setTimeout(() => {
    notificationBanner.style.opacity = '0';
  }, 3500);
}

// Show chat window
function startChat() {
  username = usernameInput.value.trim();
  if (!username) return alert("Please enter your name.");

  socket.emit('setUsername', username);
  welcome.style.display = 'none';
  chatWindow.style.display = 'block';
}

// Send message
function sendMessage() {
  const message = chatInput.value.trim();
  if (message === "") return;

  socket.emit('chat message', { user: username, message, color: userColor });
  chatInput.value = "";
  socket.emit('stopTyping', username);
}

// Listen for messages with IG-style bubble
socket.on('chat message', (data) => {
  const bubbleWrapper = document.createElement('div');
  bubbleWrapper.style.display = 'flex';
  bubbleWrapper.style.justifyContent = data.user === username ? 'flex-end' : 'flex-start';
  bubbleWrapper.style.margin = '6px 10px';

  const bubble = document.createElement('div');
  bubble.innerHTML = `<strong style="font-size: 12px;">${data.user}</strong><br><span style="font-size: 14px;">${data.message}</span>`;
