const socket = io();
let username = '';
let userColor = getRandomColor();

document.getElementById('start-chat').onclick = () => {
  const input = document.getElementById('username-input');
  if (input.value.trim() !== '') {
    username = input.value.trim();
    document.getElementById('welcome-screen').style.display = 'none';
    document.getElementById('chat-container').style.display = 'block';
    socket.emit('join', username);
  }
};

document.getElementById('message-input').addEventListener('keypress', () => {
  socket.emit('typing', username);
});

document.getElementById('send-button').onclick = () => {
  const input = document.getElementById('message-input');
  const message = input.value.trim();
  if (message !== '') {
    socket.emit('chat message', { user: username, msg: message, color: userColor });
    input.value = '';
  }
};

socket.on('chat message', ({ user, msg, color }) => {
  const messageBox = document.getElementById('messages');
  const item = document.createElement('div');
  item.classList.add('message-bubble');
  item.style.background = `${color}55`; // translucent
  item.style.border = `1px solid ${color}`;
  item.innerHTML = `<strong style="color:${color}">${user}:</strong> ${msg}`;
  messageBox.appendChild(item);
  messageBox.scrollTop = messageBox.scrollHeight;
});

socket.on('user joined', name => showNotification(`${name} entered the chatz`, 'green'));
socket.on('user left', name => showNotification(`${name} exited the chatz`, 'red'));

socket.on('user typing', names => {
  const typingDisplay = document.getElementById('typing-indicator');
  if (names.length > 0) {
    typingDisplay.innerText = `${names.join(', ')} ${names.length === 1 ? 'is' : 'are'} typing...`;
  } else {
    typingDisplay.innerText = '';
  }
});

socket.on('online users', count => {
  const dot = document.getElementById('online-dot');
  dot.innerText = count;
});

function getRandomColor() {
  const colors = ['#3498db', '#e74c3c', '#9b59b6', '#1abc9c', '#f1c40f', '#e67e22'];
  return colors[Math.floor(Math.random() * colors.length)];
}

function showNotification(text, color) {
  const notif = document.createElement('div');
  notif.className = 'user-notification';
  notif.innerText = text;
  notif.style.color = color;
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 4000);
}
