import { Droplet, Heart, Mail, Phone } from 'lucide-react';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="footer-logo">
              <div className="brand-icon">
                <Droplet size={20} />
              </div>
              <span>RVR <span className="brand-accent">BLOOD BANK</span></span>
            </div>
            <p className="footer-desc">
              Connecting blood seekers with registered donors instantly during medical emergencies. Every drop saves a life.
            </p>
          </div>

          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="/request">Request Blood</a></li>
              <li><a href="/register/donor">Become a Donor</a></li>
              <li><a href="/login">Login</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Blood Groups</h4>
            <div className="footer-blood-groups">
              {['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−'].map(g => (
                <span key={g} className="badge badge-blood">{g}</span>
              ))}
            </div>
          </div>

          <div className="footer-section">
            <h4>Contact</h4>
            <ul>
              <li><Mail size={14} /> raagasai6@gmail.com</li>
              <li><Phone size={14} /> +91 9491659594</li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} RVR Blood Bank. Built with <Heart size={14} className="heart-icon" /> for saving lives.</p>
        </div>
      </div>
    </footer>
  );
}
