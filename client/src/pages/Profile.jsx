import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import Navbar from '../components/Navbar';
import { layout as s, colors } from '../styles';

export default function Profile() {
  const { user, token, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const payload = { name };
      if (password) payload.password = password;
      await api.updateProfile(payload, token);
      await refreshUser();
      setPassword('');
      setMessage('Profile updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={s.page}>
      <Navbar />
      <div style={s.content}>
        <div style={{ ...s.card, maxWidth: 480 }}>
          <h2 style={s.sectionTitle}>Your profile</h2>

          {error && <div style={{ color: colors.red, marginBottom: 12, fontSize: 13 }}>{error}</div>}
          {message && <div style={{ color: colors.green, marginBottom: 12, fontSize: 13 }}>{message}</div>}

          <form onSubmit={handleSubmit}>
            <label style={{ fontSize: 13, color: colors.muted, display: 'block', marginBottom: 6 }}>Email</label>
            <input style={{ ...s.input, opacity: 0.6 }} value={user?.email || ''} disabled />

            <label style={{ fontSize: 13, color: colors.muted, display: 'block', marginBottom: 6 }}>Full name</label>
            <input style={s.input} value={name} onChange={(e) => setName(e.target.value)} required />

            <label style={{ fontSize: 13, color: colors.muted, display: 'block', marginBottom: 6 }}>
              New password (optional)
            </label>
            <input
              style={s.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              placeholder="Leave blank to keep current password"
            />

            <button style={s.button} type="submit" disabled={busy}>
              {busy ? 'Saving...' : 'Save changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
