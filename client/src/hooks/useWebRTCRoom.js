import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../api/client';

const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

// Manages a full mesh of RTCPeerConnections for N participants in one room, plus
// chat, emoji reactions, and remote mute/camera/screen-share status indicators.
export function useWebRTCRoom({ roomId, token }) {
  const socketRef = useRef(null);
  const pcsRef = useRef(new Map()); // peerId -> RTCPeerConnection
  const localStreamRef = useRef(null);
  const cameraTrackRef = useRef(null); // original camera video track, kept for un-sharing screen

  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({}); // peerId -> MediaStream
  const [participants, setParticipants] = useState([]); // [{ peerId, name }]
  const [chatMessages, setChatMessages] = useState([]);
  const [reactions, setReactions] = useState([]); // transient floating reactions
  const [remoteMediaStatus, setRemoteMediaStatus] = useState({}); // peerId -> { audioEnabled, videoEnabled }
  const [screenSharingPeer, setScreenSharingPeer] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [status, setStatus] = useState('Requesting camera/mic access...');

  function createPeerConnection(peerId) {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcsRef.current.set(peerId, pc);

    localStreamRef.current.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('signal', {
          target: peerId,
          data: { type: 'ice-candidate', candidate: event.candidate },
        });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStreams((prev) => ({ ...prev, [peerId]: event.streams[0] }));
    };

    pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        setRemoteStreams((prev) => {
          const next = { ...prev };
          delete next[peerId];
          return next;
        });
      }
    };

    return pc;
  }

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (cancelled) return;
      localStreamRef.current = stream;
      cameraTrackRef.current = stream.getVideoTracks()[0];
      setLocalStream(stream);
      setStatus('Connecting...');

      const socket = io(API_URL, { auth: { token } });
      socketRef.current = socket;

      socket.on('connect', () => {
        setStatus('Waiting for others to join...');
        socket.emit('join-room', roomId);
      });

      socket.on('participants-update', ({ participants }) => setParticipants(participants));

      // Existing peer sees a new joiner: initiate the offer
      socket.on('user-joined', async ({ peerId }) => {
        const pc = createPeerConnection(peerId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('signal', { target: peerId, data: { type: 'offer', sdp: offer } });
        setStatus('Connected');
      });

      socket.on('signal', async ({ sender, data }) => {
        let pc = pcsRef.current.get(sender);
        if (!pc) pc = createPeerConnection(sender);

        if (data.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('signal', { target: sender, data: { type: 'answer', sdp: answer } });
          setStatus('Connected');
        } else if (data.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        } else if (data.type === 'ice-candidate') {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (err) {
            console.error('ICE candidate error', err);
          }
        }
      });

      socket.on('user-left', ({ peerId }) => {
        const pc = pcsRef.current.get(peerId);
        if (pc) {
          pc.close();
          pcsRef.current.delete(peerId);
        }
        setRemoteStreams((prev) => {
          const next = { ...prev };
          delete next[peerId];
          return next;
        });
        setRemoteMediaStatus((prev) => {
          const next = { ...prev };
          delete next[peerId];
          return next;
        });
        setScreenSharingPeer((prev) => (prev === peerId ? null : prev));
      });

      socket.on('chat-message', (msg) => setChatMessages((prev) => [...prev, msg]));

      socket.on('reaction', ({ sender, name, emoji }) => {
        const id = `${sender}-${Date.now()}-${Math.random()}`;
        setReactions((prev) => [...prev, { id, name, emoji }]);
        setTimeout(() => setReactions((prev) => prev.filter((r) => r.id !== id)), 3000);
      });

      socket.on('media-status', ({ peerId, audioEnabled, videoEnabled }) => {
        setRemoteMediaStatus((prev) => ({ ...prev, [peerId]: { audioEnabled, videoEnabled } }));
      });

      socket.on('screen-share-status', ({ peerId, sharing }) => {
        setScreenSharingPeer((prev) => (sharing ? peerId : prev === peerId ? null : prev));
      });
    }

    init().catch((err) => {
      console.error(err);
      setStatus(`Error: ${err.message}`);
    });

    return () => {
      cancelled = true;
      socketRef.current?.emit('leave-room');
      socketRef.current?.disconnect();
      pcsRef.current.forEach((pc) => pc.close());
      pcsRef.current.clear();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, token]);

  const sendChatMessage = useCallback(
    (text) => {
      socketRef.current?.emit('chat-message', { roomId, text });
    },
    [roomId],
  );

  const sendReaction = useCallback(
    (emoji) => {
      socketRef.current?.emit('reaction', { roomId, emoji });
    },
    [roomId],
  );

  const toggleAudio = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setAudioEnabled(track.enabled);
    socketRef.current?.emit('media-status', { roomId, audioEnabled: track.enabled, videoEnabled });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, videoEnabled]);

  const toggleVideo = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setVideoEnabled(track.enabled);
    socketRef.current?.emit('media-status', { roomId, audioEnabled, videoEnabled: track.enabled });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, audioEnabled]);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      // revert to camera on all peer connections
      const camTrack = cameraTrackRef.current;
      pcsRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender && camTrack) sender.replaceTrack(camTrack);
      });
      setLocalStream(localStreamRef.current);
      setIsScreenSharing(false);
      socketRef.current?.emit('screen-share-status', { roomId, sharing: false });
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];

      pcsRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(screenTrack);
      });

      // Show the screen-share track locally too
      const combined = new MediaStream([screenTrack, ...localStreamRef.current.getAudioTracks()]);
      setLocalStream(combined);
      setIsScreenSharing(true);
      socketRef.current?.emit('screen-share-status', { roomId, sharing: true });

      screenTrack.onended = () => toggleScreenShare();
    } catch (err) {
      console.error('Screen share failed or was cancelled', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScreenSharing, roomId]);

  return {
    localStream,
    remoteStreams,
    participants,
    chatMessages,
    reactions,
    remoteMediaStatus,
    screenSharingPeer,
    audioEnabled,
    videoEnabled,
    isScreenSharing,
    status,
    sendChatMessage,
    sendReaction,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    getRawLocalStream: () => localStreamRef.current,
  };
}
