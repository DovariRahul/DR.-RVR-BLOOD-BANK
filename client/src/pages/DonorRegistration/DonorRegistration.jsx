import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { donorAPI } from '../../services/api';
import { Heart, Droplet, User, MapPin, Shield, CheckCircle } from 'lucide-react';
import '../BloodRequest/BloodRequest.css';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const STATES = ['Andhra Pradesh', 'Telangana', 'Karnataka', 'Tamil Nadu', 'Kerala', 'Maharashtra', 'Delhi', 'Uttar Pradesh', 'West Bengal', 'Gujarat', 'Rajasthan', 'Madhya Pradesh', 'Bihar', 'Odisha', 'Punjab', 'Haryana', 'Jharkhand', 'Chhattisgarh', 'Assam', 'Goa'];

export default function DonorRegistration() {
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: user?.full_name || '', email: user?.email || '', phone: user?.phone || '+91', password: '',
    age: '', gender: '', blood_group: '', weight_kg: '',
    last_donation_date: '', medical_conditions: '',
    address_line: '', city: '', state: '', pincode: '',
    notification_opt_in: true
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const handleChange = (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm({ ...form, [e.target.name]: val });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: '' });
  };

  const validate = () => {
    const errs = {};
    if (!isAuthenticated) {
      if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email.';
      if (!form.password || form.password.length < 8) errs.password = 'Password must be at least 8 characters.';
    }
    if (!form.full_name || form.full_name.length < 2) errs.full_name = 'Enter your full name.';
    if (!form.phone || !/^\+?[0-9]{10,15}$/.test(form.phone)) errs.phone = 'Enter a valid mobile number.';
    if (!form.age || form.age < 18 || form.age > 65) errs.age = 'Age must be between 18 and 65.';
    if (!form.gender) errs.gender = 'Select your gender.';
    if (!form.blood_group) errs.blood_group = 'Select your blood group.';
    if (!form.weight_kg || form.weight_kg < 50) errs.weight_kg = 'Weight must be at least 50 kg.';
    if (!form.address_line || form.address_line.length < 5) errs.address_line = 'Enter your full address.';
    if (!form.city) errs.city = 'Enter your city.';
    if (!form.state) errs.state = 'Select your state.';
    if (!/^\d{6}$/.test(form.pincode)) errs.pincode = 'Enter a valid 6-digit PIN code.';
    if (!agreed) errs.terms = 'You must agree to the terms.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) return setErrors(errs);

    setLoading(true);
    try {
      const year = new Date().getFullYear() - parseInt(form.age, 10);
      const payload = { ...form, date_of_birth: `${year}-01-01` };
      await donorAPI.register(payload);
      setSuccess(true);
      toast.success('Donor registration successful!');
    } catch (error) {
      const msg = error.response?.data?.message || 'Registration failed.';
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
            <div className="success-icon"><CheckCircle size={64} /></div>
            <h2>Welcome to RVR Blood Bank! 🩸</h2>
            <p className="text-muted">You're now registered as a blood donor. Thank you for your willingness to save lives.</p>
            <div className="success-actions" style={{ marginTop: 24 }}>
              <button className="btn btn-primary" onClick={() => navigate('/donor/profile')}>View My Profile</button>
              <button className="btn btn-ghost" onClick={() => navigate('/')}>Back to Home</button>
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
          <div className="page-header-icon page-header-icon-orange"><Heart size={28} /></div>
          <div>
            <h1>Become a Donor</h1>
            <p className="text-muted">Register as a blood donor and get notified when someone near you needs blood.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card request-form">
          {/* Account Info (guests only) */}
          {!isAuthenticated && (
            <div className="form-section">
              <h3 className="form-section-title"><User size={18} /> Account Information</h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Email <span className="required">*</span></label>
                  <input name="email" type="email" className={`form-input ${errors.email ? 'error' : ''}`} value={form.email} onChange={handleChange} />
                  {errors.email && <span className="form-error">{errors.email}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Password <span className="required">*</span></label>
                  <input name="password" type="password" className={`form-input ${errors.password ? 'error' : ''}`} placeholder="Min 8 characters" value={form.password} onChange={handleChange} />
                  {errors.password && <span className="form-error">{errors.password}</span>}
                </div>
              </div>

            </div>
          )}

          {/* Donor Details */}
          <div className="form-section">
            <h3 className="form-section-title"><Droplet size={18} /> Donor Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Full Name <span className="required">*</span></label>
                <input name="full_name" className={`form-input ${errors.full_name ? 'error' : ''}`} value={form.full_name} onChange={handleChange} />
                {errors.full_name && <span className="form-error">{errors.full_name}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Age <span className="required">*</span></label>
                <input name="age" type="number" min="18" max="65" className={`form-input ${errors.age ? 'error' : ''}`} placeholder="E.g. 25" value={form.age} onChange={handleChange} />
                {errors.age && <span className="form-error">{errors.age}</span>}
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Gender <span className="required">*</span></label>
                <select name="gender" className={`form-select ${errors.gender ? 'error' : ''}`} value={form.gender} onChange={handleChange}>
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                {errors.gender && <span className="form-error">{errors.gender}</span>}
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Blood Group <span className="required">*</span></label>
                <select name="blood_group" className={`form-select ${errors.blood_group ? 'error' : ''}`} value={form.blood_group} onChange={handleChange}>
                  <option value="">Select blood group</option>
                  {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                {errors.blood_group && <span className="form-error">{errors.blood_group}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Weight (kg) <span className="required">*</span></label>
                <input name="weight_kg" type="number" min="50" className={`form-input ${errors.weight_kg ? 'error' : ''}`} placeholder="Min 50 kg" value={form.weight_kg} onChange={handleChange} />
                {errors.weight_kg && <span className="form-error">{errors.weight_kg}</span>}
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Phone Number <span className="required">*</span></label>
                <input name="phone" type="tel" className={`form-input ${errors.phone ? 'error' : ''}`} placeholder="9876543210" value={form.phone} onChange={handleChange} />
                {errors.phone && <span className="form-error">{errors.phone}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Last Donation Date</label>
                <input name="last_donation_date" type="date" className="form-input" value={form.last_donation_date} onChange={handleChange} />
                <span className="form-helper">Leave empty if never donated</span>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Medical Conditions</label>
                <input name="medical_conditions" className="form-input" placeholder="Optional" value={form.medical_conditions} onChange={handleChange} />
              </div>
              <div className="form-group">
                 {/* Empty group for spacing */}
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="form-section">
            <h3 className="form-section-title"><MapPin size={18} /> Address</h3>
            <div className="form-group">
              <label className="form-label">Address <span className="required">*</span></label>
              <textarea name="address_line" className={`form-textarea ${errors.address_line ? 'error' : ''}`} rows={2} placeholder="Full street address" value={form.address_line} onChange={handleChange} />
              {errors.address_line && <span className="form-error">{errors.address_line}</span>}
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">City <span className="required">*</span></label>
                <input name="city" className={`form-input ${errors.city ? 'error' : ''}`} value={form.city} onChange={handleChange} />
                {errors.city && <span className="form-error">{errors.city}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">State <span className="required">*</span></label>
                <select name="state" className={`form-select ${errors.state ? 'error' : ''}`} value={form.state} onChange={handleChange}>
                  <option value="">Select state</option>
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors.state && <span className="form-error">{errors.state}</span>}
              </div>
            </div>
            <div className="form-group" style={{ maxWidth: 200 }}>
              <label className="form-label">PIN Code <span className="required">*</span></label>
              <input name="pincode" className={`form-input ${errors.pincode ? 'error' : ''}`} placeholder="500001" maxLength={6} value={form.pincode} onChange={handleChange} />
              {errors.pincode && <span className="form-error">{errors.pincode}</span>}
            </div>
          </div>

          {/* Preferences */}
          <div className="form-section">
            <h3 className="form-section-title"><Shield size={18} /> Preferences & Consent</h3>
            <label className="form-check" style={{ marginBottom: 12 }}>
              <input type="checkbox" name="notification_opt_in" checked={form.notification_opt_in} onChange={handleChange} />
              <span>Receive SMS notifications when matching blood requests are submitted</span>
            </label>
            <label className="form-check">
              <input type="checkbox" checked={agreed} onChange={(e) => { setAgreed(e.target.checked); if (errors.terms) setErrors({ ...errors, terms: '' }); }} />
              <span>I agree to the Terms of Service and consent to sharing my data for blood donation matching</span>
            </label>
            {errors.terms && <span className="form-error" style={{ marginTop: 4 }}>{errors.terms}</span>}
          </div>

          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
            {loading ? <><div className="spinner"></div> Registering...</> : <><Heart size={20} /> Register as Donor</>}
          </button>
        </form>
      </div>
    </div>
  );
}
