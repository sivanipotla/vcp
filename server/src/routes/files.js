const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuid } = require('uuid');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads', 'files'),
  filename: (req, file, cb) => cb(null, `${uuid()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB cap

// POST /api/files/:roomId — in-meeting file sharing
router.post('/:roomId', requireAuth, upload.single('file'), (req, res) => {
  const meeting = db.get('meetings').find({ roomId: req.params.roomId }).value();
  if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const record = {
    id: uuid(),
    meetingId: meeting.id,
    roomId: meeting.roomId,
    userId: req.user.id,
    filename: req.file.filename,
    originalName: req.file.originalname,
    createdAt: new Date().toISOString(),
  };
  db.get('files').push(record).write();
  res.status(201).json({ file: record });
});

// GET /api/files/meeting/:roomId — list shared files for a meeting
router.get('/meeting/:roomId', requireAuth, (req, res) => {
  const files = db.get('files').filter({ roomId: req.params.roomId }).value();
  res.json({ files });
});

// GET /api/files/:id/download
router.get('/:id/download', (req, res) => {
  const record = db.get('files').find({ id: req.params.id }).value();
  if (!record) return res.status(404).json({ error: 'File not found' });
  const filePath = path.join(__dirname, '..', '..', 'uploads', 'files', record.filename);
  res.download(filePath, record.originalName);
});

module.exports = router;
