const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'users.db'));

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    displayName TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
  )
`);

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

app.post('/register', async (req, res) => {
  const { displayName, userEmail, password } = req.body;
  if (!displayName || !userEmail || !password) return res.sendStatus(400);

  const hashedPassword = await bcrypt.hash(password, 10);

  const sql = `INSERT INTO users (displayName, email, password) VALUES (?, ?, ?)`;
  db.run(sql, [displayName, userEmail, hashedPassword], err => {
    if (err) {
      console.error(err.message);
      return res.status(500).send('Email already in use');
    }
    res.sendStatus(200);
  });
});

app.post('/login', (req, res) => {
  const { screenName, password } = req.body;
  const sql = `SELECT password FROM users WHERE displayName = ?`;

  db.get(sql, [screenName], async (err, row) => {
    if (err || !row) return res.sendStatus(401);
    const match = await bcrypt.compare(password, row.password);
    if (match) res.sendStatus(200);
    else res.sendStatus(401);
  });
});

io.on('connection', socket => {
  socket.on('setScreenName', name => {
    socket.screenName = name;
  });

socket.on('chatMessage', msg => {
    io.emit('chatMessage', { name: socket.screenName, msg });
  });
});
