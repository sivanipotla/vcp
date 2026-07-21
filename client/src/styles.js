// "Digital Living Room" — a lamp-lit room at evening, not a control panel.
// Walnut wood, brass lamp light, a houseplant's green, worn parchment paper.

export const fonts = {
  display: "'Fraunces', Georgia, serif", // wordmark, page/section headings
  body: "'Karla', system-ui, sans-serif", // everything else
};

export const colors = {
  bg: '#241C18',        // espresso-brown wall
  panel: '#2E2019',      // walnut furniture / cards
  panelRaised: '#3B2A21', // a cushion catching more light
  border: '#4A3B31',     // wood trim / seams
  text: '#F3EAE0',       // parchment / lampshade paper
  muted: '#B8A99C',      // dusty taupe, shadowed corners
  accent: '#D9A441',     // brass lamp glow
  accentHover: '#C4903A',
  accentSoft: '#3A2E1C', // warm badge fill
  green: '#8FBF87',      // the houseplant on the shelf
  greenSoft: '#233024',
  amber: '#E0B15C',      // scheduled / pending state
  amberSoft: '#3A2E1C',
  red: '#C6604A',        // brick, not alarm-red
  redSoft: '#3A211C',
};

export const authPage = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    background: colors.panel,
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    padding: 32,
    boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
  },
  brand: {
    fontFamily: fonts.display,
    fontSize: 15,
    fontWeight: 600,
    letterSpacing: '0.02em',
    color: colors.accent,
    marginBottom: 20,
  },
  title: { margin: '0 0 8px', fontFamily: fonts.display, fontSize: 26, fontWeight: 600 },
  subtitle: { margin: '0 0 24px', color: colors.muted, fontSize: 14 },
  label: { display: 'block', fontSize: 13, marginBottom: 6, color: colors.muted },
  input: {
    width: '100%',
    padding: '10px 12px',
    marginBottom: 16,
    borderRadius: 10,
    border: `1px solid ${colors.border}`,
    background: '#1C1512',
    color: colors.text,
    fontSize: 14,
  },
  button: {
    width: '100%',
    padding: '11px 12px',
    borderRadius: 10,
    border: 'none',
    background: colors.accent,
    color: '#231A0F',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
  linkRow: { marginTop: 16, fontSize: 13, color: colors.muted, textAlign: 'center' },
  error: {
    background: colors.redSoft,
    color: colors.red,
    padding: '8px 12px',
    borderRadius: 10,
    fontSize: 13,
    marginBottom: 16,
  },
  success: {
    background: colors.greenSoft,
    color: colors.green,
    padding: '8px 12px',
    borderRadius: 10,
    fontSize: 13,
    marginBottom: 16,
  },
};

export const layout = {
  page: { minHeight: '100vh' },
  navbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    borderBottom: `1px solid ${colors.border}`,
  },
  navLeft: { display: 'flex', alignItems: 'center', gap: 22 },
  navBrand: {
    fontFamily: fonts.display,
    fontWeight: 600,
    fontSize: 18,
    color: colors.accent,
    letterSpacing: '0.01em',
  },
  navLink: { fontSize: 14, color: colors.muted, textDecoration: 'none', cursor: 'pointer' },
  navLinkActive: { color: colors.text },
  navRight: { display: 'flex', alignItems: 'center', gap: 12 },
  content: { padding: 24, maxWidth: 1100, margin: '0 auto' },
  card: {
    background: colors.panel,
    border: `1px solid ${colors.border}`,
    borderRadius: 14,
    padding: 20,
  },
  sectionTitle: { fontFamily: fonts.display, fontSize: 18, fontWeight: 600, margin: '0 0 16px' },
  button: {
    padding: '9px 16px',
    borderRadius: 10,
    border: 'none',
    background: colors.accent,
    color: '#231A0F',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
  buttonGhost: {
    padding: '9px 16px',
    borderRadius: 10,
    border: `1px solid ${colors.border}`,
    background: 'transparent',
    color: colors.text,
    fontSize: 13,
    cursor: 'pointer',
  },
  input: {
    width: '100%',
    padding: '9px 12px',
    borderRadius: 10,
    border: `1px solid ${colors.border}`,
    background: '#1C1512',
    color: colors.text,
    fontSize: 14,
    marginBottom: 12,
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '8px 10px', color: colors.muted, borderBottom: `1px solid ${colors.border}` },
  td: { padding: '8px 10px', borderBottom: `1px solid ${colors.border}` },
  badge: (bg, fg) => ({
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: 999,
    fontSize: 12,
    background: bg,
    color: fg,
  }),
};
