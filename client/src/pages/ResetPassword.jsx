import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { authPage as s } from '../styles';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.resetPassword({ token, newPassword });
      navigate('/login');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={s.wrapper}>
      <div style={s.card}>
        <div style={s.brand}>Syncup</div>
        <h1 style={s.title}>Set a new password</h1>
        {!token && <div style={s.error}>Missing reset token — use the link from your email.</div>}
        {error && <div style={s.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <label style={s.label}>New password</label>
          <input
            style={s.input}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={6}
            required
          />
          <button style={s.button} type="submit" disabled={busy || !token}>
            {busy ? 'Resetting...' : 'Reset password'}
          </button>
        </form>

        <div style={s.linkRow}>
          <Link to="/login">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
