const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuid } = require('uuid');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads', 'recordings'),
  filename: (req, file, cb) => cb(null, `${uuid()}.webm`),
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } }); // 500MB cap

// POST /api/recordings/:meetingRoomId — client uploads its local MediaRecorder blob
// (MVP simplification: this stores each participant's own recording, not a server-composited
// multi-party recording. A production "cloud recording" pipeline would use an SFU + ffmpeg.)
router.post('/:roomId', requireAuth, upload.single('recording'), (req, res) => {
  const meeting = db.get('meetings').find({ roomId: req.params.roomId }).value();
  if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
  if (!req.file) return res.status(400).json({ error: 'No recording file uploaded' });

  const recording = {
    id: uuid(),
    meetingId: meeting.id,
    roomId: meeting.roomId,
    userId: req.user.id,
    filename: req.file.filename,
    createdAt: new Date().toISOString(),
  };
  db.get('recordings').push(recording).write();
  res.status(201).json({ recording });
});

// GET /api/recordings/meeting/:roomId — list recordings for a meeting
router.get('/meeting/:roomId', requireAuth, (req, res) => {
  const recordings = db.get('recordings').filter({ roomId: req.params.roomId }).value();
  res.json({ recordings });
});

// GET /api/recordings/:id/play — stream recording for playback
router.get('/:id/play', (req, res) => {
  const recording = db.get('recordings').find({ id: req.params.id }).value();
  if (!recording) return res.status(404).json({ error: 'Recording not found' });
  const filePath = path.join(__dirname, '..', '..', 'uploads', 'recordings', recording.filename);
  res.sendFile(filePath);
});

module.exports = router;
