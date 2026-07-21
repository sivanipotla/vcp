const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const db = require('../db');

// roomId -> Map<socketId, { userId, name }>
const rooms = new Map();

function attach(io) {
  // Authenticate socket connections with the same JWT used for REST calls
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      socket.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[socket:connect] ${socket.id} (${socket.user.email})`);

    socket.on('join-room', (roomId) => {
      socket.join(roomId);
      socket.data.roomId = roomId;

      if (!rooms.has(roomId)) rooms.set(roomId, new Map());
      const peers = rooms.get(roomId);

      // Notify existing peers of the new participant (mesh: each existing peer will
      // initiate a connection *to* the new joiner)
      peers.forEach((info, peerId) => {
        io.to(peerId).emit('user-joined', {
          peerId: socket.id,
          name: socket.user.email,
        });
      });

      peers.set(socket.id, { userId: socket.user.id, name: socket.user.email });

      const participants = Array.from(peers.entries()).map(([id, info]) => ({
        peerId: id,
        name: info.name,
      }));
      io.to(roomId).emit('participants-update', { participants });

      console.log(`[join-room] ${socket.id} -> ${roomId} (${peers.size} peers)`);
    });

    // Relay SDP offers/answers/ICE candidates to a specific peer (mesh signaling)
    socket.on('signal', ({ target, data }) => {
      if (!target || !data) return;
      io.to(target).emit('signal', { sender: socket.id, data });
    });

    // In-meeting chat
    socket.on('chat-message', ({ roomId, text }) => {
      if (!roomId || !text) return;
      io.to(roomId).emit('chat-message', {
        sender: socket.id,
        name: socket.user.email,
        text,
        at: new Date().toISOString(),
      });
    });

    // Emoji reactions
    socket.on('reaction', ({ roomId, emoji }) => {
      if (!roomId || !emoji) return;
      io.to(roomId).emit('reaction', { sender: socket.id, name: socket.user.email, emoji });
    });

    // Screen-share status broadcast (actual media renegotiated peer-to-peer via 'signal')
    socket.on('screen-share-status', ({ roomId, sharing }) => {
      if (!roomId) return;
      socket.to(roomId).emit('screen-share-status', { peerId: socket.id, sharing: !!sharing });
    });

    // Mute/camera status broadcast (for UI indicators on remote tiles)
    socket.on('media-status', ({ roomId, audioEnabled, videoEnabled }) => {
      if (!roomId) return;
      socket.to(roomId).emit('media-status', { peerId: socket.id, audioEnabled, videoEnabled });
    });

    function leaveRoom() {
      const roomId = socket.data.roomId;
      if (!roomId || !rooms.has(roomId)) return;
      const peers = rooms.get(roomId);
      peers.delete(socket.id);

      io.to(roomId).emit('user-left', { peerId: socket.id });

      const participants = Array.from(peers.entries()).map(([id, info]) => ({
        peerId: id,
        name: info.name,
      }));
      io.to(roomId).emit('participants-update', { participants });

      if (peers.size === 0) rooms.delete(roomId);
    }

    socket.on('leave-room', leaveRoom);

    socket.on('disconnect', () => {
      leaveRoom();
      console.log(`[socket:disconnect] ${socket.id}`);
    });
  });
}

module.exports = { attach };
