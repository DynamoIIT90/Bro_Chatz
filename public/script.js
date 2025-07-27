const socket = io();

const welcomeScreen = document.getElementById("welcome-screen");
const chatScreen = document.getElementById("chat-screen");
const usernameInput = document.getElementById("username-input");
const startButton = document.getElementById("start-button");
const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");
const onlineCountSpan = document.getElementById("online-count");
const typingStatus = document.getElementById("typing-status");

let username = "";
let userColor = "";

function getRandomColor() {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function startChat() {
  username = usernameInput.value.trim();
  if (username !== "") {
    userColor = getRandomColor();
    welcomeScreen.style.display = "none";
    chatScreen.style.display = "block";
    socket.emit("join", username);
  }
}

startButton.onclick = startChat;

sendButton.onclick = () => {
  const message = messageInput.value.trim();
  if (message !== "") {
    socket.emit("chat message", { user: username, message, color: userColor });
    messageInput.value = "";
    socket.emit("typing", { user: username, typing: false });
  }
};

messageInput.addEventListener("input", () => {
  socket.emit("typing", { user: username, typing: messageInput.value.trim() !== "" });
});

socket.on("chat message", (data) => {
  const msg = document.createElement("div");
  msg.innerHTML = `<strong style="color:${data.color}">${data.user}</strong>: ${data.message}`;
  messagesDiv.appendChild(msg);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

socket.on("user count", (count) => {
  onlineCountSpan.textContent = `● ${count} online`;
});

socket.on("typing", (data) => {
  if (data.typing && data.user !== username) {
    typingStatus.textContent = `${data.user} is typing...`;
  } else {
    typingStatus.textContent = "";
  }
});

socket.on("notify", (info) => {
  const note = document.createElement("div");
  note.classList.add("join-leave-note");
  note.textContent = info;
  messagesDiv.appendChild(note);
  setTimeout(() => note.remove(), 4000);
});
