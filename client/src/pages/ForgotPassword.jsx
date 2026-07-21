import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { authPage as s } from '../styles';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const { message } = await api.forgotPassword(email);
      setMessage(message);
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
        <h1 style={s.title}>Reset your password</h1>
        <p style={s.subtitle}>We'll send a reset link to your email (logged to the server console in this MVP).</p>

        {error && <div style={s.error}>{error}</div>}
        {message && <div style={s.success}>{message}</div>}

        <form onSubmit={handleSubmit}>
          <label style={s.label}>Email</label>
          <input style={s.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <button style={s.button} type="submit" disabled={busy}>
            {busy ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <div style={s.linkRow}>
          <Link to="/login">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
