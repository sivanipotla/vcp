import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { layout as s, colors } from '../styles';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function linkStyle(path) {
    return {
      ...s.navLink,
      ...(location.pathname === path ? s.navLinkActive : {}),
    };
  }

  return (
    <div style={s.navbar}>
      <div style={s.navLeft}>
        <span style={s.navBrand}>Syncup</span>
        <Link to="/dashboard" style={linkStyle('/dashboard')}>Dashboard</Link>
        <Link to="/profile" style={linkStyle('/profile')}>Profile</Link>
        {user?.role === 'admin' && (
          <Link to="/admin" style={linkStyle('/admin')}>Admin</Link>
        )}
      </div>
      <div style={s.navRight}>
        <span style={{ fontSize: 13, color: colors.muted }}>{user?.name}</span>
        <button
          style={s.buttonGhost}
          onClick={() => {
            logout();
            navigate('/login');
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
