import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { requestAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Clock, CheckCircle, XCircle, Search, AlertTriangle, Droplet, Building2, User, Phone } from 'lucide-react';
import './RequestStatus.css';

const STATUS_CONFIG = {
  pending: { icon: Clock, color: 'var(--color-text-muted)', label: 'Pending', desc: 'Your request is queued and waiting to be processed.' },
  matching: { icon: Search, color: 'var(--color-secondary)', label: 'Matching', desc: 'We are searching for matching donors in your area...' },
  matched: { icon: AlertTriangle, color: 'var(--color-secondary)', label: 'Matched', desc: 'Donor(s) have been notified. Waiting for responses.' },
  fulfilled: { icon: CheckCircle, color: 'var(--color-success)', label: 'Fulfilled', desc: 'Your request has been fulfilled! Thank you.' },
  cancelled: { icon: XCircle, color: 'var(--color-error)', label: 'Cancelled', desc: 'This request has been cancelled.' },
  expired: { icon: Clock, color: 'var(--color-text-muted)', label: 'Expired', desc: 'This request has expired. Please submit a new request if needed.' }
};

export default function RequestStatus() {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const navigate = useNavigate();

  const fetchRequest = async () => {
    try {
      const { data } = await requestAPI.getById(id);
      setRequest(data.data.request);
    } catch (error) {
      toast.error('Failed to load request.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequest();
    // Poll every 30 seconds
    const interval = setInterval(fetchRequest, 30000);
    return () => clearInterval(interval);
  }, [id]);

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this request?')) return;
    try {
      await requestAPI.cancel(id);
      toast.success('Request cancelled.');
      fetchRequest();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel.');
    }
  };

  if (loading) {
    return <div className="loading-overlay"><div className="spinner spinner-lg"></div><p>Loading request...</p></div>;
  }

  if (!request) {
    return <div className="page"><div className="container text-center"><h2>Request not found</h2></div></div>;
  }

  const config = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;
  const StatusIcon = config.icon;
  const canCancel = ['pending', 'matching', 'matched'].includes(request.status);

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 800 }}>
        <h1 className="mb-6">Request Status — RVR-{request.id}</h1>

        {/* Status Card */}
        <div className="card status-card animate-fade-in" style={{ borderLeft: `4px solid ${config.color}` }}>
          <div className="status-indicator" style={{ color: config.color }}>
            <StatusIcon size={48} />
          </div>
          <div>
            <span className={`badge badge-${request.status === 'fulfilled' ? 'active' : request.status === 'cancelled' || request.status === 'expired' ? 'inactive' : request.urgency}`}>
              {config.label}
            </span>
            <p className="status-desc mt-2">{config.desc}</p>
          </div>
        </div>

        {/* Request Summary */}
        <div className="card mt-6">
          <h3 className="card-title mb-4">Request Details</h3>
          <div className="info-grid">
            <div className="info-item"><span className="info-label">Patient</span><span className="info-value"><User size={14} /> {request.patient_name}</span></div>
            <div className="info-item"><span className="info-label">Blood Group</span><span className="badge badge-blood"><Droplet size={12} /> {request.blood_group_needed}</span></div>
            <div className="info-item"><span className="info-label">Units</span><span className="info-value">{request.units_needed}</span></div>
            <div className="info-item"><span className="info-label">Urgency</span><span className={`badge badge-${request.urgency}`}>{request.urgency}</span></div>
            <div className="info-item"><span className="info-label">Hospital</span><span className="info-value"><Building2 size={14} /> {request.hospital_name}</span></div>
            <div className="info-item"><span className="info-label">Contact</span><span className="info-value"><Phone size={14} /> {request.contact_name} — {request.contact_phone}</span></div>
            <div className="info-item"><span className="info-label">Submitted</span><span className="info-value">{new Date(request.created_at).toLocaleString()}</span></div>
            <div className="info-item"><span className="info-label">Expires</span><span className="info-value">{new Date(request.expires_at).toLocaleString()}</span></div>
          </div>
        </div>

        {/* Donor Responses */}
        {request.donors_notified > 0 && (
          <div className="card mt-6">
            <h3 className="card-title mb-4">Donor Responses</h3>
            <p className="text-muted mb-4">{request.donors_accepted} of {request.donors_notified} notified donors have responded.</p>
            {request.accepted_donors?.length > 0 && (
              <div className="accepted-donors">
                {request.accepted_donors.map((d, i) => (
                  <div key={i} className="accepted-donor">
                    <div className="donor-avatar-sm">{d.first_name.charAt(0)}</div>
                    <div>
                      <strong>{d.first_name}</strong>
                      <span className="badge badge-blood" style={{ marginLeft: 8 }}>{d.blood_group}</span>
                      <p className="text-muted text-sm">Accepted at {new Date(d.accepted_at).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="status-actions mt-6">
          {canCancel && (
            <button className="btn btn-danger" onClick={handleCancel}>Cancel Request</button>
          )}
          {(request.status === 'expired' || request.status === 'cancelled') && (
            <button className="btn btn-primary" onClick={() => navigate('/request')}>Submit New Request</button>
          )}
          <button className="btn btn-ghost" onClick={() => navigate('/')}>Back to Home</button>
        </div>
      </div>
    </div>
  );
}
