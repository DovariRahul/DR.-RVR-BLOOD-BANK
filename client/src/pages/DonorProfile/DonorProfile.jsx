import { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { donorAPI } from '../../services/api';
import { Heart, Droplet, MapPin, Bell, Clock, Shield, Calendar, Weight, Activity } from 'lucide-react';
import './DonorProfile.css';

export default function DonorProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data } = await donorAPI.getProfile();
      setProfile(data.data);
    } catch (error) {
      toast.error('Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    if (!profile) return;
    const newStatus = !profile.donor.is_available;

    if (!newStatus) {
      if (!confirm('Are you sure? You won\'t receive donation requests while unavailable.')) return;
    }

    setToggling(true);
    try {
      await donorAPI.toggleAvailability(profile.donor.id, newStatus);
      setProfile({
        ...profile,
        donor: { ...profile.donor, is_available: newStatus ? 1 : 0 }
      });
      toast.success(newStatus ? 'You are now available for donation requests.' : 'You are now marked as unavailable.');
    } catch {
      toast.error('Failed to update availability.');
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return <div className="loading-overlay"><div className="spinner spinner-lg"></div><p>Loading profile...</p></div>;
  }

  if (!profile) {
    return <div className="page"><div className="container text-center"><h2>Profile not found</h2></div></div>;
  }

  const { donor, response_history } = profile;
  const isAvailable = !!donor.is_available;

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 900 }}>
        {/* Profile Header */}
        <div className="profile-header card animate-fade-in">
          <div className="profile-avatar">
            {donor.full_name?.charAt(0) || 'D'}
          </div>
          <div className="profile-info">
            <h1>{donor.full_name}</h1>
            <div className="profile-badges">
              <span className="badge badge-blood"><Droplet size={12} /> {donor.blood_group}</span>
              {donor.is_verified ? (
                <span className="badge badge-active"><Shield size={12} /> Verified</span>
              ) : (
                <span className="badge badge-inactive">Unverified</span>
              )}
            </div>
            <p className="text-muted text-sm">{donor.city}, {donor.state}</p>
          </div>
          <div className="profile-toggle-section">
            <p className="toggle-label">{isAvailable ? 'Available for Donation' : 'Unavailable'}</p>
            <label className="toggle toggle-lg">
              <input type="checkbox" checked={isAvailable} onChange={handleToggle} disabled={toggling} />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-4 mt-6">
          <div className="card stat-card">
            <div className="stat-value">{donor.total_donations}</div>
            <div className="stat-label"><Heart size={14} /> Total Donations</div>
          </div>
          <div className="card stat-card stat-info">
            <div className="stat-value">{donor.last_donation_date ? new Date(donor.last_donation_date).toLocaleDateString() : 'Never'}</div>
            <div className="stat-label"><Calendar size={14} /> Last Donation</div>
          </div>
          <div className={`card stat-card ${donor.days_until_eligible === 0 ? 'stat-success' : 'stat-warning'}`}>
            <div className="stat-value">{donor.days_until_eligible}</div>
            <div className="stat-label"><Clock size={14} /> Days Until Eligible</div>
          </div>
          <div className="card stat-card stat-secondary">
            <div className="stat-value">{response_history?.length || 0}</div>
            <div className="stat-label"><Activity size={14} /> Requests Responded</div>
          </div>
        </div>

        {/* Personal Info */}
        <div className="card mt-6">
          <h3 className="card-title mb-4">Personal Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Email</span>
              <span className="info-value">{donor.email}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Phone</span>
              <span className="info-value">{donor.phone}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Gender</span>
              <span className="info-value" style={{ textTransform: 'capitalize' }}>{donor.gender}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Weight</span>
              <span className="info-value">{donor.weight_kg} kg</span>
            </div>
            <div className="info-item">
              <span className="info-label">Age</span>
              <span className="info-value">
                {donor.date_of_birth ? Math.floor((new Date() - new Date(donor.date_of_birth)) / 31557600000) : 'N/A'} yrs
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Address</span>
              <span className="info-value">{donor.address_line}, {donor.city}, {donor.state} - {donor.pincode}</span>
            </div>
            <div className="info-item">
              <span className="info-label">SMS Notifications</span>
              <span className="info-value">{donor.notification_opt_in ? '✅ Enabled' : '❌ Disabled'}</span>
            </div>
            <div className="info-item" style={{ gridColumn: '1 / -1' }}>
              <span className="info-label">Medical Conditions</span>
              <span className="info-value">{donor.medical_conditions || 'None specified'}</span>
            </div>
          </div>
        </div>

        {/* Response History */}
        <div className="card mt-6">
          <h3 className="card-title mb-4">Response History</h3>
          {response_history && response_history.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Blood Group</th>
                    <th>Hospital</th>
                    <th>City</th>
                    <th>Urgency</th>
                    <th>Response</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {response_history.map((r, i) => (
                    <tr key={i}>
                      <td><span className="badge badge-blood">{r.blood_group_needed}</span></td>
                      <td>{r.hospital_name}</td>
                      <td>{r.hospital_city}</td>
                      <td><span className={`badge badge-${r.urgency}`}>{r.urgency}</span></td>
                      <td>
                        <span className={`badge ${r.response === 'accepted' ? 'badge-active' : r.response === 'declined' ? 'badge-critical' : 'badge-inactive'}`}>
                          {r.response === 'no_response' ? 'No Response' : r.response}
                        </span>
                      </td>
                      <td className="text-muted text-sm">{new Date(r.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <Bell size={48} />
              <h3>No responses yet</h3>
              <p>When you respond to blood requests, they'll appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
