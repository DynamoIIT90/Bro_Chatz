// script.js
const socket = io();

const welcomeScreen = document.getElementById("welcome-screen");
const chatContainer = document.getElementById("chat-container");
const nameInput = document.getElementById("name-input");
const startChatBtn = document.getElementById("start-chat-btn");
const chatBox = document.getElementById("chat-box");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const onlineCounter = document.getElementById("online-counter");
const typingIndicator = document.getElementById("typing-indicator");
const notifications = document.getElementById("notifications");
const toggleModeBtn = document.getElementById("toggle-mode");

let username = "";
let userColor = "";
let typingTimeout;

function getRandomDarkColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 12)];
  }
  return color;
}

function appendMessage(user, message, color) {
  const messageEl = document.createElement("div");
  messageEl.classList.add("message");
  messageEl.innerHTML = `<strong class="username" style="color:${color}">${user}</strong>: ${message}`;
  chatBox.appendChild(messageEl);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function showNotification(text) {
  notifications.innerText = text;
  notifications.classList.remove("hidden");
  setTimeout(() => notifications.classList.add("hidden"), 4000);
}

startChatBtn.addEventListener("click", () => {
  const name = nameInput.value.trim();
  if (!name) return;
  username = name;
  userColor = getRandomDarkColor();
  welcomeScreen.classList.add("hidden");
  chatContainer.classList.remove("hidden");
  socket.emit("new-user", username);
});

messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const msg = messageInput.value.trim();
  if (!msg) return;
  appendMessage("You", msg, userColor);
  socket.emit("chat-message", { user: username, message: msg, color: userColor });
  messageInput.value = "";
});

messageInput.addEventListener("input", () => {
  socket.emit("typing", username);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => socket.emit("stop-typing", username), 1000);
});

toggleModeBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
});

socket.on("chat-message", (data) => {
  appendMessage(data.user, data.message, data.color);
});

socket.on("user-connected", (name) => {
  showNotification(`${name} entered the chatz`);
});

socket.on("user-disconnected", (name) => {
  showNotification(`${name} exited the chatz`);
});

socket.on("update-online-count", (count) => {
  onlineCounter.innerText = `${count} online`;
});

let typingUsers = new Set();

socket.on("typing", (name) => {
  typingUsers.add(name);
  typingIndicator.innerText = `${[...typingUsers].join(", ")} typing...`;
});

socket.on("stop-typing", (name) => {
  typingUsers.delete(name);
  typingIndicator.innerText = typingUsers.size ? `${[...typingUsers].join(", ")} typing...` : "";
});
