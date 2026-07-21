import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import Navbar from '../components/Navbar';
import { layout as s, colors } from '../styles';

export default function Dashboard() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [meetings, setMeetings] = useState([]);
  const [error, setError] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleAt, setScheduleAt] = useState('');
  const [invitees, setInvitees] = useState('');
  const [busy, setBusy] = useState(false);

  async function loadMeetings() {
    try {
      const { meetings } = await api.myMeetings(token);
      setMeetings(meetings);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadMeetings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startInstant() {
    setBusy(true);
    setError('');
    try {
      const { meeting } = await api.createInstantMeeting({ title: 'Instant Meeting' }, token);
      navigate(`/meeting/${meeting.roomId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSchedule(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const inviteeList = invitees
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await api.scheduleMeeting(
        { title: scheduleTitle, scheduledAt: scheduleAt, invitees: inviteeList },
        token,
      );
      setScheduleTitle('');
      setScheduleAt('');
      setInvitees('');
      await loadMeetings();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function handleJoin(e) {
    e.preventDefault();
    if (joinCode.trim()) navigate(`/meeting/${joinCode.trim()}`);
  }

  return (
    <div style={s.page}>
      <Navbar />
      <div style={s.content}>
        {error && (
          <div style={{ ...s.card, marginBottom: 16, color: colors.red, borderColor: colors.red }}>{error}</div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div style={s.card}>
            <h2 style={s.sectionTitle}>Start a meeting</h2>
            <button style={s.button} onClick={startInstant} disabled={busy}>
              + New instant meeting
            </button>

            <form onSubmit={handleJoin} style={{ marginTop: 20 }}>
              <label style={{ fontSize: 13, color: colors.muted, display: 'block', marginBottom: 6 }}>
                Join via link / code
              </label>
              <input
                style={s.input}
                placeholder="Room code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
              />
              <button style={s.buttonGhost} type="submit">Join meeting</button>
            </form>
          </div>

          <div style={s.card}>
            <h2 style={s.sectionTitle}>Schedule a meeting</h2>
            <form onSubmit={handleSchedule}>
              <input
                style={s.input}
                placeholder="Meeting title"
                value={scheduleTitle}
                onChange={(e) => setScheduleTitle(e.target.value)}
                required
              />
              <input
                style={s.input}
                type="datetime-local"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
                required
              />
              <input
                style={s.input}
                placeholder="Invitee emails, comma separated"
                value={invitees}
                onChange={(e) => setInvitees(e.target.value)}
              />
              <button style={s.button} type="submit" disabled={busy}>
                Schedule
              </button>
            </form>
          </div>
        </div>

        <div style={s.card}>
          <h2 style={s.sectionTitle}>Your meetings</h2>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Title</th>
                <th style={s.th}>When</th>
                <th style={s.th}>Type</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Room code</th>
                <th style={s.th}></th>
              </tr>
            </thead>
            <tbody>
              {meetings.map((m) => (
                <tr key={m.id}>
                  <td style={s.td}>{m.title}</td>
                  <td style={s.td}>{new Date(m.scheduledAt).toLocaleString()}</td>
                  <td style={s.td}>{m.type}</td>
                  <td style={s.td}>
                    <span
                      style={s.badge(
                        m.status === 'live' ? colors.greenSoft : m.status === 'ended' ? colors.redSoft : colors.amberSoft,
                        m.status === 'live' ? colors.green : m.status === 'ended' ? colors.red : colors.amber,
                      )}
                    >
                      {m.status}
                    </span>
                  </td>
                  <td style={s.td}>{m.roomId}</td>
                  <td style={s.td}>
                    {m.status !== 'ended' && (
                      <button style={s.buttonGhost} onClick={() => navigate(`/meeting/${m.roomId}`)}>
                        Join
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {meetings.length === 0 && (
                <tr>
                  <td style={s.td} colSpan={6}>No meetings yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
