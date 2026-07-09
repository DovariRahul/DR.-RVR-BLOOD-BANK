import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Droplet, User, Mail, Phone, Lock, Eye, EyeOff } from 'lucide-react';
import './Auth.css';

export default function SignUp() {
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', password: '', confirm_password: '', role: 'patient', blood_group: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: '' });
  };

  const validate = () => {
    const errs = {};
    if (!form.full_name || form.full_name.length < 2) errs.full_name = 'Enter your full name (min 2 characters).';
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email address.';
    if (!form.phone || !/^[6-9]\d{9}$/.test(form.phone)) errs.phone = 'Enter a valid 10-digit mobile number.';
    if (!form.password || form.password.length < 8) errs.password = 'Password must be at least 8 characters.';
    if (form.password !== form.confirm_password) errs.confirm_password = 'Passwords do not match.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) return setErrors(errs);

    setLoading(true);
    try {
      const { confirm_password, ...data } = form;
      const user = await register(data);
      toast.success(`Welcome, ${user.full_name}! Account created successfully.`);

      if (form.role === 'donor') {
        navigate('/register/donor');
      } else {
        navigate('/');
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Registration failed.';
      toast.error(msg);

      if (error.response?.data?.errors) {
        const fieldErrors = {};
        error.response.data.errors.forEach(e => { fieldErrors[e.field] = e.message; });
        setErrors(fieldErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card animate-fade-in">
          <div className="auth-header">
            <div className="auth-logo">
              <div className="brand-icon"><Droplet size={24} /></div>
            </div>
            <h1>Create Account</h1>
            <p className="text-muted">Join RVR Blood Bank and start saving lives</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label" htmlFor="signup-name">Full Name <span className="required">*</span></label>
              <div className="input-icon-wrapper">
                <User size={18} className="input-icon" />
                <input id="signup-name" name="full_name" type="text" className={`form-input input-with-icon ${errors.full_name ? 'error' : ''}`} placeholder="Your full name" value={form.full_name} onChange={handleChange} />
              </div>
              {errors.full_name && <span className="form-error">{errors.full_name}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="signup-email">Email <span className="required">*</span></label>
              <div className="input-icon-wrapper">
                <Mail size={18} className="input-icon" />
                <input id="signup-email" name="email" type="email" className={`form-input input-with-icon ${errors.email ? 'error' : ''}`} placeholder="you@example.com" value={form.email} onChange={handleChange} />
              </div>
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="signup-phone">Phone Number <span className="required">*</span></label>
              <div className="input-icon-wrapper">
                <Phone size={18} className="input-icon" />
                <input id="signup-phone" name="phone" type="tel" className={`form-input input-with-icon ${errors.phone ? 'error' : ''}`} placeholder="9876543210" value={form.phone} onChange={handleChange} />
              </div>
              {errors.phone && <span className="form-error">{errors.phone}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="signup-blood-group">Blood Group <span style={{fontSize:'12px',color:'var(--color-text-muted)',fontWeight:400}}>(optional — helps notify you for matching requests)</span></label>
              <div className="input-icon-wrapper">
                <Droplet size={18} className="input-icon" />
                <select id="signup-blood-group" name="blood_group" className="form-select input-with-icon" value={form.blood_group} onChange={handleChange}>
                  <option value="">Select blood group (optional)</option>
                  {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="signup-password">Password <span className="required">*</span></label>
                <div className="input-icon-wrapper">
                  <Lock size={18} className="input-icon" />
                  <input id="signup-password" name="password" type={showPassword ? 'text' : 'password'} className={`form-input input-with-icon ${errors.password ? 'error' : ''}`} placeholder="Min 8 characters" value={form.password} onChange={handleChange} />
                  <button type="button" className="input-toggle" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <span className="form-error">{errors.password}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="signup-confirm">Confirm Password <span className="required">*</span></label>
                <div className="input-icon-wrapper">
                  <Lock size={18} className="input-icon" />
                  <input id="signup-confirm" name="confirm_password" type="password" className={`form-input input-with-icon ${errors.confirm_password ? 'error' : ''}`} placeholder="Re-enter password" value={form.confirm_password} onChange={handleChange} />
                </div>
                {errors.confirm_password && <span className="form-error">{errors.confirm_password}</span>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">I want to <span className="required">*</span></label>
              <div className="role-selector">
                <label className={`role-option ${form.role === 'patient' ? 'active' : ''}`}>
                  <input type="radio" name="role" value="patient" checked={form.role === 'patient'} onChange={handleChange} />
                  <Droplet size={20} />
                  <span>Request Blood</span>
                </label>
                <label className={`role-option ${form.role === 'donor' ? 'active' : ''}`}>
                  <input type="radio" name="role" value="donor" checked={form.role === 'donor'} onChange={handleChange} />
                  <User size={20} />
                  <span>Donate Blood</span>
                </label>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
              {loading ? <><div className="spinner"></div> Creating account...</> : 'Create Account'}
            </button>
          </form>

          <div className="auth-footer">
            <p>Already have an account? <Link to="/login">Sign In</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}
