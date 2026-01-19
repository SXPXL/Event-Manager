import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import API from '../api';
import { load } from '@cashfreepayments/cashfree-js';
import Loading from './components/Loading'; 
import SkeletonCard from './components/SkeletonCard'; // <--- NEW IMPORT
import EventInfoModal from './components/EventInfoModal'; // <--- NEW IMPORT

const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const uid = location.state?.uid || sessionStorage.getItem("active_user_uid");

  // --- DATA STATE ---
  const [user, setUser] = useState(null);
  const [myEvents, setMyEvents] = useState([]);
  const [availableEvents, setAvailableEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- EDIT PROFILE STATE ---
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', college: '' });

  // --- STACK (CART) STATE ---
  const [eventStack, setEventStack] = useState([]); 
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState('ONLINE'); 
  const [cashToken, setCashToken] = useState('');

  // --- MODAL STATES ---
  const [selectedEvent, setSelectedEvent] = useState(null); // For Team Config
  const [viewingEvent, setViewingEvent] = useState(null);   // <--- NEW: For Info Modal
  const [teammates, setTeammates] = useState([{ name: '', email: '' }]);

  //payment processing
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

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

      if (userRes.data && userRes.data.exists) {
        setUser(userRes.data.user);
        sessionStorage.setItem("active_user_uid", userRes.data.user.uid);
        
        setEditForm({
            name: userRes.data.user.name,
            phone: userRes.data.user.phone || '',
            college: userRes.data.user.college || ''
        });

        const allRegistrations = userRes.data.registered_events || [];
        const confirmedEvents = allRegistrations.filter(e => e.payment_status === 'PAID');
        setMyEvents(confirmedEvents);
        
        const takenEventIds = new Set(confirmedEvents.map(e => e.id));
        setAvailableEvents((eventsRes.data || []).filter(e => !takenEventIds.has(e.id)));
      } else {
        navigate('/'); 
      }
    } catch (err) { 
        console.error("Dashboard Load Error:", err);
    } finally { 
        setLoading(false); 
    }
  };

  const handleUpdateProfile = async (e) => {
      e.preventDefault();
      try {
          await API.put(`/users/${user.uid}`, editForm);
          setUser({ ...user, ...editForm }); 
          setIsEditOpen(false);
          alert("Profile updated successfully!");
      } catch (err) {
          alert("Failed to update profile");
      }
  };

  // --- NEW: LOGIC TO OPEN MODAL FIRST ---
  const initiateAddEvent = (event) => {
      // 1. Check if already in stack
      if (eventStack.find(item => item.event_id === event.id)) { 
          alert("Already in your stack!"); 
          return; 
      }
      // 2. Open the Info/Terms Modal
      setViewingEvent(event);
  };

  const confirmAddEvent = () => {
      const event = viewingEvent;
      setViewingEvent(null); // Close Info Modal

      if (event.type === 'SOLO') {
          addToStack(event);
      } else {
          // If Group, now open the Team Modal
          setSelectedEvent(event);
      }
  };

  const addToStack = (event, teamData = null) => {
    const otherItems = eventStack.filter(item => item.event_id !== event.id);
    const item = {
      event_id: event.id, name: event.name, fee: event.fee, type: event.type,
      teammates: teamData ? teamData.teammates : []
    };
    setEventStack([...otherItems, item]);
    setSelectedEvent(null); 
    setTeammates([{ name: '', email: '' }]);
  };

  const removeFromStack = (eventId) => setEventStack(eventStack.filter(item => item.event_id !== eventId));
  const calculateTotal = () => eventStack.reduce((sum, item) => sum + item.fee, 0);

  const handleEditTeam = (stackItem) => {
      const originalEvent = availableEvents.find(e => e.id === stackItem.event_id);
      if (!originalEvent) return;
      setTeammates(stackItem.teammates);
      setSelectedEvent(originalEvent);
  };

  const handleCheckout = async () => {
    setIsProcessingPayment(true);
    try {
      const payload = {
        leader_uid: user.uid,
        items: eventStack.map(item => ({ event_id: item.event_id, teammates: item.teammates })),
        payment_mode: paymentMode,
        cash_token: paymentMode === 'CASH' ? cashToken : null
      };

      const res = await API.post('/events/register-bulk', payload);

      if (paymentMode === 'CASH') {
          alert(`Success! ${res.data.message}`);
          setEventStack([]); 
          setIsCheckoutOpen(false); 
          setCashToken('');
          fetchDashboardData();
          setIsProcessingPayment(false);
      } 
      else if (paymentMode === 'ONLINE') {
          const { payment_session_id, order_id } = res.data.payment_data;
          if (!payment_session_id) { alert("Error: No session."); return; }

          const cashfree = await load({ mode: import.meta.env.VITE_CASHFREE_MODE });
          cashfree.checkout({
              paymentSessionId: payment_session_id,
              redirectTarget: "_self",
              returnUrl: window.location.origin + `/payment-status?order_id=${order_id}`
          });
      }
    } catch (err) { 
        console.error(err); 
        alert(err.response?.data?.detail || "Registration Failed");  
        setIsProcessingPayment(false);
    }
  };
  
  const handleTeammateChange = (idx, field, val) => { const newM = [...teammates]; newM[idx][field] = val; setTeammates(newM); };
  const addTeammateRow = () => teammates.length < (selectedEvent.max_team_size - 1) ? setTeammates([...teammates, { name: '', email: '' }]) : alert("Max size reached");
  const removeTeammate = (index) => { const newM = teammates.filter((_, i) => i !== index); setTeammates(newM); };

  const isSpotMode = sessionStorage.getItem('spotMode') === 'true';

  // --- RENDER ---
  
  // 1. Full Page Loading for Payment
  if (isProcessingPayment) return <Loading message="Redirecting to Payment Gateway..." />;
  
  // 2. Initial Data Loading (Showing Skeleton)
  if (loading || !user) {
      return (
        <div className="dashboard-container">
            <div className="skeleton-box" style={{height:'100px', width:'100%', marginBottom:'2rem', borderRadius:'12px'}}></div>
            <div className="grid-cards">
                {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
            </div>
        </div>
      );
  }

  return (
    <div className="dashboard-container" style={{ paddingBottom: '100px' }}>
      
      {/* 1. HEADER */}
      <div className="glass-card" style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
              <h1 style={{ fontSize: '2.3rem', margin: 0 }}>{user.name}</h1>
              <button onClick={() => setIsEditOpen(true)} className="btn-icon" style={{fontSize: '1.2rem'}}>✎</button>
          </div>
          <span className="badge badge-neutral" style={{fontSize: '1.2rem', marginTop:'0.5rem'}}>{user.uid}</span>
        </div>
      </div>

      {/* EDIT PROFILE MODAL */}
      {isEditOpen && (
<div className="modal-overlay">
    <div className="glass-card modal-content">
        <h2 style={{ marginBottom: '1.5rem' }}>Edit Profile</h2>
        
        <form onSubmit={(e) => {
            e.preventDefault();
            // ✅ VALIDATION: Check for exactly 10 digits
            if (editForm.phone.length !== 10) {
                alert("Please enter a valid 10-digit phone number.");
                return;
            }
            handleUpdateProfile(e);
        }}>
            
            <div style={{marginBottom:'1rem'}}>
                <label style={{display:'block', marginBottom:'5px', color:'var(--text-muted)'}}>Full Name</label>
                <input 
                    value={editForm.name} 
                    onChange={e => setEditForm({...editForm, name: e.target.value})} 
                    required 
                />
            </div>

            <div style={{marginBottom:'1rem'}}>
                <label style={{display:'block', marginBottom:'5px', color:'var(--text-muted)'}}>Phone</label>
                {/* ✅ UPDATED INPUT LOGIC */}
                <input 
                    type="tel"
                    value={editForm.phone} 
                    onChange={e => {
                        // 1. Remove non-numbers
                        const val = e.target.value.replace(/\D/g, '');
                        // 2. Limit to 10 digits
                        if (val.length <= 10) {
                            setEditForm({...editForm, phone: val});
                        }
                    }} 
                    placeholder="9876543210"
                    required 
                />
            </div>

            <div style={{marginBottom:'1rem'}}>
                <label style={{display:'block', marginBottom:'5px', color:'var(--text-muted)'}}>College</label>
                <input 
                    value={editForm.college} 
                    onChange={e => setEditForm({...editForm, college: e.target.value})} 
                    required 
                />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditOpen(false)}>Cancel</button>
                <button type="submit" className="btn">Save Changes</button>
            </div>
        </form>
    </div>
</div>)}

      {/* 2. REGISTERED EVENTS */}
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
      <div style={{ marginTop: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          <p style={{ color: 'var(--danger)', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            Note: You should not register for multiple events that are occuring simultaneously
          </p>
          <p style={{ margin: 0 }}>
            No refund available. <br />
            Read all the rules for events before registering.
          </p>
      </div>
      <div className="grid-cards">
        {availableEvents.map(event => {
          const stackItem = eventStack.find(i => i.event_id === event.id);
          const isInStack = !!stackItem;
          
          
          return (
            <div key={event.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', borderColor: isInStack ? 'var(--primary)' : 'var(--glass-border)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span className="badge badge-neutral">{event.type}</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>₹{event.fee}</span>
                </div>
                <h3 style={{ fontSize: '1.5rem' }}>{event.name}</h3>
                {event.type === 'GROUP' && (<p style={{ color: 'var(--text-muted)' }}>Team Size: {event.min_team_size} - {event.max_team_size}</p>)}
                
                {/* NEW: Show short description preview if available */}
                {event.description && (
                   <p style={{fontSize:'0.85rem', color:'#aaa', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden'}}>
                       {event.description}
                   </p>
                )}
              </div>
              
              {isInStack ? (
                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" style={{ borderColor: 'var(--danger)', color: 'var(--danger)', flex: 1 }} onClick={() => removeFromStack(event.id)}>Remove</button>
                    {event.type === 'GROUP' && (<button className="btn btn-secondary" style={{ flex: 1, borderColor: 'var(--primary)', color: 'white' }} onClick={() => handleEditTeam(stackItem)}>Edit Team</button>)}
                </div>
              ) : (
                <button 
                    className="btn" 
                    style={{ marginTop: '1.5rem' }} 
                    onClick={() => initiateAddEvent(event)} // <--- UPDATED CLICK HANDLER
                >
                    Add to Stack +
                </button>
              )}
            </div>
          );
        })}
      </div>


      {/* 4. FLOATING STACK BAR */}
      {!isCheckoutOpen && eventStack.length > 0 && (
        <div style={{
          position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '600px',
          background: 'rgba(20, 20, 25, 0.9)', backdropFilter: 'blur(12px)', border: '1px solid var(--primary)', borderRadius: '100px',
          padding: '1rem 2rem', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 90
        }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>EVENT STACK</div>
            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{eventStack.length} Items • ₹{calculateTotal()}</div>
          </div>
          <button className="btn" style={{ width: 'auto', padding: '10px 30px', borderRadius: '50px' }} onClick={() => setIsCheckoutOpen(true)}>Checkout →</button>
        </div>
      )}

      {/* 5. NEW EVENT INFO MODAL */}
      {viewingEvent && (
          <EventInfoModal 
            event={viewingEvent} 
            onClose={() => setViewingEvent(null)} 
            onConfirm={confirmAddEvent} 
          />
      )}

      {/* 6. TEAM MODAL (Already Existing) */}
      {selectedEvent && (
        <div className="modal-overlay">
          <div className="glass-card modal-content">
            <h2 style={{ marginBottom: '0.5rem' }}>Configure Team</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>For {selectedEvent.name}</p>
            <form onSubmit={async (e) => {
                  e.preventDefault();
                  const validTeammates = teammates.filter(t => t.email.trim() !== '');
                  const totalParticipants = 1 + validTeammates.length;
                  if (totalParticipants < selectedEvent.min_team_size) {
                      alert(`⚠️ Minimum Requirement Not Met\n\nThis event requires at least ${selectedEvent.min_team_size} participants.\nYou currently have ${totalParticipants}.`);
                      return;
                  }
                  addToStack(selectedEvent, { teammates: validTeammates });
                }}>
              <div style={{marginBottom:'0.5rem', display:'flex', justifyContent:'space-between'}}><label>Teammates</label><button type="button" onClick={addTeammateRow} className="btn-ghost" style={{fontSize:'0.8rem'}}>+ Add</button></div>
              {teammates.map((mate, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                  <input required placeholder="Name" value={mate.name} onChange={e => handleTeammateChange(idx, 'name', e.target.value)} />
                  <input required type="email" placeholder="Email" value={mate.email} onChange={e => handleTeammateChange(idx, 'email', e.target.value)} />
                  <button type="button" onClick={() => removeTeammate(idx)} style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }} title="Remove Teammate">✕</button>
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

      {/* 7. CHECKOUT MODAL (Already Existing) */}
      {isCheckoutOpen && (
        <div className="modal-overlay">
          <div className="glass-card modal-content">
            <h2 style={{ marginBottom: '1.5rem' }}>Confirm Registration</h2>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}>
              {eventStack.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}><span>{item.name}</span><span>₹{item.fee}</span></div>
              ))}
              <div style={{ borderTop: '1px solid var(--glass-border)', marginTop: '0.5rem', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}><span>TOTAL</span><span style={{ color: 'var(--primary)' }}>₹{calculateTotal()}</span></div>
            </div>
            
            {isSpotMode && (
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <button onClick={() => setPaymentMode('ONLINE')} className={paymentMode === 'ONLINE' ? 'btn' : 'btn btn-secondary'} style={{ flex: 1 }}>Online Payment</button>
              <button onClick={() => setPaymentMode('CASH')} className={paymentMode === 'CASH' ? 'btn' : 'btn btn-secondary'} style={{ flex: 1 }}>Cash Desk</button>
            </div>
            )}

            {paymentMode === 'ONLINE' && <div style={{ textAlign: 'center', marginBottom: '1rem' }}><button className="btn" onClick={handleCheckout}>Pay & Register</button></div>}
            {paymentMode === 'CASH' && isSpotMode && (
                <div>
                    <input placeholder="e.g. 8X9B2" value={cashToken} onChange={e => setCashToken(e.target.value.toUpperCase())} style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: '2px', marginBottom: '1rem' }} />
                    <button className="btn" onClick={handleCheckout}>Validate & Register</button>
                </div>
            )}
            <button className="btn btn-secondary" style={{ width: '100%', marginTop: '1rem', borderColor: 'var(--danger)', color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.05)' }} onClick={() => setIsCheckoutOpen(false)}> Cancel </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;