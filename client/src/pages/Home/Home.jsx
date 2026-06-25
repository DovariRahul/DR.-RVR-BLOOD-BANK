import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Droplet, Heart, Users, ArrowRight, HeartPulse, Bell, Truck, Shield, Clock, Activity } from 'lucide-react';
import { publicAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './Home.css';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupDonors, setGroupDonors] = useState([]);
  const [donorsLoading, setDonorsLoading] = useState(false);

  const handleGroupClick = async (group) => {
    setSelectedGroup(group);
    setDonorsLoading(true);
    try {
      const { data } = await publicAPI.getDonorsByGroup(group);
      setGroupDonors(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setDonorsLoading(false);
    }
  };

  useEffect(() => {
    async function fetchStats() {
      try {
        const { data } = await publicAPI.getStats();
        setStats(data.data);
      } catch {
        // Use fallback data in dev
        setStats({
          total_donors: 0,
          requests_fulfilled: 0,
          total_requests: 0,
          lives_saved: 0,
          blood_group_availability: BLOOD_GROUPS.map(bg => ({ blood_group: bg, available_count: 0 }))
        });
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const getGroupCount = (group) => {
    if (!stats?.blood_group_availability) return 0;
    const item = stats.blood_group_availability.find(b => b.blood_group === group);
    return item?.available_count || 0;
  };

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-blob hero-blob-1"></div>
          <div className="hero-blob hero-blob-2"></div>
          <div className="hero-blob hero-blob-3"></div>
        </div>
        <div className="container hero-content">
          <div className="hero-text">
            <div className="hero-badge animate-fade-in">
              <HeartPulse size={16} />
              <span>Emergency Blood Matching Platform</span>
            </div>
            <h1 className="hero-title animate-fade-in">
              Every Drop<br />
              <span className="hero-highlight">Saves a Life</span>
            </h1>
            <p className="hero-desc animate-fade-in">
              RVR Blood Bank connects blood seekers with registered donors instantly during medical emergencies. Our real-time matching and SMS notification system reduces donor-finding time dramatically.
            </p>
            <div className="hero-actions animate-fade-in">
              <Link to={isAuthenticated ? "/request" : "/login?redirect=/request"} className="btn btn-primary btn-lg">
                <Droplet size={20} /> Request Blood
              </Link>
              <Link to="/register/donor" className="btn btn-secondary btn-lg">
                <Heart size={20} /> Become a Donor
              </Link>
            </div>
          </div>
          <div className="hero-visual animate-fade-in">
            <div className="hero-card hero-card-main">
              <div className="hero-card-icon">
                <Droplet size={48} />
              </div>
              <div className="hero-card-stat">{stats?.total_donors || '—'}</div>
              <div className="hero-card-label">Registered Donors</div>
            </div>
            <div className="hero-card hero-card-accent">
              <HeartPulse size={32} />
              <div className="hero-card-stat">{stats?.total_requests || '—'}</div>
              <div className="hero-card-label">Total Requests</div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="stats-bar">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-item">
              <Users size={28} className="stat-icon" />
              <div className="stat-number">{stats?.total_donors || 0}</div>
              <div className="stat-text">Registered Donors</div>
            </div>
            <div className="stat-item">
              <Heart size={28} className="stat-icon stat-icon-red" />
              <div className="stat-number">{stats?.total_requests || 0}</div>
              <div className="stat-text">Total Blood Requests</div>
            </div>
            <div className="stat-item">
              <Activity size={28} className="stat-icon stat-icon-green" />
              <div className="stat-number">{stats?.lives_saved || 0}</div>
              <div className="stat-text">Lives Saved</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section how-it-works">
        <div className="container">
          <div className="section-header text-center">
            <h2>How It Works</h2>
            <p className="text-muted">Three simple steps to get the blood you need</p>
          </div>
          <div className="steps-grid">
            <div className="step-card animate-fade-in">
              <div className="step-number">1</div>
              <div className="step-icon-wrapper step-icon-red">
                <Droplet size={32} />
              </div>
              <h3>Submit Request</h3>
              <p>Fill out the blood request form with patient details, blood group needed, and hospital information.</p>
            </div>
            <div className="step-arrow">
              <ArrowRight size={24} />
            </div>
            <div className="step-card animate-fade-in">
              <div className="step-number">2</div>
              <div className="step-icon-wrapper step-icon-orange">
                <Bell size={32} />
              </div>
              <h3>Donors Notified</h3>
              <p>Our matching engine finds compatible donors nearby and sends SMS notifications instantly.</p>
            </div>
            <div className="step-arrow">
              <ArrowRight size={24} />
            </div>
            <div className="step-card animate-fade-in">
              <div className="step-number">3</div>
              <div className="step-icon-wrapper step-icon-green">
                <Truck size={32} />
              </div>
              <h3>Blood Delivered</h3>
              <p>Accepted donors visit the hospital to donate. Track the entire process in real time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Blood Group Availability */}
      <section className="section blood-groups-section">
        <div className="container">
          <div className="section-header text-center">
            <h2>Blood Group Availability</h2>
            <p className="text-muted">Current available donors by blood group</p>
          </div>
          <div className="blood-grid">
            {BLOOD_GROUPS.map(group => (
              <div key={group} className="card blood-card card-interactive" onClick={() => handleGroupClick(group)}>
                <Droplet size={36} className="blood-icon" />
                <span className="blood-type">{group}</span>
                <span className="blood-count">{getGroupCount(group)} donors available</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="section why-section">
        <div className="container">
          <div className="section-header text-center">
            <h2>Why RVR Blood Bank?</h2>
            <p className="text-muted">Built for speed, trust, and reliability</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <Clock size={24} className="feature-icon" />
              <h4>Instant Matching</h4>
              <p>Our algorithm finds compatible donors within seconds, not hours.</p>
            </div>
            <div className="feature-card">
              <Bell size={24} className="feature-icon" />
              <h4>SMS Notifications</h4>
              <p>Donors receive real-time SMS alerts — no app download required.</p>
            </div>
            <div className="feature-card">
              <Shield size={24} className="feature-icon" />
              <h4>Verified Donors</h4>
              <p>All donors are verified and eligibility-checked before matching.</p>
            </div>
            <div className="feature-card">
              <Activity size={24} className="feature-icon" />
              <h4>Real-Time Tracking</h4>
              <p>Track your request status from submission to fulfillment.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container text-center">
          <h2>Ready to Save Lives?</h2>
          <p>Join our community of heroes. Register as a donor today and be the reason someone gets another chance at life.</p>
          <div className="cta-actions">
            <Link to="/register/donor" className="btn btn-primary btn-lg">
              <Heart size={20} /> Register as Donor
            </Link>
            <Link to={isAuthenticated ? "/request" : "/signup"} className="btn btn-secondary btn-lg">
              {isAuthenticated ? 'Submit a Request' : 'Create Account'}
            </Link>
          </div>
        </div>
      </section>
      {/* Donor Modal */}
      {selectedGroup && (
        <div className="modal-overlay" onClick={() => setSelectedGroup(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Available Donors: {selectedGroup}</h3>
              <button className="btn-close" onClick={() => setSelectedGroup(null)}>×</button>
            </div>
            <div className="modal-body">
              {donorsLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="spinner"></div></div>
              ) : groupDonors.length === 0 ? (
                <p className="text-muted" style={{ textAlign: 'center' }}>No available donors for this blood group right now.</p>
              ) : (
                <div className="donor-list">
                  {groupDonors.map((donor, idx) => (
                    <div key={idx} className="donor-item">
                      <div className="donor-item-header">
                        <span className="donor-item-name">{donor.name}</span>
                        <span className="donor-item-meta">{donor.age} yrs • {donor.gender}</span>
                      </div>
                      <div className="donor-item-contact">
                        <span>📍 {donor.city}, {donor.state}</span>
                        <span>📞 {donor.phone}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
