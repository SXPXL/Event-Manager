import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [creds, setCreds] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // 1. New Endpoint: Matches Backend/api/auth_routes.py
      const res = await API.post('/admin/login', creds);
      
      // 2. Save Token: Key must be 'admin_token' to match api.js
      localStorage.setItem('admin_token', res.data.access_token);
    
      // 3. Save User: The backend now gives a clean 'user' object in the response
      localStorage.setItem('admin_user', JSON.stringify(res.data.user));

      // 4. Redirect to Dashboard
      navigate('/admin/dashboard'); 

    } catch (err) {
      console.error(err);
      // Show the specific error message from the backend (e.g. "Invalid credentials")
      alert("Login Failed: " + (err.response?.data?.detail || 'Unknown error') );
    }
};

  return (
    <div className="page-container">
      <div className="glass-card" style={{ maxWidth: '400px' }}>
        <h2 className="title-gradient" style={{ textAlign: 'center', marginBottom: '2rem' }}>Staff Portal</h2>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <input placeholder="Username" value={creds.username} onChange={e => setCreds({...creds, username: e.target.value})} />
          </div>
          <div className="form-group">
            <input type="password" placeholder="PIN / Password" value={creds.password} onChange={e => setCreds({...creds, password: e.target.value})} />
          </div>
          {error && <p style={{ color: 'var(--danger)', marginBottom: '1rem', textAlign: 'center' }}>{error}</p>}
          <button className="btn">Login Securely</button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;