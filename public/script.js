const socket = io();
let myName = "";
let userColor = "";

function getRandomDarkColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 35%)`;
}

function startChat() {
  const input = document.getElementById("username");
  const name = input.value.trim();
  if (!name) return;
  myName = name;
  userColor = getRandomDarkColor();

  document.getElementById("welcomeScreen").style.display = "none";
  document.getElementById("chatWindow").style.display = "flex";

  socket.emit("user-joined", { name, color: userColor });
}

function sendMessage() {
  const input = document.getElementById("chatInput");
  const msg = input.value.trim();
  if (!msg) return;
  socket.emit("chat-message", { name: myName, message: msg, color: userColor });
  input.value = "";
}

socket.on("chat-message", (data) => {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message");
  msgDiv.innerHTML = `<span class="username" style="color:${data.color}">${data.name}:</span> <span>${data.message}</span>`;
  document.getElementById("messages").appendChild(msgDiv);
  document.getElementById("messages").scrollTop = messages.scrollHeight;
});

socket.on("user-joined", ({ name }) => {
  showNotification(`${name} entered the chatz`);
});
socket.on("user-left", ({ name }) => {
  showNotification(`${name} exited the chatz`);
});
socket.on("update-online-count", (count) => {
  document.getElementById("onlineCount").innerText = `💬 ${count} Online`;
});

// Typing
let typingTimeout;
function notifyTyping() {
  socket.emit("typing", myName);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit("typing", "");
  }, 1000);
}
socket.on("typing", (data) => {
  document.getElementById("typingIndicator").innerText = data
    ? `${data} is typing...`
    : "";
});

// Notifications
function showNotification(text) {
  const note = document.createElement("div");
  note.classList.add("notification");
  note.innerText = text;
  document.getElementById("notifications").appendChild(note);
  setTimeout(() => {
    note.remove();
  }, 3000);
}

// Mode Toggle
document.getElementById("toggleMode").addEventListener("click", () => {
  document.body.classList.toggle("dark");
});
