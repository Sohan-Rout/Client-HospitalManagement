const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'db.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    phone TEXT UNIQUE,
    email TEXT UNIQUE,
    hashed_password TEXT,
    role TEXT DEFAULT 'patient',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Insert demo user if not exists
  const demoPhone = '9876543210';
  const demoHash = bcrypt.hashSync('demo123', 10);
  
  db.run(`INSERT OR IGNORE INTO users (phone, hashed_password, name, role) 
          VALUES (?, ?, 'Demo Patient', 'patient')`, 
         [demoPhone, demoHash], (err) => {
    if (!err) console.log('Demo user ready');
  });
});

// Keep DB open
console.log('SQLite DB ready at', dbPath);

module.exports = db;
