import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI, notificationsAPI } from '../../services/api';
import {
  User, Mail, Phone, Calendar, Shield, Activity, Droplet, Trash2,
  AlertTriangle, X, Bell, BellOff, Building2, MapPin, PhoneCall,
  CheckCheck, Clock, ChevronDown, ChevronUp
} from 'lucide-react';
import { Link } from 'react-router-dom';
import DonorProfile from '../DonorProfile/DonorProfile';
import './UserProfile.css';

const URGENCY_COLORS = {
  critical: 'badge-critical',
  urgent:   'badge-urgent',
  standard: 'badge-standard'
};

function NotificationCard({ notif, onMarkRead }) {
  const [expanded, setExpanded] = useState(!notif.is_read);

  const handleClick = async () => {
    setExpanded(prev => !prev);
    if (!notif.is_read) {
      await onMarkRead(notif.id);
    }
  };

  return (
    <div
      className={`notif-card ${notif.is_read ? 'notif-read' : 'notif-unread'}`}
      onClick={handleClick}
    >
      <div className="notif-card-header">
        <div className="notif-header-left">
          {!notif.is_read && <span className="notif-new-dot" />}
          <div className="notif-blood-badge">
            <Droplet size={14} />
            {notif.blood_group}
          </div>
          <span className={`badge ${URGENCY_COLORS[notif.urgency] || 'badge-standard'}`}>
            {notif.urgency.toUpperCase()}
          </span>
          {!notif.is_read && <span className="badge badge-new">NEW</span>}
        </div>
        <div className="notif-header-right">
          <span className="notif-time">
            <Clock size={12} />
            {new Date(notif.created_at).toLocaleString('en-IN', {
              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
            })}
          </span>
          <button className="notif-expand-btn" onClick={handleClick}>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      <p className="notif-message">{notif.message}</p>

      {expanded && (
        <div className="notif-details animate-fade-in">
          <div className="notif-detail-grid">
            <div className="notif-detail-item">
              <span className="notif-detail-label">
                <User size={13} /> Patient
              </span>
              <span className="notif-detail-value">{notif.patient_name}</span>
            </div>
            <div className="notif-detail-item">
              <span className="notif-detail-label">
                <Building2 size={13} /> Hospital
              </span>
              <span className="notif-detail-value">{notif.hospital_name}</span>
            </div>
            <div className="notif-detail-item notif-detail-full">
              <span className="notif-detail-label">
                <MapPin size={13} /> Address
              </span>
              <span className="notif-detail-value">
                {notif.hospital_address}, {notif.hospital_city}, {notif.hospital_state} — {notif.hospital_pincode}
              </span>
            </div>
            <div className="notif-detail-item">
              <span className="notif-detail-label">
                <PhoneCall size={13} /> Contact Person
              </span>
              <span className="notif-detail-value">{notif.contact_name}</span>
            </div>
            <div className="notif-detail-item">
              <span className="notif-detail-label">
                <Phone size={13} /> Contact Phone
              </span>
              <a
                href={`tel:${notif.contact_phone}`}
                className="notif-phone-link"
                onClick={e => e.stopPropagation()}
              >
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
}

export default function UserProfile() {
  const { user, isDonor, isAdmin } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifsLoading, setNotifsLoading] = useState(false);

  useEffect(() => {
    if (isDonor) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const { data } = await authAPI.getMe();
        setProfileData(data.data.user);
      } catch (error) {
        console.error('Failed to load profile', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [isDonor]);

  // Load notifications for all non-admin authenticated users
  const fetchNotifications = useCallback(async () => {
    if (isAdmin) return;
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
  }, [isAdmin]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkRead = useCallback(async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: 1 } : n)
      );
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
      console.error('Failed to mark all notifications as read', err);
    }
  }, []);

  if (loading) {
    return <div className="loading-overlay"><div className="spinner spinner-lg"></div><p>Loading profile...</p></div>;
  }

  // If the user is a donor, show the comprehensive donor profile
  if (isDonor) {
    return <DonorProfile />;
  }

  if (!profileData) {
    return <div className="page"><div className="container text-center"><h2>Profile not found</h2></div></div>;
  }

  return (
    <div className="page user-profile-page">
      <div className="container" style={{ maxWidth: 800 }}>

        <div className="profile-header card animate-fade-in">
          <div className="profile-avatar">
            {profileData.full_name?.charAt(0) || 'U'}
          </div>
          <div className="profile-info">
            <h1>{profileData.full_name}</h1>
            <div className="profile-badges">
              <span className="badge badge-inactive">
                <User size={12} /> {isAdmin ? 'Administrator' : 'General User'}
              </span>
              {profileData.is_verified && (
                <span className="badge badge-active"><Shield size={12} /> Verified</span>
              )}
            </div>
            <p className="text-muted text-sm mt-2">Member since {new Date(profileData.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="card mt-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <h3 className="card-title mb-4">Account Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label"><Mail size={14} /> Email Address</span>
              <span className="info-value">{profileData.email}</span>
            </div>
            <div className="info-item">
              <span className="info-label"><Phone size={14} /> Phone Number</span>
              <span className="info-value">{profileData.phone}</span>
            </div>
            <div className="info-item">
              <span className="info-label"><Activity size={14} /> Account Status</span>
              <span className="info-value">
                {profileData.is_active ? (
                  <span className="text-success font-medium">Active</span>
                ) : (
                  <span className="text-error font-medium">Inactive</span>
                )}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label"><Droplet size={14} /> Blood Group</span>
              <span className="info-value">{profileData.blood_group || 'Not Specified'}</span>
            </div>
            <div className="info-item">
              <span className="info-label"><Calendar size={14} /> Last Donation</span>
              <span className="info-value">{profileData.last_donation_date ? new Date(profileData.last_donation_date).toLocaleDateString() : 'Never'}</span>
            </div>
          </div>
        </div>

        {/* ── Blood Request Notifications Section ── */}
        {!isAdmin && (
          <div className="card mt-6 animate-slide-up notif-section" style={{ animationDelay: '0.15s' }}>
            <div className="notif-section-header">
              <div className="notif-section-title">
                <Bell size={20} className="notif-bell-icon" />
                <h3 className="card-title">Blood Request Notifications</h3>
                {unreadCount > 0 && (
                  <span className="notif-count-badge">{unreadCount} new</span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  className="btn btn-ghost btn-sm notif-mark-all-btn"
                  onClick={handleMarkAllRead}
                >
                  <CheckCheck size={15} /> Mark all as read
                </button>
              )}
            </div>

            {notifsLoading ? (
              <div className="notif-empty">
                <div className="spinner" />
                <p>Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="notif-empty">
                <BellOff size={40} className="notif-empty-icon" />
                <p>No notifications yet.</p>
                <p className="text-muted text-sm">
                  When someone requests your blood group, you'll see the details here.
                </p>
              </div>
            ) : (
              <div className="notif-list">
                {notifications.map(notif => (
                  <NotificationCard
                    key={notif.id}
                    notif={notif}
                    onMarkRead={handleMarkRead}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {!isAdmin && (
          <div className="card mt-6 danger-zone animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <h3 className="card-title danger-title mb-4"><AlertTriangle size={18} /> Danger Zone</h3>
            <div className="danger-zone-content">
              <div className="danger-zone-info">
                <h4>Delete User Donor Account</h4>
                <p className="text-muted text-sm">
                  Permanently remove your account. This action cannot be undone.
                </p>
              </div>
              <button className="btn btn-danger" onClick={() => setShowDeleteModal(true)}>
                <Trash2 size={16} /> Delete User Donor Account
              </button>
            </div>
          </div>
        )}
      </div>

      {showDeleteModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteModal(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: 'var(--color-error)' }}>
                <AlertTriangle size={20} /> Delete Account
              </h3>
              <button className="btn-icon" onClick={() => setShowDeleteModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="delete-warning">
                <AlertTriangle size={32} />
                <p><strong>you are deleteing account as a donor</strong></p>
                <p>This action cannot be undone.</p>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={() => setShowDeleteModal(false)}>
                <Trash2 size={16} /> Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
