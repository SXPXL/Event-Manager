import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import API from '../api';

const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const uid = location.state?.uid;

  // --- DATA STATE ---
  const [user, setUser] = useState(null);
  const [myEvents, setMyEvents] = useState([]);
  const [availableEvents, setAvailableEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- STACK (CART) STATE ---
  const [eventStack, setEventStack] = useState([]); // Array of { event_id, fee, name, team_details... }
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState('ONLINE'); // 'ONLINE' or 'CASH'
  const [cashToken, setCashToken] = useState('');

  // --- MODAL STATE (For filling group details) ---
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [teamName, setTeamName] = useState('');
  const [teammates, setTeammates] = useState([{ name: '', email: '' }]);

  useEffect(() => {
    if (!uid) { navigate('/'); return; }
    fetchDashboardData();
  }, [uid]);

  const fetchDashboardData = async () => {
    try {
      const [userRes, eventsRes] = await Promise.all([
        API.get(`/check-uid/${uid}`),
        API.get('/events')
      ]);

      if (userRes.data.exists) {
        setUser(userRes.data.user);
        setMyEvents(userRes.data.registered_events);
        
        // Filter events: Remove those already registered
        const myEventIds = new Set(userRes.data.registered_events.map(e => e.id));
        setAvailableEvents(eventsRes.data.filter(e => !myEventIds.has(e.id)));
      } else { navigate('/'); }
    } catch (err) { alert("Failed to load dashboard."); } finally { setLoading(false); }
  };

  // --- STACK LOGIC ---

  const addToStack = (event, teamData = null) => {
    // Check if already in stack
    if (eventStack.find(item => item.event_id === event.id)) {
      alert("Already in your stack!");
      return;
    }

    const item = {
      event_id: event.id,
      name: event.name,
      fee: event.fee,
      type: event.type,
      // If group, attach details. If solo, these are null/empty
      team_name: teamData ? teamData.teamName : null,
      teammates: teamData ? teamData.teammates : []
    };

    setEventStack([...eventStack, item]);
    setSelectedEvent(null); // Close modal if open
    // Reset form
    setTeamName('');
    setTeammates([{ name: '', email: '' }]);
  };

  const removeFromStack = (eventId) => {
    setEventStack(eventStack.filter(item => item.event_id !== eventId));
  };

  const calculateTotal = () => eventStack.reduce((sum, item) => sum + item.fee, 0);

  // --- CHECKOUT LOGIC (BULK REGISTER) ---

  const handleCheckout = async () => {
    try {
      const payload = {
        leader_uid: user.uid,
        items: eventStack.map(item => ({
          event_id: item.event_id,
          team_name: item.team_name,
          teammates: item.teammates
        })),
        payment_mode: paymentMode,
        // Mocking Online Payment for now as requested
        razorpay_payment_id: paymentMode === 'ONLINE' ? "pay_mock_123456" : null,
        cash_token: paymentMode === 'CASH' ? cashToken : null
      };

      const res = await API.post('/events/register-bulk', payload);
      
      alert(`Success! ${res.data.message}`);
      setEventStack([]); // Clear stack
      setIsCheckoutOpen(false);
      setCashToken('');
      fetchDashboardData(); // Refresh to see new registered events

    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Registration Failed");
    }
  };

  // --- RENDER HELPERS ---
  
  const handleTeammateChange = (idx, field, val) => { const newM = [...teammates]; newM[idx][field] = val; setTeammates(newM); };
  const addTeammateRow = () => teammates.length < (selectedEvent.max_team_size - 1) ? setTeammates([...teammates, { name: '', email: '' }]) : alert("Max size reached");

  if (loading) return <div className="page-container">Loading...</div>;

  return (
    <div className="dashboard-container" style={{ paddingBottom: '100px' }}> {/* Padding for floating bar */}
      
      {/* 1. HEADER */}
      <div className="glass-card" style={{ marginBottom: '3rem', display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', margin: 0 }}>{user.name}</h1>
          <span className="badge badge-neutral">{user.uid}</span>
        </div>
      </div>

      {/* 2. MY REGISTERED EVENTS */}
      <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>REGISTERED EVENTS</h3>
      <div className="grid-cards" style={{ marginBottom: '4rem' }}>
        {myEvents.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No confirmed registrations yet.</div>}
        {myEvents.map(event => (
          <div key={event.id} className="glass-card" style={{ borderLeft: '4px solid var(--success)', padding: '1.5rem' }}>
            <span className="badge badge-success" style={{ marginBottom: '0.8rem', display: 'inline-block' }}>PAID & CONFIRMED</span>
            <h3 style={{ fontSize: '1.25rem' }}>{event.name}</h3>
          </div>
        ))}
      </div>

      {/* 3. AVAILABLE EVENTS */}
      <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>AVAILABLE EVENTS</h3>
      <div className="grid-cards">
        {availableEvents.map(event => {
          const isInStack = eventStack.find(i => i.event_id === event.id);
          return (
            <div key={event.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', borderColor: isInStack ? 'var(--primary)' : 'var(--glass-border)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span className="badge badge-neutral">{event.type}</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>₹{event.fee}</span>
                </div>
                <h3 style={{ fontSize: '1.5rem' }}>{event.name}</h3>
                <p style={{ color: 'var(--text-muted)' }}>Max Team: {event.max_team_size}</p>
              </div>

              {isInStack ? (
                <button className="btn btn-secondary" style={{ marginTop: '1.5rem', borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={() => removeFromStack(event.id)}>
                  Remove from Stack
                </button>
              ) : (
                <button className="btn" style={{ marginTop: '1.5rem' }} onClick={() => {
                  if (event.type === 'SOLO') addToStack(event);
                  else setSelectedEvent(event); // Open modal for Group
                }}>
                  Add to Stack +
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* 4. FLOATING ACTION BAR (The "Stack") */}
      {eventStack.length > 0 && (
        <div style={{
          position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
          width: '90%', maxWidth: '600px',
          background: 'rgba(20, 20, 25, 0.9)', backdropFilter: 'blur(12px)',
          border: '1px solid var(--primary)', borderRadius: '100px',
          padding: '1rem 2rem', boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 90
        }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>EVENT STACK</div>
            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{eventStack.length} Items • ₹{calculateTotal()}</div>
          </div>
          <button className="btn" style={{ width: 'auto', padding: '10px 30px', borderRadius: '50px' }} onClick={() => setIsCheckoutOpen(true)}>
            Checkout →
          </button>
        </div>
      )}

      {/* 5. GROUP DETAILS MODAL */}
      {selectedEvent && (
        <div className="modal-overlay">
          <div className="glass-card modal-content">
            <h2 style={{ marginBottom: '0.5rem' }}>Configure Team</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>For {selectedEvent.name}</p>
            
            <form onSubmit={async (e) => {
                  e.preventDefault();
                  
                  // 1. Filter empty emails
                  const validTeammates = teammates.filter(t => t.email.trim() !== '');
                  const emailsToCheck = validTeammates.map(t => t.email);

                  // 2. Validate with Backend BEFORE adding to stack
                  if (emailsToCheck.length > 0) {
                    try {
                      // Show simple loading state (optional)
                      const res = await API.post('/events/validate-team', {
                        event_id: selectedEvent.id,
                        emails: emailsToCheck,
                        leader_uid: user.uid // <--- FIX ADDED HERE
                      });

                      if (!res.data.valid) {
                        // CONFLICT FOUND! Show alert and STOP.
                        alert(res.data.detail); 
                        return; 
                      }
                    } catch (err) {
                      console.error(err);
                      alert("Validation failed. Check internet connection.");
                      return;
                    }
                  }

                  // 3. If Valid (or Solo), Add to Stack
                  addToStack(selectedEvent, { teamName, teammates: validTeammates });
                }}>
              <div className="form-group">
                <label>Team Name</label>
                <input required placeholder="Code Warriors" value={teamName} onChange={e => setTeamName(e.target.value)} />
              </div>
              <div style={{marginBottom:'0.5rem', display:'flex', justifyContent:'space-between'}}>
                <label>Teammates</label>
                <button type="button" onClick={addTeammateRow} className="btn-ghost" style={{fontSize:'0.8rem'}}>+ Add</button>
              </div>
              {teammates.map((mate, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input required placeholder="Name" value={mate.name} onChange={e => handleTeammateChange(idx, 'name', e.target.value)} />
                  <input required type="email" placeholder="Email" value={mate.email} onChange={e => handleTeammateChange(idx, 'email', e.target.value)} />
                </div>
              ))}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedEvent(null)}>Cancel</button>
                <button type="submit" className="btn">Save to Stack</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. CHECKOUT MODAL */}
      {isCheckoutOpen && (
        <div className="modal-overlay">
          <div className="glass-card modal-content">
            <h2 style={{ marginBottom: '1.5rem' }}>Confirm Registration</h2>
            
            {/* List Items */}
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}>
              {eventStack.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  <span>{item.name}</span>
                  <span>₹{item.fee}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--glass-border)', marginTop: '0.5rem', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                <span>TOTAL</span>
                <span style={{ color: 'var(--primary)' }}>₹{calculateTotal()}</span>
              </div>
            </div>

            {/* Payment Mode Tabs */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <button 
                onClick={() => setPaymentMode('ONLINE')}
                className={paymentMode === 'ONLINE' ? 'btn' : 'btn btn-secondary'}
                style={{ flex: 1 }}
              >
                Online Pay
              </button>
              <button 
                onClick={() => setPaymentMode('CASH')}
                className={paymentMode === 'CASH' ? 'btn' : 'btn btn-secondary'}
                style={{ flex: 1 }}
              >
                Cash Desk
              </button>
            </div>

            {/* Payment Actions */}
            {paymentMode === 'ONLINE' && (
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Mock Online Payment is enabled. <br/>(No money will be deducted)
                </p>
                <button className="btn" onClick={handleCheckout}>Pay & Register</button>
              </div>
            )}

            {paymentMode === 'CASH' && (
              <div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  Enter the Token given by the Volunteer:
                </p>
                <input 
                  placeholder="e.g. CASH-8X92" 
                  value={cashToken} 
                  onChange={e => setCashToken(e.target.value)} 
                  style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: '2px', marginBottom: '1rem' }}
                />
                <button className="btn" onClick={handleCheckout}>Validate Token & Register</button>
              </div>
            )}

            <button className="btn-ghost" style={{ width: '100%', marginTop: '1rem' }} onClick={() => setIsCheckoutOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;