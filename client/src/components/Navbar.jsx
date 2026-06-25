import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Droplet, Menu, X, User, LogOut, LayoutDashboard, Heart } from 'lucide-react';
import './Navbar.css';

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, isDonor, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
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
            <Link to="/donor/profile" className="nav-link" onClick={() => setMobileOpen(false)}>
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
              <span className="nav-user-name">
                <User size={16} />
                {user.full_name}
              </span>
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
