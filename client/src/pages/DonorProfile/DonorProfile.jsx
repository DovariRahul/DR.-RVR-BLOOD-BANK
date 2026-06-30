import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { donorAPI } from '../../services/api';
import { Heart, Droplet, MapPin, Bell, Clock, Shield, Calendar, Weight, Activity, Trash2, AlertTriangle, X, Lock } from 'lucide-react';
import './DonorProfile.css';

export default function DonorProfile() {
  const { updateUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const toast = useToast();

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setDeleteError('');

    if (!deletePassword) {
      setDeleteError('Please enter your password.');
      return;
    }

    setDeleteLoading(true);
    try {
      await donorAPI.deleteAccount(deletePassword);
      toast.success('Donor account deleted successfully. You can register again anytime.');
      // Update the user context to reflect role change
      updateUser({ role: 'patient' });
      navigate('/');
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to delete donor account.';
      setDeleteError(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const openDeleteModal = () => {
    setDeletePassword('');
    setDeleteError('');
    setShowDeleteModal(true);
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
                      <td data-label="Blood Group"><span className="badge badge-blood">{r.blood_group_needed}</span></td>
                      <td data-label="Hospital">{r.hospital_name}</td>
                      <td data-label="City">{r.hospital_city}</td>
                      <td data-label="Urgency"><span className={`badge badge-${r.urgency}`}>{r.urgency}</span></td>
                      <td data-label="Response">
                        <span className={`badge ${r.response === 'accepted' ? 'badge-active' : r.response === 'declined' ? 'badge-critical' : 'badge-inactive'}`}>
                          {r.response === 'no_response' ? 'No Response' : r.response}
                        </span>
                      </td>
                      <td data-label="Date" className="text-muted text-sm">{new Date(r.created_at).toLocaleDateString()}</td>
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

        {/* Danger Zone — Delete Donor Account */}
        <div className="card mt-6 danger-zone">
          <h3 className="card-title danger-title mb-4"><AlertTriangle size={18} /> Danger Zone</h3>
          <div className="danger-zone-content">
            <div className="danger-zone-info">
              <h4>Delete Donor Account</h4>
              <p className="text-muted text-sm">
                Permanently remove your donor profile. Your user account will remain, but you will no longer receive donation requests.
                You can re-register as a donor anytime.
              </p>
            </div>
            <button className="btn btn-danger" onClick={openDeleteModal}>
              <Trash2 size={16} /> Delete Donor Account
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteModal(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: 'var(--color-error)' }}>
                <AlertTriangle size={20} /> Delete Donor Account
              </h3>
              <button className="btn-icon" onClick={() => setShowDeleteModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleDeleteAccount}>
              <div className="modal-body">
                <div className="delete-warning">
                  <AlertTriangle size={32} />
                  <p><strong>This action cannot be undone.</strong></p>
                  <p>Your donor profile, availability status, and all donation response history will be permanently deleted.</p>
                </div>
                <div className="form-group" style={{ marginTop: 20 }}>
                  <label className="form-label"><Lock size={14} /> Enter your password to confirm</label>
                  <input
                    type="password"
                    className={`form-input ${deleteError ? 'error' : ''}`}
                    placeholder="Your account password"
                    value={deletePassword}
                    onChange={(e) => { setDeletePassword(e.target.value); setDeleteError(''); }}
                    autoFocus
                  />
                  {deleteError && <span className="form-error">{deleteError}</span>}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-danger" disabled={deleteLoading}>
                  {deleteLoading ? <><div className="spinner"></div> Deleting...</> : <><Trash2 size={16} /> Delete Permanently</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
