const socket = io();
let username = "";

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
onlineUsersDisplay.style.background = 'red';
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
  
  socket.emit('chat message', { user: username, message });
  chatInput.value = "";
  socket.emit('stopTyping', username);
}

// Listen for messages
socket.on('chat message', (data) => {
  const msgElement = document.createElement('div');
  msgElement.innerHTML = `<strong>${data.user}:</strong> ${data.message}`;
  messages.appendChild(msgElement);
  messages.scrollTop = messages.scrollHeight;
});

// Online users update
socket.on('updateUserCount', (count) => {
  onlineUsersDisplay.innerText = `🔴 ${count} online`;
});

// Typing status update
socket.on('typingStatus', (typingUsers) => {
  if (typingUsers.length === 0) {
    typingIndicator.innerText = "";
  } else {
    const names = typingUsers.filter(name => name !== username);
    if (names.length === 0) {
      typingIndicator.innerText = "";
    } else if (names.length === 1) {
      typingIndicator.innerText = `${names[0]} is typing...`;
    } else {
      typingIndicator.innerText = `${names.join(', ')} are typing...`;
    }
  }
});

// Typing events
chatInput.addEventListener('input', () => {
  if (chatInput.value.trim() !== "") {
    socket.emit('typing', username);
  } else {
    socket.emit('stopTyping', username);
  }
});
