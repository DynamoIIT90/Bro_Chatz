// script.js
let username = "";

function startChat() {
  username = document.getElementById('username').value;
  if (!username.trim()) return alert("Please enter your name");
  document.getElementById('welcome').style.display = 'none';
  document.getElementById('chatWindow').style.display = 'flex';
}

function sendMessage() {
  const input = document.getElementById("chatInput");
  const text = input.value.trim();
  if (text === "") return;

  const messages = document.getElementById("messages");
  const div = document.createElement("div");
  div.className = "message";
  div.innerHTML = `<strong>${username}:</strong> ${text}
    <div class="message-actions">
      <button onclick="this.parentElement.parentElement.remove()">Delete</button>
    </div>`;
  messages.appendChild(div);
  input.value = "";
  messages.scrollTop = messages.scrollHeight;
}
