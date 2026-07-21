import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { useWebRTCRoom } from '../hooks/useWebRTCRoom';
import VideoTile from '../components/VideoTile';
import { colors } from '../styles';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '👏', '😮', '🎉'];

export default function MeetingRoom() {
  const { roomId } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState(null);
  const [meetingError, setMeetingError] = useState('');
  const [viewMode, setViewMode] = useState('gallery'); // gallery | speaker
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [panel, setPanel] = useState(null); // null | 'chat' | 'files'
  const [chatInput, setChatInput] = useState('');
  const [files, setFiles] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioDevices, setAudioDevices] = useState([]);

  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const rtc = useWebRTCRoom({ roomId, token });

  useEffect(() => {
    api
      .getMeeting(roomId, token)
      .then(({ meeting }) => setMeeting(meeting))
      .catch((err) => setMeetingError(err.message));
  }, [roomId, token]);

  useEffect(() => {
    if (panel === 'files') {
      api.meetingFiles(roomId, token).then(({ files }) => setFiles(files)).catch(() => {});
    }
  }, [panel, roomId, token]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [rtc.chatMessages]);

  useEffect(() => {
    navigator.mediaDevices
      ?.enumerateDevices()
      .then((devices) => setAudioDevices(devices.filter((d) => d.kind === 'audioinput')));
  }, []);

  const remoteIds = Object.keys(rtc.remoteStreams);
  const isHost = meeting && user && meeting.hostId === user.id;

  function handleSendChat(e) {
    e.preventDefault();
    if (!chatInput.trim()) return;
    rtc.sendChatMessage(chatInput.trim());
    setChatInput('');
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.uploadFile(roomId, formData, token);
      const { files } = await api.meetingFiles(roomId, token);
      setFiles(files);
    } catch (err) {
      console.error(err);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function toggleRecording() {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }
    const stream = rtc.getRawLocalStream();
    if (!stream) return;

    recordedChunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };
    recorder.onstop = async () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const formData = new FormData();
      formData.append('recording', blob, 'recording.webm');
      try {
        await api.uploadRecording(roomId, formData, token);
      } catch (err) {
        console.error('Recording upload failed', err);
      }
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  }

  async function handleLeave() {
    navigate('/dashboard');
  }

  async function handleEndMeeting() {
    try {
      await api.endMeeting(roomId, token);
    } catch (err) {
      console.error(err);
    }
    navigate('/dashboard');
  }

  const allTiles = [
    { peerId: 'local', name: `${user?.name || 'You'} (You)`, stream: rtc.localStream, isLocal: true },
    ...remoteIds.map((peerId) => {
      const p = rtc.participants.find((x) => x.peerId === peerId);
      return { peerId, name: p?.name || 'Participant', stream: rtc.remoteStreams[peerId], isLocal: false };
    }),
  ];

  const speakerTile =
    viewMode === 'speaker'
      ? allTiles.find((t) => t.peerId === activeSpeaker) || allTiles.find((t) => !t.isLocal) || allTiles[0]
      : null;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <div style={styles.title}>{meeting?.title || 'Meeting'}</div>
          <div style={styles.subtitle}>
            Room: {roomId} · {rtc.status}
            {meetingError && <span style={{ color: colors.red }}> · {meetingError}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            style={viewMode === 'gallery' ? styles.toggleActive : styles.toggleBtn}
            onClick={() => setViewMode('gallery')}
          >
            Gallery
          </button>
          <button
            style={viewMode === 'speaker' ? styles.toggleActive : styles.toggleBtn}
            onClick={() => setViewMode('speaker')}
          >
            Speaker
          </button>
        </div>
      </header>

      <div style={styles.body}>
        <div style={styles.videoArea}>
          {viewMode === 'gallery' ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${Math.min(allTiles.length, 3) || 1}, 1fr)`,
                gap: 12,
              }}
            >
              {allTiles.map((t) => (
                <div key={t.peerId} onClick={() => setActiveSpeaker(t.peerId)} style={{ cursor: 'pointer' }}>
                  <VideoTile
                    stream={t.stream}
                    label={t.name}
                    muted={t.isLocal}
                    videoOff={t.isLocal ? !rtc.videoEnabled : rtc.remoteMediaStatus[t.peerId]?.videoEnabled === false}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: 12 }}>
                <VideoTile
                  stream={speakerTile?.stream}
                  label={speakerTile?.name || ''}
                  muted={speakerTile?.isLocal}
                  videoOff={
                    speakerTile?.isLocal
                      ? !rtc.videoEnabled
                      : rtc.remoteMediaStatus[speakerTile?.peerId]?.videoEnabled === false
                  }
                />
              </div>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
                {allTiles
                  .filter((t) => t.peerId !== speakerTile?.peerId)
                  .map((t) => (
                    <div key={t.peerId} onClick={() => setActiveSpeaker(t.peerId)} style={{ width: 160, flexShrink: 0, cursor: 'pointer' }}>
                      <VideoTile
                        stream={t.stream}
                        label={t.name}
                        muted={t.isLocal}
                        videoOff={t.isLocal ? !rtc.videoEnabled : rtc.remoteMediaStatus[t.peerId]?.videoEnabled === false}
                        small
                      />
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Floating emoji reactions */}
          <div style={styles.reactionsOverlay}>
            {rtc.reactions.map((r) => (
              <div key={r.id} style={styles.floatingReaction}>
                {r.emoji}
              </div>
            ))}
          </div>
        </div>

        {panel && (
          <div style={styles.sidePanel}>
            {panel === 'chat' && (
              <>
                <div style={styles.panelHeader}>Chat</div>
                <div style={styles.chatMessages}>
                  {rtc.chatMessages.map((m, i) => (
                    <div key={i} style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 12, color: colors.muted }}>{m.name}</div>
                      <div style={{ fontSize: 14 }}>{m.text}</div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <form onSubmit={handleSendChat} style={styles.chatInputRow}>
                  <input
                    style={styles.chatInput}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Message everyone..."
                  />
                  <button style={styles.sendBtn} type="submit">Send</button>
                </form>
              </>
            )}

            {panel === 'files' && (
              <>
                <div style={styles.panelHeader}>Shared files</div>
                <div style={{ padding: 12, flex: 1, overflowY: 'auto' }}>
                  {files.map((f) => (
                    <div key={f.id} style={styles.fileRow}>
                      <span style={{ fontSize: 13 }}>{f.originalName}</span>
                      <a
                        href={`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/files/${f.id}/download`}
                        style={styles.downloadLink}
                      >
                        Download
                      </a>
                    </div>
                  ))}
                  {files.length === 0 && <div style={{ fontSize: 13, color: colors.muted }}>No files shared yet.</div>}
                </div>
                <div style={{ padding: 12, borderTop: `1px solid ${colors.border}` }}>
                  <input ref={fileInputRef} type="file" onChange={handleFileUpload} style={{ fontSize: 12 }} />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <footer style={styles.controls}>
        <div style={{ display: 'flex', gap: 10 }}>
          <ControlButton active={rtc.audioEnabled} onClick={rtc.toggleAudio} label={rtc.audioEnabled ? 'Mute' : 'Unmute'} />
          <ControlButton active={rtc.videoEnabled} onClick={rtc.toggleVideo} label={rtc.videoEnabled ? 'Camera Off' : 'Camera On'} />
          <ControlButton active={rtc.isScreenSharing} onClick={rtc.toggleScreenShare} label={rtc.isScreenSharing ? 'Stop Share' : 'Share Screen'} />
          <ControlButton active={isRecording} onClick={toggleRecording} label={isRecording ? 'Stop Recording' : 'Record'} danger={isRecording} />

          {audioDevices.length > 1 && (
            <select
              style={styles.deviceSelect}
              onChange={(e) => console.log('Selected mic (demo):', e.target.value)}
              defaultValue=""
            >
              <option value="" disabled>Mic...</option>
              {audioDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || 'Microphone'}
                </option>
              ))}
            </select>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {REACTION_EMOJIS.map((emoji) => (
            <button key={emoji} style={styles.emojiBtn} onClick={() => rtc.sendReaction(emoji)}>
              {emoji}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button style={panel === 'chat' ? styles.toggleActive : styles.toggleBtn} onClick={() => setPanel(panel === 'chat' ? null : 'chat')}>
            Chat
          </button>
          <button style={panel === 'files' ? styles.toggleActive : styles.toggleBtn} onClick={() => setPanel(panel === 'files' ? null : 'files')}>
            Files
          </button>
          <button style={styles.leaveBtn} onClick={handleLeave}>Leave</button>
          {isHost && <button style={styles.endBtn} onClick={handleEndMeeting}>End for all</button>}
        </div>
      </footer>
    </div>
  );
}

function ControlButton({ active, onClick, label, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '9px 14px',
        borderRadius: 8,
        border: `1px solid ${colors.border}`,
        background: danger ? colors.redSoft : active ? colors.panelRaised : '#1C1512',
        color: danger ? colors.red : colors.text,
        fontSize: 13,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: colors.bg, color: colors.text },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 20px',
    borderBottom: `1px solid ${colors.border}`,
  },
  title: { fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 600 },
  subtitle: { fontSize: 12, color: colors.muted, marginTop: 2 },
  toggleBtn: {
    padding: '7px 12px',
    borderRadius: 8,
    border: `1px solid ${colors.border}`,
    background: 'transparent',
    color: colors.text,
    fontSize: 12,
    cursor: 'pointer',
  },
  toggleActive: {
    padding: '7px 12px',
    borderRadius: 8,
    border: `1px solid ${colors.accent}`,
    background: colors.accent,
    color: '#231A0F',
    fontSize: 12,
    cursor: 'pointer',
  },
  body: { flex: 1, display: 'flex', overflow: 'hidden' },
  videoArea: { flex: 1, padding: 16, overflowY: 'auto', position: 'relative' },
  sidePanel: {
    width: 300,
    borderLeft: `1px solid ${colors.border}`,
    display: 'flex',
    flexDirection: 'column',
  },
  panelHeader: { padding: 14, fontWeight: 600, fontSize: 14, borderBottom: `1px solid ${colors.border}` },
  chatMessages: { flex: 1, overflowY: 'auto', padding: 12 },
  chatInputRow: { display: 'flex', gap: 8, padding: 12, borderTop: `1px solid ${colors.border}` },
  chatInput: {
    flex: 1,
    padding: '8px 10px',
    borderRadius: 8,
    border: `1px solid ${colors.border}`,
    background: '#1C1512',
    color: colors.text,
    fontSize: 13,
  },
  sendBtn: {
    padding: '8px 14px',
    borderRadius: 8,
    border: 'none',
    background: colors.accent,
    color: '#231A0F',
    fontSize: 13,
    cursor: 'pointer',
  },
  fileRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: `1px solid ${colors.border}`,
  },
  downloadLink: { fontSize: 12, color: colors.accent, textDecoration: 'none' },
  controls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 20px',
    borderTop: `1px solid ${colors.border}`,
    flexWrap: 'wrap',
    gap: 12,
  },
  emojiBtn: {
    padding: '6px 10px',
    borderRadius: 8,
    border: `1px solid ${colors.border}`,
    background: 'transparent',
    fontSize: 16,
    cursor: 'pointer',
  },
  leaveBtn: {
    padding: '9px 16px',
    borderRadius: 8,
    border: 'none',
    background: colors.redSoft,
    color: colors.red,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  endBtn: {
    padding: '9px 16px',
    borderRadius: 8,
    border: `1px solid ${colors.red}`,
    background: 'transparent',
    color: colors.red,
    fontSize: 13,
    cursor: 'pointer',
  },
  deviceSelect: {
    padding: '8px 10px',
    borderRadius: 8,
    border: `1px solid ${colors.border}`,
    background: '#1C1512',
    color: colors.text,
    fontSize: 12,
  },
  reactionsOverlay: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 6,
    pointerEvents: 'none',
  },
  floatingReaction: {
    fontSize: 28,
    animation: 'none',
  },
};
