import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { requestAPI } from '../../services/api';
import { Droplet, HeartPulse, Building2, MapPin, User, Phone, FileText, CheckCircle } from 'lucide-react';
import './BloodRequest.css';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const STATES = ['Andhra Pradesh', 'Telangana', 'Karnataka', 'Tamil Nadu', 'Kerala', 'Maharashtra', 'Delhi', 'Uttar Pradesh', 'West Bengal', 'Gujarat', 'Rajasthan', 'Madhya Pradesh', 'Bihar', 'Odisha', 'Punjab', 'Haryana', 'Jharkhand', 'Chhattisgarh', 'Assam', 'Goa', 'Uttarakhand', 'Himachal Pradesh', 'Jammu and Kashmir', 'Sikkim', 'Meghalaya', 'Manipur', 'Mizoram', 'Nagaland', 'Tripura', 'Arunachal Pradesh'];

export default function BloodRequest() {
  const [form, setForm] = useState({
    patient_name: '', blood_group_needed: '', units_needed: 1, urgency: 'standard',
    hospital_name: '', hospital_address: '', hospital_city: '', hospital_state: '', hospital_pincode: '',
    contact_name: '', contact_phone: '', additional_notes: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: '' });
  };

  const validate = () => {
    const errs = {};
    if (!form.patient_name || form.patient_name.length < 2) errs.patient_name = 'Enter patient name.';
    if (!form.blood_group_needed) errs.blood_group_needed = 'Select a blood group.';
    if (!form.units_needed || form.units_needed < 1 || form.units_needed > 10) errs.units_needed = 'Enter 1–10 units.';
    if (!form.hospital_name) errs.hospital_name = 'Enter hospital name.';
    if (!form.hospital_address || form.hospital_address.length < 5) errs.hospital_address = 'Enter full hospital address.';
    if (!form.hospital_city) errs.hospital_city = 'Enter city.';
    if (!form.hospital_state) errs.hospital_state = 'Select state.';
    if (!/^\d{6}$/.test(form.hospital_pincode)) errs.hospital_pincode = 'Enter a valid 6-digit PIN code.';
    if (!form.contact_name) errs.contact_name = 'Enter contact name.';
    if (!/^[6-9]\d{9}$/.test(form.contact_phone)) errs.contact_phone = 'Enter a valid 10-digit mobile.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) return setErrors(errs);

    setLoading(true);
    try {
      const { data } = await requestAPI.create(form);
      setSuccess(data.data);
      toast.success('Blood request submitted successfully!');
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to submit request.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="page">
        <div className="container" style={{ maxWidth: 600 }}>
          <div className="success-card animate-fade-in">
            <div className="success-icon">
              <CheckCircle size={64} />
            </div>
            <h2>Request Submitted!</h2>
            <p className="text-muted">Your blood request has been received.</p>
            <div className="success-details">
              <div className="success-detail">
                <span className="success-label">Request ID</span>
                <span className="success-value">RVR-{success.request.id}</span>
              </div>
              <div className="success-detail">
                <span className="success-label">Blood Group</span>
                <span className="badge badge-blood">{success.request.blood_group_needed}</span>
              </div>
              <div className="success-detail">
                <span className="success-label">Status</span>
                <span className="badge badge-active">Processing</span>
              </div>
            </div>
            <p className="success-message">{success.message}</p>
            <div className="success-actions">
              <button className="btn btn-primary" onClick={() => navigate(`/request/${success.request.id}/status`)}>
                Track Status
              </button>
              <button className="btn btn-ghost" onClick={() => navigate('/')}>
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 800 }}>
        <div className="page-header">
          <div className="page-header-icon page-header-icon-red">
            <HeartPulse size={28} />
          </div>
          <div>
            <h1>Request Blood</h1>
            <p className="text-muted">Fill out the form below to request blood for a patient. Matching donors will be notified immediately.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card request-form" autoComplete="off">
          {/* Patient Info */}
          <div className="form-section">
            <h3 className="form-section-title"><Droplet size={18} /> Patient Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="patient_name">Patient Name <span className="required">*</span></label>
                <input id="patient_name" name="patient_name" className={`form-input ${errors.patient_name ? 'error' : ''}`} placeholder="Full name of patient" value={form.patient_name} onChange={handleChange} autoComplete="off" />
                {errors.patient_name && <span className="form-error">{errors.patient_name}</span>}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="blood_group_needed">Blood Group <span className="required">*</span></label>
                <select id="blood_group_needed" name="blood_group_needed" className={`form-select ${errors.blood_group_needed ? 'error' : ''}`} value={form.blood_group_needed} onChange={handleChange}>
                  <option value="">Select blood group</option>
                  {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                {errors.blood_group_needed && <span className="form-error">{errors.blood_group_needed}</span>}
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="units_needed">Units Needed <span className="required">*</span></label>
                <input id="units_needed" name="units_needed" type="number" min="1" max="10" className={`form-input ${errors.units_needed ? 'error' : ''}`} value={form.units_needed} onChange={handleChange} autoComplete="off" />
                {errors.units_needed && <span className="form-error">{errors.units_needed}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Urgency Level <span className="required">*</span></label>
                <div className="urgency-selector">
                  {['critical', 'urgent', 'standard'].map(u => (
                    <label key={u} className={`urgency-option urgency-${u} ${form.urgency === u ? 'active' : ''}`}>
                      <input type="radio" name="urgency" value={u} checked={form.urgency === u} onChange={handleChange} />
                      <span>{u.charAt(0).toUpperCase() + u.slice(1)}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Hospital Info */}
          <div className="form-section">
            <h3 className="form-section-title"><Building2 size={18} /> Hospital Details</h3>
            <div className="form-group">
              <label className="form-label" htmlFor="hospital_name">Hospital Name <span className="required">*</span></label>
              <input id="hospital_name" name="hospital_name" className={`form-input ${errors.hospital_name ? 'error' : ''}`} placeholder="e.g., City General Hospital" value={form.hospital_name} onChange={handleChange} autoComplete="off" />
              {errors.hospital_name && <span className="form-error">{errors.hospital_name}</span>}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="hospital_address">Hospital Address <span className="required">*</span></label>
              <textarea id="hospital_address" name="hospital_address" className={`form-textarea ${errors.hospital_address ? 'error' : ''}`} placeholder="Full street address" rows={2} value={form.hospital_address} onChange={handleChange} autoComplete="off" />
              {errors.hospital_address && <span className="form-error">{errors.hospital_address}</span>}
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="hospital_city">City <span className="required">*</span></label>
                <input id="hospital_city" name="hospital_city" className={`form-input ${errors.hospital_city ? 'error' : ''}`} placeholder="City" value={form.hospital_city} onChange={handleChange} autoComplete="off" />
                {errors.hospital_city && <span className="form-error">{errors.hospital_city}</span>}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="hospital_state">State <span className="required">*</span></label>
                <select id="hospital_state" name="hospital_state" className={`form-select ${errors.hospital_state ? 'error' : ''}`} value={form.hospital_state} onChange={handleChange}>
                  <option value="">Select state</option>
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors.hospital_state && <span className="form-error">{errors.hospital_state}</span>}
              </div>
            </div>
            <div className="form-group" style={{ maxWidth: 200 }}>
              <label className="form-label" htmlFor="hospital_pincode">PIN Code <span className="required">*</span></label>
              <input id="hospital_pincode" name="hospital_pincode" className={`form-input ${errors.hospital_pincode ? 'error' : ''}`} placeholder="500001" maxLength={6} value={form.hospital_pincode} onChange={handleChange} autoComplete="off" />
              {errors.hospital_pincode && <span className="form-error">{errors.hospital_pincode}</span>}
            </div>
          </div>

          {/* Contact */}
          <div className="form-section">
            <h3 className="form-section-title"><Phone size={18} /> Contact Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="contact_name">Contact Person <span className="required">*</span></label>
                <input id="contact_name" name="contact_name" className={`form-input ${errors.contact_name ? 'error' : ''}`} placeholder="Name at hospital" value={form.contact_name} onChange={handleChange} autoComplete="off" />
                {errors.contact_name && <span className="form-error">{errors.contact_name}</span>}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="contact_phone">Contact Phone <span className="required">*</span></label>
                <input id="contact_phone" name="contact_phone" type="tel" className={`form-input ${errors.contact_phone ? 'error' : ''}`} placeholder="9876543210" maxLength={10} value={form.contact_phone} onChange={handleChange} autoComplete="off" />
                {errors.contact_phone && <span className="form-error">{errors.contact_phone}</span>}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="form-section">
            <h3 className="form-section-title"><FileText size={18} /> Additional Notes</h3>
            <div className="form-group">
              <textarea name="additional_notes" className="form-textarea" placeholder="Any additional information (e.g., surgery time, special requirements)" rows={3} value={form.additional_notes} onChange={handleChange} maxLength={500} />
              <span className="form-helper">{form.additional_notes.length}/500 characters</span>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
            {loading ? <><div className="spinner"></div> Submitting Request...</> : <><HeartPulse size={20} /> Submit Blood Request</>}
          </button>
        </form>
      </div>
    </div>
  );
}
