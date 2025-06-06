const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));
app.use(express.json());

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

const SHARED_PASSWORD = process.env.SHARED_PASSWORD;

app.post('/login', (req, res) => {
  const { screenName, password } = req.body;
  if (password === SHARED_PASSWORD && screenName) {
    res.sendStatus(200);
  } else {
    res.sendStatus(401);
  }
});

io.on('connection', socket => {
  socket.on('setScreenName', name => {
    socket.screenName = name;
  });

socket.on('chatMessage', msg => {
    io.emit('chatMessage', { name: socket.screenName, msg });
  });
});

