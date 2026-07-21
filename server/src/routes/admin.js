const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireAdmin);

function toPublicUser(u) {
  const { passwordHash, ...rest } = u;
  return rest;
}

// GET /api/admin/users
router.get('/users', (req, res) => {
  const users = db.get('users').value().map(toPublicUser);
  res.json({ users });
});

// PUT /api/admin/users/:id — deactivate/reactivate or change role
router.put('/users/:id', (req, res) => {
  const { status, role } = req.body || {};
  const updates = {};
  if (status) updates.status = status; // 'active' | 'deactivated'
  if (role) updates.role = role;

  const user = db.get('users').find({ id: req.params.id }).value();
  if (!user) return res.status(404).json({ error: 'User not found' });

  db.get('users').find({ id: req.params.id }).assign(updates).write();
  res.json({ user: toPublicUser(db.get('users').find({ id: req.params.id }).value()) });
});

// GET /api/admin/meetings — meeting monitoring (all meetings across all hosts)
router.get('/meetings', (req, res) => {
  const meetings = db.get('meetings').sortBy('createdAt').reverse().value();
  res.json({ meetings });
});

// GET /api/admin/reports — basic analytics dashboard
router.get('/reports', (req, res) => {
  const users = db.get('users').value();
  const meetings = db.get('meetings').value();
  const recordings = db.get('recordings').value();

  const liveMeetings = meetings.filter((m) => m.status === 'live').length;
  const scheduledMeetings = meetings.filter((m) => m.status === 'scheduled').length;
  const endedMeetings = meetings.filter((m) => m.status === 'ended').length;

  res.json({
    totals: {
      users: users.length,
      meetings: meetings.length,
      recordings: recordings.length,
    },
    meetingsByStatus: {
      live: liveMeetings,
      scheduled: scheduledMeetings,
      ended: endedMeetings,
    },
    meetingsByType: {
      instant: meetings.filter((m) => m.type === 'instant').length,
      scheduled: meetings.filter((m) => m.type === 'scheduled').length,
    },
  });
});

module.exports = router;
