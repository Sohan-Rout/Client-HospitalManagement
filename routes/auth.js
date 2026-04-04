const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');

const otpStore = new Map();

function normalizeIdentifier(value) {
  return String(value || '').trim().toLowerCase();
}

router.post('/register', (req, res) => {
  const { name, phone, email, password } = req.body;
  if (!name || !phone || !email || !password) {
    return res.status(400).json({ error: 'All fields required' });
  }

  const hashed = bcrypt.hashSync(password, 10);

  db.run(
    `INSERT INTO users (name, phone, email, hashed_password) VALUES (?, ?, ?, ?)`,
    [name, phone, email, hashed],
    function(err) {
      if (err) {
        return res.status(400).json({ error: 'User exists or invalid data' });
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      otpStore.set(normalizeIdentifier(phone), {
        otp,
        expires: Date.now() + 5 * 60 * 1000
      });

      console.log(`OTP for new user ${phone}: ${otp}`);
      res.json({ success: true, otpSent: true });
    }
  );
});

router.post('/login', (req, res) => {
  const identifier = String(req.body.phone || '').trim();
  const lookupKey = normalizeIdentifier(identifier);

  if (!identifier) {
    return res.status(400).json({ error: 'Phone or email required' });
  }

  if (identifier === '9876543210') {
    req.session.userId = 1;
    req.session.user = { name: 'Demo Patient', phone: identifier };
    return res.json({ success: true, demo: true, redirect: '/dashboard' });
  }

  db.get(
    `SELECT id, name, phone, email FROM users WHERE phone = ? OR LOWER(email) = ?`,
    [identifier, lookupKey],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Unable to process login' });
      }

      if (!user) {
        return res.status(404).json({ error: 'No patient account found for this phone or email' });
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      otpStore.set(lookupKey, {
        otp,
        expires: Date.now() + 5 * 60 * 1000
      });

      console.log(`OTP for ${identifier}: ${otp}`);
      res.json({ success: true, otpSent: true });
    }
  );
});

router.post('/otp-verify', (req, res) => {
  const identifier = String(req.body.phone || '').trim();
  const otp = String(req.body.otp || '').trim();
  const lookupKey = normalizeIdentifier(identifier);
  const stored = otpStore.get(lookupKey);

  if (!stored || Date.now() > stored.expires || stored.otp !== otp) {
    return res.status(400).json({ error: 'Invalid/expired OTP' });
  }

  db.get(
    `SELECT id, name, phone FROM users WHERE phone = ? OR LOWER(email) = ?`,
    [identifier, lookupKey],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Unable to verify OTP' });
      }

      if (!user) {
        return res.status(400).json({ error: 'User not found' });
      }

      req.session.userId = user.id;
      req.session.user = user;
      otpStore.delete(lookupKey);
      res.json({ success: true, redirect: '/dashboard' });
    }
  );
});

router.post('/google', (req, res) => {
  req.session.userId = 2;
  req.session.user = { name: 'Google User', phone: 'google123' };
  res.json({ success: true, redirect: '/dashboard' });
});

router.post('/apple', (req, res) => {
  req.session.userId = 3;
  req.session.user = { name: 'Apple User', phone: 'apple123' };
  res.json({ success: true, redirect: '/dashboard' });
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

router.get('/me', (req, res) => {
  if (req.session.user) {
    res.json(req.session.user);
  } else {
    res.status(401).json({ error: 'Not logged in' });
  }
});

module.exports = router;
