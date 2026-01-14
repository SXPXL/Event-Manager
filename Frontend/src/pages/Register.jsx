import { useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../api';

const Register = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({ name: '', email: '', phone: '', college: '' });

  // ✅ UPDATED: Handle Change with Phone Validation
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'phone') {
      // 1. Remove any non-number character (Prevent letters/symbols)
      const numericValue = value.replace(/\D/g, '');

      // 2. Limit to 10 digits (Standard mobile number length)
      if (numericValue.length <= 10) {
        setFormData({ ...formData, [name]: numericValue });
      }
    } else {
      // Default behavior for other fields
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); 
    setError(null);

    // ✅ UPDATED: Validate Phone Length before submitting
    if (formData.phone.length !== 10) {
      setError("Please enter a valid 10-digit phone number.");
      setLoading(false);
      return;
    }

    try {
      const res = await API.post('/users', formData);
      setUserEmail(res.data.email);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="page-container">
        <div className="glass-card" style={{ maxWidth: '450px', textAlign: 'center', borderColor: 'var(--success)' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
          <h2 style={{ color: 'var(--success)', marginBottom: '1rem' }}>Registration Successful</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: '1.6' }}>
            We have sent your unique Access Code (UID) to <br/><strong style={{color: 'white'}}>{userEmail}</strong>
          </p>
          <Link to="/" className="btn">Back to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="glass-card" style={{ maxWidth: '500px' }}>
        <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
          &larr; Back to Login
        </Link>

        <h2 className="title-gradient" style={{ marginBottom: '0.5rem' }}>Create Profile</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Fill in your details to generate your ID.</p>

        {error && <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', marginBottom: '1.5rem', borderRadius: 'var(--radius)' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input name="name" type="text" required placeholder="John Doe" value={formData.name} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input name="email" type="email" required placeholder="john@college.edu" value={formData.email} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <input 
              name="phone" 
              type="tel" 
              required 
              placeholder="9876543210" 
              value={formData.phone} 
              onChange={handleChange} 
              // Optional: HTML5 pattern for extra browser-native validation
              pattern="[0-9]{10}"
              title="Please enter exactly 10 digits"
            />
          </div>

          <div className="form-group">
            <label>College</label>
            <input name="college" type="text" required placeholder="XYZ Institute" value={formData.college} onChange={handleChange} />
          </div>

          <button type="submit" className="btn" disabled={loading} style={{ marginTop: '1rem' }}>
            {loading ? 'Generating ID...' : 'Get Access Code'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;