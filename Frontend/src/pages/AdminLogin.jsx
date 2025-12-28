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
      const res = await API.post('/admin/login', creds);
      localStorage.setItem('token', res.data.token);
    
    // 2. Create the User Object (combining role, name, id)
    const userData = {
      id: res.data.id,       // Crucial for Walk-in/Cashier
      name: res.data.name || res.data.username, 
      role: res.data.role
    };

    // 3. Save as a JSON string with the key 'user'
    localStorage.setItem('user', JSON.stringify(userData));

    // 4. Redirect to Dashboard
    navigate('/admin/dashboard'); 

  } catch (err) {
    alert("Login Failed");
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