const socket = io();
let username = '';
let userColor = '';

function startChat() {
  username = document.getElementById('username').value.trim();
  if (!username) return;

  document.getElementById('welcome').style.display = 'none';
  document.getElementById('welcomeMessage').style.display = 'none';
  document.getElementById('chatWindow').style.display = 'flex';

  userColor = getRandomDarkColor();
  socket.emit('new-user', username);
}

function sendMessage() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  if (!message) return;

  socket.emit('chat-message', { username, message, color: userColor });
  input.value = '';
}

socket.on('chat-message', data => {
  const msgDiv = document.createElement('div');
  msgDiv.classList.add('message');
  msgDiv.innerHTML = `<span class="username" style="color: ${data.color}">${data.username}:</span> ${data.message}`;
  document.getElementById('messages').appendChild(msgDiv);
  scrollToBottom();
});

socket.on('user-list', count => {
  document.getElementById('onlineIndicator').textContent = `🟢 ${count} online`;
});

socket.on('entry-exit', text => {
  const popup = document.getElementById('entryExitPopup');
  popup.textContent = text;
  popup.style.display = 'block';
  setTimeout(() => { popup.style.display = 'none'; }, 4000);
});

socket.on('typing', users => {
  const indicator = document.getElementById('typingIndicator');
  if (users.length === 0) {
    indicator.textContent = '';
  } else {
    const names = users.join(', ');
    indicator.textContent = `${names} ${users.length === 1 ? 'is' : 'are'} typing...`;
  }
});

document.getElementById('chatInput').addEventListener('input', () => {
  socket.emit('typing', username);
});

function getRandomDarkColor() {
  const base = 30 + Math.floor(Math.random() * 80);
  return `rgb(${base}, ${base}, ${base})`;
}

function scrollToBottom() {
  const messages = document.getElementById('messages');
  messages.scrollTop = messages.scrollHeight;
}

function toggleTheme() {
  document.body.classList.toggle('dark-mode');
}
