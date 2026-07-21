require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const meetingRoutes = require('./routes/meetings');
const recordingRoutes = require('./routes/recordings');
const fileRoutes = require('./routes/files');
const adminRoutes = require('./routes/admin');
const meetingSocket = require('./sockets/meetingSocket');

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/recordings', recordingRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/admin', adminRoutes);

// Static access to uploaded recordings/files (playback/download also served via routes above)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] } });
meetingSocket.attach(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
