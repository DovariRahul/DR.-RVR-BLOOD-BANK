import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Droplet, Menu, X, User, LogOut, LayoutDashboard, Heart, Bell } from 'lucide-react';
import { notificationsAPI } from '../services/api';
import './Navbar.css';

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, isDonor, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const pollRef = useRef(null);

  // Fetch unread count & set up 30-second polling
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    const fetchCount = async () => {
      try {
        const { data } = await notificationsAPI.getUnreadCount();
        setUnreadCount(data.data.unread_count || 0);
      } catch {
        // Silently ignore polling errors
      }
    };

    fetchCount();
    pollRef.current = setInterval(fetchCount, 30000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isAuthenticated]);

  const handleLogout = () => {
    logout();
    setUnreadCount(0);
    navigate('/');
    setMobileOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner container">
        <Link to="/" className="navbar-brand" onClick={() => setMobileOpen(false)}>
          <div className="brand-icon">
            <Droplet size={24} />
          </div>
          <span className="brand-text">RVR <span className="brand-accent">BLOOD BANK</span></span>
        </Link>

        <div className={`navbar-links ${mobileOpen ? 'open' : ''}`}>
          <Link to="/" className="nav-link" onClick={() => setMobileOpen(false)}>Home</Link>

          <Link to="/request" className="nav-link" onClick={() => setMobileOpen(false)}>Request Blood</Link>

          {!isDonor ? (
            <Link to="/register/donor" className="nav-link" onClick={() => setMobileOpen(false)}>Become a Donor</Link>
          ) : (
            <Link to="/profile" className="nav-link" onClick={() => setMobileOpen(false)}>
              <Heart size={16} /> My Profile
            </Link>
          )}

          {isAdmin && (
            <Link to="/admin" className="nav-link nav-link-admin" onClick={() => setMobileOpen(false)}>
              <LayoutDashboard size={16} /> Admin
            </Link>
          )}

          {isAuthenticated ? (
            <div className="nav-user">
              {/* Notification Bell */}
              <Link
                to="/profile"
                className="nav-bell"
                onClick={() => setMobileOpen(false)}
                title="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="nav-bell-badge" key={unreadCount}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>

              <Link
                to={isAdmin ? '/admin' : '/profile'}
                className="nav-user-name"
                onClick={() => setMobileOpen(false)}
              >
                <User size={16} />
                {user.full_name}
              </Link>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                <LogOut size={16} /> Logout
              </button>
            </div>
          ) : (
            <div className="nav-auth">
              <Link to="/login" className="btn btn-ghost btn-sm" onClick={() => setMobileOpen(false)}>Login</Link>
              <Link to="/signup" className="btn btn-primary btn-sm" onClick={() => setMobileOpen(false)}>Sign Up</Link>
            </div>
          )}
        </div>

        <button className="navbar-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </nav>
  );
}
