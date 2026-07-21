const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const db = require('../db');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');
const { sendMail } = require('../utils/mailer');

const router = express.Router();

function toPublicUser(u) {
  if (!u) return null;
  const { passwordHash, ...rest } = u;
  return rest;
}

function issueToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
    expiresIn: '7d',
  });
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const existing = db.get('users').find({ email: email.toLowerCase() }).value();
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const passwordHash = await bcrypt.hash(password, 10);
  // First registered user becomes admin for demo convenience; everyone after is a regular user.
  const isFirstUser = db.get('users').size().value() === 0;

  const user = {
    id: uuid(),
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: isFirstUser ? 'admin' : 'user',
    createdAt: new Date().toISOString(),
  };
  db.get('users').push(user).write();

  const token = issueToken(user);
  res.status(201).json({ token, user: toPublicUser(user) });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

  const user = db.get('users').find({ email: email.toLowerCase() }).value();
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const token = issueToken(user);
  res.json({ token, user: toPublicUser(user) });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  const user = db.get('users').find({ email: (email || '').toLowerCase() }).value();

  // Always respond 200 to avoid leaking which emails are registered.
  if (!user) return res.json({ message: 'If that email exists, a reset link has been sent.' });

  const token = uuid();
  const expiresAt = Date.now() + 1000 * 60 * 30; // 30 minutes
  db.get('resetTokens').push({ token, userId: user.id, expiresAt }).write();

  const resetLink = `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/reset-password?token=${token}`;
  await sendMail({
    to: user.email,
    subject: 'Reset your password',
    text: `Reset your password: ${resetLink} (expires in 30 minutes)`,
  });

  res.json({ message: 'If that email exists, a reset link has been sent.' });
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body || {};
  if (!token || !newPassword) return res.status(400).json({ error: 'token and newPassword are required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const record = db.get('resetTokens').find({ token }).value();
  if (!record || record.expiresAt < Date.now()) {
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  db.get('users').find({ id: record.userId }).assign({ passwordHash }).write();
  db.get('resetTokens').remove({ token }).write();

  res.json({ message: 'Password reset successfully' });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const user = db.get('users').find({ id: req.user.id }).value();
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: toPublicUser(user) });
});

// PUT /api/auth/me — update profile (name, and optionally password)
router.put('/me', requireAuth, async (req, res) => {
  const { name, password } = req.body || {};
  const updates = {};
  if (name) updates.name = name;
  if (password) {
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    updates.passwordHash = await bcrypt.hash(password, 10);
  }

  db.get('users').find({ id: req.user.id }).assign(updates).write();
  const user = db.get('users').find({ id: req.user.id }).value();
  res.json({ user: toPublicUser(user) });
});

module.exports = router;
