import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import Navbar from '../components/Navbar';
import { layout as s, colors } from '../styles';

export default function AdminDashboard() {
  const { token } = useAuth();
  const [tab, setTab] = useState('reports');
  const [reports, setReports] = useState(null);
  const [users, setUsers] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [error, setError] = useState('');

  async function load() {
    try {
      const [r, u, m] = await Promise.all([
        api.adminReports(token),
        api.adminUsers(token),
        api.adminMeetings(token),
      ]);
      setReports(r);
      setUsers(u.users);
      setMeetings(m.meetings);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleStatus(u) {
    const nextStatus = u.status === 'deactivated' ? 'active' : 'deactivated';
    await api.adminUpdateUser(u.id, { status: nextStatus }, token);
    load();
  }

  const tabs = [
    { id: 'reports', label: 'Reports' },
    { id: 'users', label: 'User Management' },
    { id: 'meetings', label: 'Meeting Monitoring' },
  ];

  return (
    <div style={s.page}>
      <Navbar />
      <div style={s.content}>
        {error && <div style={{ color: colors.red, marginBottom: 16 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={tab === t.id ? s.button : s.buttonGhost}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'reports' && reports && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <StatCard title="Total Users" value={reports.totals.users} />
            <StatCard title="Total Meetings" value={reports.totals.meetings} />
            <StatCard title="Total Recordings" value={reports.totals.recordings} />
            <StatCard title="Live Meetings" value={reports.meetingsByStatus.live} />
            <StatCard title="Scheduled Meetings" value={reports.meetingsByStatus.scheduled} />
            <StatCard title="Ended Meetings" value={reports.meetingsByStatus.ended} />
          </div>
        )}

        {tab === 'users' && (
          <div style={s.card}>
            <h2 style={s.sectionTitle}>Users</h2>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Name</th>
                  <th style={s.th}>Email</th>
                  <th style={s.th}>Role</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th}></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td style={s.td}>{u.name}</td>
                    <td style={s.td}>{u.email}</td>
                    <td style={s.td}>{u.role}</td>
                    <td style={s.td}>{u.status || 'active'}</td>
                    <td style={s.td}>
                      <button style={s.buttonGhost} onClick={() => toggleStatus(u)}>
                        {u.status === 'deactivated' ? 'Reactivate' : 'Deactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'meetings' && (
          <div style={s.card}>
            <h2 style={s.sectionTitle}>All meetings</h2>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Title</th>
                  <th style={s.th}>Room</th>
                  <th style={s.th}>Type</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th}>Created</th>
                </tr>
              </thead>
              <tbody>
                {meetings.map((m) => (
                  <tr key={m.id}>
                    <td style={s.td}>{m.title}</td>
                    <td style={s.td}>{m.roomId}</td>
                    <td style={s.td}>{m.type}</td>
                    <td style={s.td}>{m.status}</td>
                    <td style={s.td}>{new Date(m.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div style={s.card}>
      <div style={{ fontSize: 13, color: colors.muted, marginBottom: 6 }}>{title}</div>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 600, color: colors.accent }}>{value}</div>
    </div>
  );
}
