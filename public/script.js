let username = "";
const socket = io();

function startChat() {
    username = document.getElementById('username').value.trim();
    if (!username) return alert("Please enter your name");
    document.getElementById('welcome').style.display = 'none';
    document.getElementById('chatWindow').style.display = 'flex';
}

function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;

    socket.emit('chat message', { username, text }); // send to server
    input.value = "";
}

socket.on('chat message', ({ username, text }) => {
    const messages = document.getElementById('messages');
    const div = document.createElement('div');
    div.className = 'message';
    div.innerHTML = `<strong>${username}:</strong> ${text}`;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
});
