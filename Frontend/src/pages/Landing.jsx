import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom'; // Added useLocation
import API from '../api'; 

const Landing = () => {
  const [uid, setUid] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation(); // Hook to read URL

  // --- SHADOW CLAIM STATE ---
  const [isShadow, setIsShadow] = useState(false);
  const [shadowData, setShadowData] = useState({ name: '', phone: '', college: '' });

  // --- 1. SPOT MODE DETECTOR ---
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('mode') === 'spot') {
        sessionStorage.setItem('spotMode', 'true');
        console.log("⚠️ Spot Registration Mode Activated");
    }
  }, [location]);

  const handleCheck = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await API.get(`/check-uid/${uid.trim()}`);
      
      console.log("Check UID Response:", res.data);

      if (res.data.exists) {
        const user = res.data.user;

        if (user.is_shadow) {
            console.log("Shadow Account Detected!");
            setIsShadow(true);
            setShadowData({ 
                name: user.name, 
                phone: '', 
                college: user.college || '' 
            });
        } else {
            navigate('/dashboard', { state: { uid: user.uid } });
        }
      } else {
        setError("UID not found.");
      }
    } catch (err) {
      console.error(err);
      setError("Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteProfile = async (e) => {
      e.preventDefault();
      setLoading(true);
      try {
          await API.put(`/users/${uid.trim()}`, shadowData);
          alert("Profile Completed! Welcome.");
          navigate('/dashboard', { state: { uid: uid.trim() } });
      } catch (err) {
          setError("Failed to update profile.");
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="page-container">
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 className="title-gradient" style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>Srishti 2.6</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>Techno-Cultural Fest</p>
      </div>

      <div className="glass-card" style={{ maxWidth: '450px' }}>
        
        {/* --- VIEW 1: NORMAL LOGIN --- */}
        {!isShadow && (
            <>
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem' }}>Login to Dashboard</h3>
                <form onSubmit={handleCheck}>
                <div className="form-group">
                    <label>ENTER ACCESS CODE</label>
                    <input 
                        type="text" 
                        placeholder="e.g. 8X29A" 
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
            </>
        )}

        {/* --- VIEW 2: SHADOW COMPLETION FORM --- */}
        {isShadow && (
            <form onSubmit={handleCompleteProfile}>
                <div style={{textAlign:'center', marginBottom:'1.5rem'}}>
                    <div style={{fontSize:'3rem'}}>👋</div>
                    <h3>Welcome, {shadowData.name}!</h3>
                    <p style={{color:'var(--accent)', fontSize:'0.9rem', background:'rgba(59, 130, 246, 0.1)', padding:'10px', borderRadius:'8px'}}>
                        Your team leader added you. <br/>
                        <b>Please complete your details to enter.</b>
                    </p>
                </div>

                <div className="form-group">
                    <label>Full Name</label>
                    <input 
                        value={shadowData.name} 
                        style={{ opacity: 0.7, cursor: 'not-allowed' }}
                    />
                </div>
                <div className="form-group">
                    <label>Phone Number</label>
                    <input 
                        value={shadowData.phone} 
                        onChange={e => setShadowData({...shadowData, phone: e.target.value})} 
                        placeholder="+91..."
                        required 
                        autoFocus
                    />
                </div>
                <div className="form-group">
                    <label>College</label>
                    <input 
                        value={shadowData.college} 
                        onChange={e => setShadowData({...shadowData, college: e.target.value})} 
                        placeholder="Institute Name"
                        required 
                    />
                </div>

                <button type="submit" className="btn" disabled={loading} style={{ marginTop: '1rem' }}>
                    {loading ? "Saving..." : "Complete & Enter"}
                </button>
            </form>
        )}

      </div>
    </div>
  );
};

export default Landing;