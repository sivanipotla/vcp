# Syncup — Video Communication & Virtual Collaboration Platform (Full MVP)

Themed as a "Digital Living Room": warm walnut/brass palette, Fraunces + Karla type,
video tiles styled like framed photos on a shelf. See `client/src/styles.js` for tokens.

Implements the MVP scope from the proposal doc: auth, meeting scheduling, multi-participant
video/audio, screen sharing, chat, file sharing, emoji reactions, recording, and an admin dashboard.

## Structure
```
vcp-full/
├── client/     # React + Vite frontend
└── server/     # Express + Socket.IO backend
```

## Quick start

**1. Server**
```bash
cd server
npm install
cp .env.example .env    # defaults work out of the box for local dev
npm start
# -> http://localhost:4000
```

**2. Client** (second terminal)
```bash
cd client
npm install
cp .env.example .env    # defaults work out of the box for local dev
npm run dev
# -> http://localhost:5173
```

**3. Try it**
- Register a user at `/register` — **the first registered user automatically becomes admin.**
- Register a second user in another browser/incognito tab to test multi-participant calls.
- From the dashboard: start an instant meeting, or schedule one (invitee emails get a
  "sent" invite logged to the **server terminal**, since there's no real SMTP configured).
- Join the same room code from two tabs to test video, chat, reactions, screen share,
  file sharing, and recording.
- Visit `/admin` (as the admin user) for user management, meeting monitoring, and reports.

## Feature map (vs. the MVP doc)

| Module | Status | Notes |
|---|---|---|
| User Auth (register/login/reset/profile) | ✅ Full | JWT-based, bcrypt hashing |
| Meeting Management (instant/scheduled/invite/join-by-link) | ✅ Full | Email invites logged to console (see below) |
| Multi-participant video (gallery/speaker view, camera on/off) | ✅ Full | WebRTC **mesh** — fine for small calls; see limits below |
| Audio (VoIP, mute, device selection) | ✅ Full | Device picker enumerates mics; switching input mid-call is a stub hook point |
| Screen sharing | ✅ Full | Uses `getDisplayMedia` + `replaceTrack`, no renegotiation glitches |
| Chat, file sharing, emoji reactions | ✅ Full | Chat/reactions over Socket.IO; files via multer upload/download |
| Recording | ⚠️ Simplified | See "Recording" section below |
| Admin (user mgmt, meeting monitoring, reports) | ✅ Full | Deactivate/reactivate users, view all meetings, basic counts |
| PostgreSQL + Redis | ⚠️ Substituted | See "Data storage" section below |

Excluded features (per the MVP doc's own exclusion list — not built): AI summaries, auto
transcription, translation, whiteboard, polls, Q&A, webinar mode, team channels, mobile
apps, advanced analytics, CRM integrations, SSO, MFA.

## Important simplifications (read before demoing)

**Recording.** The doc's "Cloud Recording" implies a server-side composited recording of
the whole meeting. That requires an SFU (mediasoup/Kurento) plus a transcoding pipeline —
a substantial separate build. This MVP instead has each participant's browser record its
own local stream via `MediaRecorder` and upload the file to the server for storage/playback.
It's a real, working recording feature — just per-participant, not a mixed composite.

**Data storage.** The proposal specifies PostgreSQL + Redis. To keep this a true
zero-config "unzip and run" package, data is stored in a JSON file (`server/src/data/db.json`,
via `lowdb`) instead. It's a drop-in point: swap `server/src/db.js` for a Prisma/`pg` client
against a real Postgres instance when you're ready for production, and add Redis for session/
presence caching at scale.

**Email.** `server/src/utils/mailer.js` uses a `jsonTransport` (logs "sent" emails to the
server console) since no real SMTP credentials exist. Swap in real SMTP/SendGrid/SES config
in that one file — the rest of the app is unaffected.

**WebRTC mesh vs SFU.** Multi-participant video uses a full mesh (every peer connects
directly to every other peer). This matches the "20 participants" success criterion only
loosely — mesh topologies get bandwidth/CPU-heavy past ~4-6 participants per client. For
real 20-person meetings, replace the mesh in `useWebRTCRoom.js` with an SFU (mediasoup, LiveKit,
or a hosted service).

## Admin access
The first registered user is auto-promoted to `admin`. To promote another existing user later:
```bash
cd server
npm run make-admin -- someone@example.com
```

## Verified before packaging
- `npm run build` on the client completes with no errors.
- Server boots and every REST endpoint (register, login, forgot/reset password, instant/
  scheduled meetings, admin reports/users/meetings) was exercised via curl and returned
  expected responses.
- Both dev servers (`vite` on :5173, Express on :4000) start and serve correctly together.
