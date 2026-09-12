const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const COOKIE_NAME = 'nishkarsh_session';

function issueSession(res, user) {
  const token = jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    subscription_status: user.subscription_status,
  };
}

// --- Signup (students only — admins are invite-only, per CHANGE 6) ---
router.post('/signup', (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required.' });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email.' });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });

  const passwordHash = bcrypt.hashSync(password, 10);
  const info = db.prepare(
    `INSERT INTO users (name, email, password_hash, role, subscription_status)
     VALUES (?, ?, ?, 'student', 'free')`
  ).run(name.trim(), email.toLowerCase(), passwordHash);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  issueSession(res, user);
  res.status(201).json({ user: publicUser(user) });
});

// --- Login (students, admins, master admin — role resolved server-side) ---
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user || !user.password_hash) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  // Admin accounts must be active (they start 'pending' until the invite-link
  // first-login step, per CHANGE 6) — that first step is handled by
  // POST /api/auth/accept-invite, not this route.
  if (user.role !== 'student' && user.invite_status === 'pending') {
    return res.status(403).json({ error: 'This admin account is still pending setup. Use your invite link first.' });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  issueSession(res, user);
  res.json({ user: publicUser(user) });
});

// --- Current session check ---
router.get('/me', (req, res) => {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Not logged in.' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.id);
    if (!user) return res.status(401).json({ error: 'Not logged in.' });
    res.json({ user: publicUser(user) });
  } catch {
    res.status(401).json({ error: 'Session expired.' });
  }
});

// --- Logout ---
router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

module.exports = router;
