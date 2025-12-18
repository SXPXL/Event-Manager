import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../api'; 

const Landing = () => {
  const [uid, setUid] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleCheck = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await API.get(`/check-uid/${uid.trim()}`);
      if (res.data.exists) {
        navigate('/dashboard', { state: { uid: res.data.user.uid } });
      } else {
        setError("UID not found.");
      }
    } catch (err) {
      setError("Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 className="title-gradient" style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>EventFlow</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>The Next-Gen Tech Fest Portal</p>
      </div>

      <div className="glass-card" style={{ maxWidth: '450px' }}>
        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem' }}>Login to Dashboard</h3>
        
        <form onSubmit={handleCheck}>
          <div className="form-group">
            <label>ENTER ACCESS CODE</label>
            <input 
              type="text" 
              placeholder="e.g. EVT-8X29A" 
              value={uid}
              onChange={(e) => setUid(e.target.value.toUpperCase())}
              disabled={loading}
              style={{ fontSize: '1.2rem', letterSpacing: '2px', textAlign: 'center', fontWeight: 'bold' }}
            />
          </div>
          
          <button type="submit" className="btn" disabled={loading}>
            {loading ? "Verifying..." : "Enter Portal →"}
          </button>
        </form>

        {error && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius)', color: '#f87171', textAlign: 'center' }}>
            {error}
          </div>
        )}
        
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)', textAlign: 'center' }}>
          <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>New Participant?</p>
          <Link to="/register" className="btn btn-secondary">
            Register New Account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Landing;