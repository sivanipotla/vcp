const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

async function upload(path, formData, token) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
  return data;
}

export const api = {
  register: (payload) => request('/api/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: payload }),
  forgotPassword: (email) => request('/api/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (payload) => request('/api/auth/reset-password', { method: 'POST', body: payload }),
  me: (token) => request('/api/auth/me', { token }),
  updateProfile: (payload, token) => request('/api/auth/me', { method: 'PUT', body: payload, token }),

  createInstantMeeting: (payload, token) => request('/api/meetings/instant', { method: 'POST', body: payload, token }),
  scheduleMeeting: (payload, token) => request('/api/meetings/schedule', { method: 'POST', body: payload, token }),
  myMeetings: (token) => request('/api/meetings/mine', { token }),
  getMeeting: (roomId, token) => request(`/api/meetings/${roomId}`, { token }),
  endMeeting: (roomId, token) => request(`/api/meetings/${roomId}/end`, { method: 'POST', token }),

  meetingFiles: (roomId, token) => request(`/api/files/meeting/${roomId}`, { token }),
  uploadFile: (roomId, formData, token) => upload(`/api/files/${roomId}`, formData, token),

  meetingRecordings: (roomId, token) => request(`/api/recordings/meeting/${roomId}`, { token }),
  uploadRecording: (roomId, formData, token) => upload(`/api/recordings/${roomId}`, formData, token),

  adminUsers: (token) => request('/api/admin/users', { token }),
  adminUpdateUser: (id, payload, token) => request(`/api/admin/users/${id}`, { method: 'PUT', body: payload, token }),
  adminMeetings: (token) => request('/api/admin/meetings', { token }),
  adminReports: (token) => request('/api/admin/reports', { token }),
};

export { API_URL };
