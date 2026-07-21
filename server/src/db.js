// Lightweight JSON-file datastore (swap-in point for PostgreSQL/Prisma in production).
const path = require('path');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const dbFile = path.join(__dirname, 'data', 'db.json');
const adapter = new FileSync(dbFile);
const db = low(adapter);

db.defaults({
  users: [],       // { id, name, email, passwordHash, role, createdAt }
  meetings: [],     // { id, roomId, hostId, title, type, scheduledAt, invitees[], status, createdAt }
  recordings: [],   // { id, meetingId, userId, filename, createdAt }
  files: [],        // { id, meetingId, userId, filename, originalName, createdAt }
  resetTokens: [],  // { token, userId, expiresAt }
}).write();

module.exports = db;
