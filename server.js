const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bcrypt = require('bcrypt');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const db = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT
});

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));
app.use(express.json());

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});


db.query(`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    displayName TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
  )
`).catch(err => console.error('Error creating users table:', err));


app.post('/register', async (req, res) => {
  const { displayName, userEmail, password } = req.body;
  if (!displayName || !userEmail || !password) return res.sendStatus(400);

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO users (displayName, email, password) VALUES ($1, $2, $3)',
      [displayName, userEmail, hashedPassword]
    );
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).send('Email already in use or registration error');
  }
});


app.post('/login', async (req, res) => {
  const { screenName, password } = req.body;

  try {
    const result = await db.query(
      'SELECT password FROM users WHERE displayName = $1',
      [screenName]
    );

    const user = result.rows[0];
    if (!user) return res.sendStatus(401);

    const match = await bcrypt.compare(password, user.password);
    if (match) res.sendStatus(200);
    else res.sendStatus(401);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
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
