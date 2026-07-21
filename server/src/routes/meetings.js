const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { sendMail } = require('../utils/mailer');

const router = express.Router();

function shortRoomId() {
  return uuid().split('-')[0]; // short shareable code, e.g. "a1b2c3d4"
}

// POST /api/meetings/instant — create + start immediately
router.post('/instant', requireAuth, (req, res) => {
  const { title } = req.body || {};
  const meeting = {
    id: uuid(),
    roomId: shortRoomId(),
    hostId: req.user.id,
    title: title || 'Instant Meeting',
    type: 'instant',
    scheduledAt: new Date().toISOString(),
    invitees: [],
    status: 'live',
    createdAt: new Date().toISOString(),
  };
  db.get('meetings').push(meeting).write();
  res.status(201).json({ meeting });
});

// POST /api/meetings/schedule — create for a future time, optionally email invitees
router.post('/schedule', requireAuth, async (req, res) => {
  const { title, scheduledAt, invitees } = req.body || {};
  if (!title || !scheduledAt) return res.status(400).json({ error: 'title and scheduledAt are required' });

  const meeting = {
    id: uuid(),
    roomId: shortRoomId(),
    hostId: req.user.id,
    title,
    type: 'scheduled',
    scheduledAt,
    invitees: Array.isArray(invitees) ? invitees : [],
    status: 'scheduled',
    createdAt: new Date().toISOString(),
  };
  db.get('meetings').push(meeting).write();

  const joinLink = `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/meeting/${meeting.roomId}`;
  for (const email of meeting.invitees) {
    await sendMail({
      to: email,
      subject: `Meeting invitation: ${title}`,
      text: `You're invited to "${title}" at ${scheduledAt}.\nJoin link: ${joinLink}`,
    });
  }

  res.status(201).json({ meeting });
});

// GET /api/meetings/mine — meetings I host, upcoming + past
router.get('/mine', requireAuth, (req, res) => {
  const meetings = db.get('meetings').filter({ hostId: req.user.id }).sortBy('scheduledAt').reverse().value();
  res.json({ meetings });
});

// GET /api/meetings/:roomId — lookup for "join via link"
router.get('/:roomId', requireAuth, (req, res) => {
  const meeting = db.get('meetings').find({ roomId: req.params.roomId }).value();
  if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
  res.json({ meeting });
});

// POST /api/meetings/:roomId/end — host ends the meeting
router.post('/:roomId/end', requireAuth, (req, res) => {
  const meeting = db.get('meetings').find({ roomId: req.params.roomId }).value();
  if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
  if (meeting.hostId !== req.user.id) return res.status(403).json({ error: 'Only the host can end this meeting' });

  db.get('meetings').find({ roomId: req.params.roomId }).assign({ status: 'ended' }).write();
  res.json({ message: 'Meeting ended' });
});

module.exports = router;
