import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import { User, Mail, Phone, Calendar, Shield, Activity, Droplet } from 'lucide-react';
import { Link } from 'react-router-dom';
import DonorProfile from '../DonorProfile/DonorProfile';
import './UserProfile.css';

export default function UserProfile() {
  const { user, isDonor, isAdmin } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If donor, we will just render DonorProfile directly instead of loading basic profile here
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
          </div>
        </div>

        {!isAdmin && (
          <div className="card mt-6 become-donor-card animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="donor-promo-content">
              <div className="donor-promo-icon">
                <Droplet size={32} />
              </div>
              <div className="donor-promo-text">
                <h3>Become a Blood Donor</h3>
                <p className="text-muted">You are currently registered as a patient/general user. Register as a donor to save lives and receive blood requests in your area.</p>
              </div>
              <Link to="/register/donor" className="btn btn-primary">Register Now</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
