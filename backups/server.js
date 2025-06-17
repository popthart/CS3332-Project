//AD: Init supporting libraries
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();     //AD: SQLite DB -> chatLog.db
const path = require('path');
const fs = require('fs');                   //AD: To load DB schema.sql
require('dotenv').config();

//AD: Init server
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 3000;

// DB and Schema path
const DB_PATH = path.join(__dirname, 'chatLog.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

//AD: Init DB; Moved DB creation text out of server.js for modularity
let db;

//AD: Check for existing DB by const DB_PATH; if none, create new DB based on schema.sql
if (!fs.existsSync(DB_PATH)) {
  console.log('ISSUE: DB not found, creating new...');
  db = new sqlite3.Database(DB_PATH, async err => {
    if (err) return console.error('ERROR: DB creation failed: ', err.message);

    const schemaSQL = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    db.exec(schemaSQL, async err => {
      if (err) {
        console.error('ERROR: Schema init failed: ', err.message);
        process.exit(1);
      }
      console.log('New DB created from schema.');

      //AD: Admin Backdoor (for testing)
      //TODO: Remove backdoor
      const adminName = 'admin';
      const adminEmail = 'admin@example.com';
      const adminPassword = 'AdRcEs3332';

      try {
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        db.serialize(() => {
          db.run("BEGIN TRANSACTION");

          const insertAdminSQL = `
          INSERT INTO User (displayName, email)
          VALUES (?, ?)
        `;

          db.run(insertAdminSQL, [adminName, adminEmail], function (err) {
            if (err) {
              db.run("ROLLBACK");
              return console.error('ERROR: Admin insert failed:', err.message);
            }

            const adminID = this.lastID;

            const insertPassSQL = `
            INSERT INTO Pass (userID, passHash)
            VALUES (?, ?)
          `;

            db.run(insertPassSQL, [adminID, hashedPassword], (err) => {
              if (err) {
                db.run("ROLLBACK");
                return console.error('ERROR: Admin password insert failed:', err.message);
              }

              db.run("COMMIT");
              console.log('Master admin user created');
            });
          });
        });
      } catch (err) {
        console.error('ERROR: Admin creation:', err.message);
      }
    });
  });

//AD: Else, attempt to connect with exiting DB
} else {
  db = new sqlite3.Database(DB_PATH, err => {
    if (err) {
      console.error('ERROR: DB connection failed: ', err.message);
      process.exit(1);
    }
    console.log('Connected to existing DB.');
  });
}

app.use(express.static('public'));
app.use(express.json());


//Registration functionality
app.post('/register', async (req, res) => {
  const {displayName, userEmail, password} = req.body;
  if (!displayName || !userEmail || !password) return res.status(400);

  //AD: Try/Catch framework to input values
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    //AD: Serialize inputs to prevent out-of-order issues with DB
    //AD: Since Password Hashes are on separate table, multi-line disallowed by DB
    // (SQL injection protection)
    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      //AD: Try User table first, userID is autoincrement, ROLLBACK on fail
      //AD: Prevents password with null userID in Pass table
      const insertUserSQL = `INSERT INTO User (displayName, email)
                             VALUES (?, ?)`;
      db.run(insertUserSQL, [displayName, userEmail], function (err) {
        if (err) {
          db.run("ROLLBACK");
          console.error('Insert User failed:', err.message);
          return res.status(500).send('Display name or email already in use');
        }

        const userID = this.lastID;

        //AD: Try Pass table, ROLLBACK on fail
        const insertPassSQL = `INSERT INTO Pass (userID, passHash)
                               VALUES (?, ?)`;
        db.run(insertPassSQL, [userID, hashedPassword], (err) => {
          if (err) {
            db.run("ROLLBACK");
            console.error('Insert Password failed:', err.message);
            return res.status(500).send('Password save error');
          }

          db.run("COMMIT");
          res.status(200).send('User registered'); //AD: Success
        });
      });
    });
    //AD: Catchall error
  } catch (err) {
    console.error('Registration error: ', err.message);
    res.sendStatus(500);
  }
});

//Login Functionality
app.post('/login', async (req, res) => {
  const {screenName, password} = req.body;
  if (!screenName || !password) return res.status(400);

  const findUserSQL = '' +
      'SELECT u.userID, p.passHash' +
      'FROM User u' +
      'JOIN Pass p ON u.userID = p.userID' +
      'WHERE u.displayName = ?';

  db.get(findUserSQL, [screenName], async (err, row) =>{
    if (err || row) return res.sendStatus(401);

    const match = await bcrypt.compare(password, row.passHash);
    if (match) res.sendStatus(200);
    else res.sendStatus(401);
  });
});

//Socket.IO Functionality

//AD: Get-User helper function
function getUserIdByDisplayName(displayName, callback) {
  const sql = `SELECT userID FROM User WHERE displayName = ?`;
  db.get(sql, [displayName], (err, row) => {
    if (err) return callback(err);
    if (!row) return callback(new Error('User not found'));
    callback(null, row.userID);
  });
}

io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('chatMessage', msg => {
    const screenName = socket.screenName || 'Anonymous';

    getUserIdByDisplayName(screenName, (err, userID) => {
      if (err) {
        console.error('Message not saved (user lookup failed):', err.message);
        return; // skip saving but still broadcast
      }

      const insertMessageSQL = `
        INSERT INTO Message (userID, messageText, messageAttachment)
        VALUES (?, ?, NULL)
      `;

      db.run(insertMessageSQL, [userID, msg], err => {
        if (err) {
          console.error('Failed to insert message:', err.message);
        } else {
          console.log(`Message saved for user ${screenName}`);
        }
      });
    });

    //Broadcast
    io.emit('chatMessage', {name: screenName, msg});
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});