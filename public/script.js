const socket = io();

const welcomeScreen = document.getElementById('welcome-screen');
const chatContainer = document.getElementById('chat-container');
const nameInput = document.getElementById('name-input');
const startChatButton = document.getElementById('start-chat');
const messageForm = document.getElementById('send-container');
const messageInput = document.getElementById('message-input');
const messages = document.getElementById('messages');
const typingIndicator = document.getElementById('typing-indicator');
const userCount = document.getElementById('user-count');

let userName = '';
let typing = false;
let typingTimeout;

startChatButton.addEventListener('click', () => {
  const name = nameInput.value.trim();
  if (name !== '') {
    userName = name;
    socket.emit('new-user', userName);
    welcomeScreen.classList.add('hidden');
    chatContainer.classList.remove('hidden');
  }
});

messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const message = messageInput.value.trim();
  if (message !== '') {
    appendMessage(`You: ${message}`, '#888');
    socket.emit('chat-message', { message });
    messageInput.value = '';
  }
});

messageInput.addEventListener('input', () => {
  if (!typing) {
    typing = true;
    socket.emit('typing');
    typingTimeout = setTimeout(stopTyping, 1000);
  } else {
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(stopTyping, 1000);
  }
});

function stopTyping() {
  typing = false;
  socket.emit('stop-typing');
}

function appendMessage(text, color = '#fff') {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message');
  messageElement.style.color = color;
  messageElement.textContent = text;
  messages.appendChild(messageElement);
  messages.scrollTop = messages.scrollHeight;
}

socket.on('chat-message', (data) => {
  appendMessage(`${data.name}: ${data.message}`, data.color);
});

socket.on('user-connected', (name) => {
  appendMessage(`${name} entered the chatz`, '#0f0');
});

socket.on('user-disconnected', (name) => {
  appendMessage(`${name} exited the chatz`, '#f00');
});

socket.on('typing', (name) => {
  typingIndicator.textContent = `${name} is typing...`;
});

socket.on('stop-typing', (name) => {
  typingIndicator.textContent = '';
});

socket.on('update-user-count', (count) => {
  userCount.textContent = `🔴 ${count} online`;
});
