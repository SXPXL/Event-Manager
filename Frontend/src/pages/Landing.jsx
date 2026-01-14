import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import API from '../api'; 

const Landing = () => {
  const [uid, setUid] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // State for toggling Help
  const [showHelp, setShowHelp] = useState(false);

  const navigate = useNavigate();
  const location = useLocation(); 

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
      
      if (res.data.exists) {
        const user = res.data.user;

        if (user.is_shadow) {
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

      // ✅ VALIDATION: Shadow Account Phone Check
      if (shadowData.phone.length !== 10) {
        alert("Please enter a valid 10-digit phone number.");
        setLoading(false);
        return;
      }

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
                {/* 1. New User Section (Top Priority) */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h3 style={{ marginBottom: '0.5rem', fontSize: '1.2rem' }}>New Participant?</h3>
                    <Link to="/register" className="btn" style={{ display: 'block', width: '100%', textAlign: 'center' }}>
                        Register New Account
                    </Link>
                </div>

                {/* Divider */}
                <div style={{ margin: '2rem 0', height: '1px', background: 'var(--glass-border)' }}></div>

                {/* 2. Login Section */}
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    Already have an ID?
                </h3>
                
                <form onSubmit={handleCheck}>
                <div className="form-group">
                    <input 
                        type="text" 
                        placeholder="ENTER ACCESS CODE (e.g. 8X29A)" 
                        value={uid}
                        onChange={(e) => setUid(e.target.value.toUpperCase())}
                        disabled={loading}
                        style={{ fontSize: '1.2rem', letterSpacing: '2px', textAlign: 'center', fontWeight: 'bold' }}
                    />
                </div>
                
                <button type="submit" className="btn btn-secondary" disabled={loading} style={{ width: '100%' }}>
                    {loading ? "Verifying..." : "Login with UID"}
                </button>
                </form>

                {/* 3. Helper Text */}
                <p style={{ fontSize: '0.85rem', color: '#6b7280', fontStyle: 'italic', textAlign: 'center', marginTop: '10px' }}>
                    (Check your email inbox/spam for your UID)
                </p>

                {error && (
                <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius)', color: '#f87171', textAlign: 'center' }}>
                    {error}
                </div>
                )}
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
                        disabled
                    />
                </div>
                <div className="form-group">
                    <label>Phone Number</label>
                    {/* ✅ UPDATED: Phone Validation Logic */}
                    <input 
                        type="tel"
                        value={shadowData.phone} 
                        onChange={e => {
                            const val = e.target.value.replace(/\D/g, '');
                            if (val.length <= 10) setShadowData({...shadowData, phone: val});
                        }} 
                        placeholder="9876543210"
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

        {/* 4. Help Section (Bottom) */}
        <div style={{ marginTop: '2.5rem', textAlign: 'center', borderTop: '1px dashed var(--glass-border)', paddingTop: '1rem' }}>
          <div 
            onClick={() => setShowHelp(!showHelp)} 
            style={{ 
              color: 'var(--text-muted)', 
              cursor: 'pointer', 
              fontSize: '0.9rem', 
              textDecoration: 'underline' 
            }}
          >
            Need Help? Contact Us
          </div>

          {showHelp && (
            <div style={{ marginTop: '1rem', animation: 'fadeIn 0.3s ease-in-out' }}>
               <p style={{ marginBottom: '5px', color: 'white' }}>📞 <strong>Support:</strong> +91 9847113128</p>
               <a 
                 href="https://wa.me/919497269128" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 style={{ color: '#25D366', textDecoration: 'underline', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
               >
                 Chat on WhatsApp
               </a>
               
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Landing;