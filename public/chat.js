const socket = io();

const screenName = localStorage.getItem('screenName') || prompt("Enter your name:");
socket.emit('setScreenName', screenName);

document.getElementById('sendBtn').addEventListener('click', () => {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  if (message) {
    socket.emit('chatMessage', message);
    input.value = '';
  }
});

socket.on('chatMessage', ({ name, msg }) => {
  const chatBox = document.getElementById('chatBox');
  const msgDiv = document.createElement('div');
  msgDiv.textContent = `${name}: ${msg}`;
  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight; 
});
