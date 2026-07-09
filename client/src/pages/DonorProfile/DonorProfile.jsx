import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { donorAPI, notificationsAPI } from '../../services/api';
import {
  Heart, Droplet, MapPin, Bell, BellOff, Clock, Shield, Calendar, Weight, Activity,
  Trash2, AlertTriangle, X, Lock, CheckCheck, ChevronDown, ChevronUp,
  Building2, Phone, PhoneCall, User
} from 'lucide-react';
import './DonorProfile.css';

export default function DonorProfile() {
  const { updateUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const toast = useToast();

  // Notifications state
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifsLoading, setNotifsLoading] = useState(false);
  const [expandedNotif, setExpandedNotif] = useState(null);

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    fetchProfile();
    fetchNotifications();
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

  const fetchNotifications = async () => {
    setNotifsLoading(true);
    try {
      const { data } = await notificationsAPI.getAll();
      setNotifications(data.data.notifications || []);
      setUnreadCount(data.data.unread_count || 0);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setNotifsLoading(false);
    }
  };

  const handleMarkRead = useCallback(async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  }, []);

  const toggleExpand = (id) => {
    setExpandedNotif(prev => prev === id ? null : id);
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

        {/* Blood Request Notifications */}
        <div className="card mt-6 notif-section">
          <div className="notif-section-header">
            <div className="notif-section-title">
              <Bell size={20} className="notif-bell-icon" />
              <h3 className="card-title">Blood Request Notifications</h3>
              {unreadCount > 0 && (
                <span className="notif-count-badge">{unreadCount} new</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button className="btn btn-ghost btn-sm notif-mark-all-btn" onClick={handleMarkAllRead}>
                <CheckCheck size={15} /> Mark all as read
              </button>
            )}
          </div>

          {notifsLoading ? (
            <div className="notif-empty"><div className="spinner" /><p>Loading...</p></div>
          ) : notifications.length === 0 ? (
            <div className="notif-empty">
              <BellOff size={40} className="notif-empty-icon" />
              <p>No notifications yet.</p>
              <p className="text-muted text-sm">When someone requests your blood group, details will appear here.</p>
            </div>
          ) : (
            <div className="notif-list">
              {notifications.map(notif => {
                const isExpanded = expandedNotif === notif.id || !notif.is_read;
                return (
                  <div
                    key={notif.id}
                    className={`notif-card ${notif.is_read ? 'notif-read' : 'notif-unread'}`}
                    onClick={async () => {
                      toggleExpand(notif.id);
                      if (!notif.is_read) await handleMarkRead(notif.id);
                    }}
                  >
                    <div className="notif-card-header">
                      <div className="notif-header-left">
                        {!notif.is_read && <span className="notif-new-dot" />}
                        <div className="notif-blood-badge"><Droplet size={13} />{notif.blood_group}</div>
                        <span className={`badge badge-${notif.urgency}`}>{notif.urgency.toUpperCase()}</span>
                        {!notif.is_read && <span className="badge badge-new">NEW</span>}
                      </div>
                      <div className="notif-header-right">
                        <span className="notif-time">
                          <Clock size={12} />
                          {new Date(notif.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="notif-expand-btn">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </span>
                      </div>
                    </div>

                    <p className="notif-message">{notif.message}</p>

                    {isExpanded && (
                      <div className="notif-details animate-fade-in">
                        <div className="notif-detail-grid">
                          <div className="notif-detail-item">
                            <span className="notif-detail-label"><User size={12} /> Patient</span>
                            <span className="notif-detail-value">{notif.patient_name}</span>
                          </div>
                          <div className="notif-detail-item">
                            <span className="notif-detail-label"><Building2 size={12} /> Hospital</span>
                            <span className="notif-detail-value">{notif.hospital_name}</span>
                          </div>
                          <div className="notif-detail-item notif-detail-full">
                            <span className="notif-detail-label"><MapPin size={12} /> Address</span>
                            <span className="notif-detail-value">{notif.hospital_address}, {notif.hospital_city}, {notif.hospital_state} — {notif.hospital_pincode}</span>
                          </div>
                          <div className="notif-detail-item">
                            <span className="notif-detail-label"><PhoneCall size={12} /> Contact</span>
                            <span className="notif-detail-value">{notif.contact_name}</span>
                          </div>
                          <div className="notif-detail-item">
                            <span className="notif-detail-label"><Phone size={12} /> Phone</span>
                            <a href={`tel:${notif.contact_phone}`} className="notif-phone-link" onClick={e => e.stopPropagation()}>
                              {notif.contact_phone}
                            </a>
                          </div>
                          {notif.additional_notes && (
                            <div className="notif-detail-item notif-detail-full">
                              <span className="notif-detail-label">📝 Notes</span>
                              <span className="notif-detail-value notif-notes">{notif.additional_notes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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
