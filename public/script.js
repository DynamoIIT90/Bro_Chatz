document.addEventListener('DOMContentLoaded', () => {
  const socket = io();
  let username = "";

  const userColor = '#' + Math.floor(Math.random() * 16777215).toString(16);

  const welcome = document.getElementById('hero');
  const chatWindow = document.getElementById('chatWindow');
  const usernameInput = document.getElementById('username');
  const messages = document.getElementById('messages');
  const chatInput = document.getElementById('chatInput');

  chatWindow.style.display = 'none';

  const onlineUsersDisplay = document.createElement('div');
  onlineUsersDisplay.className = 'online-counter';
  onlineUsersDisplay.innerText = '🔴 0 online';
  document.body.appendChild(onlineUsersDisplay);

  const typingIndicator = document.createElement('div');
  typingIndicator.className = 'typing-indicator';
  messages.parentNode.insertBefore(typingIndicator, messages.nextSibling);

  const notificationBanner = document.createElement('div');
  notificationBanner.className = 'notification-banner';
  chatWindow.appendChild(notificationBanner);

  function showNotification(user, action) {
    notificationBanner.innerText = `${user} ${action} the chatz`;
    notificationBanner.style.opacity = '1';
    setTimeout(() => {
      notificationBanner.style.opacity = '0';
    }, 3500);
  }

  function startChat() {
    username = usernameInput.value.trim();
    if (!username) return alert("Please enter your name.");

    socket.emit('setUsername', username);
    welcome.style.display = 'none';
    chatWindow.style.display = 'flex';
  }

  function sendMessage() {
    const message = chatInput.value.trim();
    if (message === "") return;

    socket.emit('chat message', { user: username, message, color: userColor });
    chatInput.value = "";
    socket.emit('stopTyping', username);
  }

  socket.on('chat message', (data) => {
    const msgElement = document.createElement('div');
    msgElement.className = 'message-bubble';
    msgElement.style.borderColor = data.color || 'white';
    msgElement.innerHTML = `<strong style="color:${data.color}">${data.user}:</strong> ${data.message}`;
    messages.appendChild(msgElement);
    messages.scrollTop = messages.scrollHeight;
  });

  socket.on('updateUserCount', (count) => {
    onlineUsersDisplay.innerText = `🔴 ${count} online`;
  });

  socket.on('typingStatus', (typingUsers) => {
    const names = typingUsers.filter(name => name !== username);
    typingIndicator.innerText =
      names.length === 0 ? "" :
      names.length === 1 ? `${names[0]} is typing...` :
      `${names.join(', ')} are typing...`;
  });

  chatInput.addEventListener('input', () => {
    if (chatInput.value.trim() !== "") {
      socket.emit('typing', username);
    } else {
      socket.emit('stopTyping', username);
    }
  });

  socket.on('userNotification', ({ user, action }) => {
    if (user !== username) {
      showNotification(user, action === 'joined' ? 'entered' : 'exited');
    }
  });

  // Connect Start Chat Button
  document.getElementById("nameForm").addEventListener("submit", function(e) {
    e.preventDefault();
    startChat();
  });

  // Send message on Enter
  chatInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });
});
