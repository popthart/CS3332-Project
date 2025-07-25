const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const db = new sqlite3.Database(path.join(__dirname, 'main.db'));

db.serialize(() => {
    db.run(`
    CREATE TABLE IF NOT EXISTS Users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      displayName TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS Passwords (
      id INTEGER PRIMARY KEY,
      passHash TEXT NOT NULL,
      FOREIGN KEY(id) REFERENCES Users(id) ON DELETE CASCADE
    )
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS Messages (
      messageID INTEGER PRIMARY KEY AUTOINCREMENT,
      id INTEGER NOT NULL,
      messageText TEXT,
      messageAttachment BLOB,
      timeStamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(id) REFERENCES Users(id) ON DELETE CASCADE
    )
  `);

    // Create default admin
    const displayName = 'test';
    const email = 'test@test.com';
    const plainPassword = 'test';

    db.get(`SELECT COUNT(*) AS count FROM Users WHERE email = ?`, [email], async (err, row) => {
        if (err) return console.error('[initDb] Error checking admin:', err.message);

        if (row.count === 0) {
            try {
                const hashedPassword = await bcrypt.hash(plainPassword, 10);
                db.run(
                    `INSERT INTO Users (displayName, email) VALUES (?, ?)`,
                    [displayName, email],
                    function (err) {
                        if (err) return console.error('[initDb] Error inserting admin user:', err.message);

                        const userID = this.lastID;
                        db.run(
                            `INSERT INTO Passwords (userID, passHash) VALUES (?, ?)`,
                            [userID, hashedPassword],
                            err => {
                                if (err) console.error('[initDb] Error inserting admin password:', err.message);
                                else console.log('[initDb] Default admin user created.');
                            }
                        );
                    }
                );
            } catch (e) {
                console.error('[initDb] Password hashing failed:', e);
            }
        } else {
            console.log('[initDb] Default admin already exists.');
        }
    });
});

module.exports = db;