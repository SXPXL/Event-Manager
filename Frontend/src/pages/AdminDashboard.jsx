import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import StaffWalkIn from './components/StaffWalkIn';
import ReportsPanel from './components/ReportsPanel'; 
import { Scanner } from '@yudiel/react-qr-scanner'; 
import UserCard from './components/UserCard';
import GuardEventView from './components/GuardEventView';

// --- RESPONSIVE CSS STYLES ---
// You can move this content to your index.css
const responsiveStyles = `
  .dashboard-grid-form {
    display: grid;
    gap: 1rem;
    grid-template-columns: 1fr; /* Mobile Default: Stacked */
  }
  
  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1.5rem;
    padding: 1rem;
  }

  /* Desktop Override */
  @media (min-width: 768px) {
    .dashboard-grid-form.events-form {
      grid-template-columns: 2fr 1fr 0.8fr 0.6fr 0.6fr auto;
    }
    .dashboard-grid-form.volunteers-form {
      grid-template-columns: 1fr 1fr 1fr auto;
    }
  }

  .table-responsive {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  .data-table {
    width: 100%;
    border-collapse: collapse;
    min-width: 600px; /* Forces scroll on small screens */
  }
`;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedUid, setSelectedUid] = useState(null); 
  
  // GUARD SPECIFIC STATE
  const [guardEvent, setGuardEvent] = useState(null);
  const [allEvents, setAllEvents] = useState([]);

  useEffect(() => {
    // 1. Check for the NEW key names
    const token = localStorage.getItem('admin_token');
    const storedUser = localStorage.getItem('admin_user'); // <--- WAS 'user'

    if (token && storedUser) {
      const u = JSON.parse(storedUser);
      setUser(u);
      
      // If Guard, fetch events immediately to show selector
      if(u.role === 'GUARD') {
          API.get('/events').then(res => setAllEvents(res.data));
      }
    } else {
      // If either is missing, force login
      navigate('/admin');
    }
}, [navigate]);

  const handleLogout = () => {
    if(confirm("Sign out?")) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        window.location.href = '/admin';
    }
};


  if (!user) return <div className="page-container">Loading...</div>;
  const role = user.role; 

  // --- GUARD EVENT SELECTOR MODAL ---
  const showGuardModal = role === 'GUARD' && !guardEvent;

  // --- MENU CONFIG ---
  const getMenuOptions = () => {
      if (role === 'ADMIN') return [
          { id: 'events', label: '📊 Events' },
          { id: 'reports', label: '📥 Reports & Data' },
          { id: 'walkin', label: '⚡ Walk-in Registration' },
          { id: 'guard', label: '🛡️ Gate Scanner' },
          { id: 'guard-list', label: '📋 Attendance Sheet' },
          { id: 'volunteers', label: '👥 Manage Staff' },
          { id: 'users', label: '🎓 Participants Database' },
          { id: 'search', label: '🔍 Search Participant' },
          { id: 'cashier', label: '💰 Cash Token Gen' },
      ];
      if (role === 'CASHIER') return [
          { id: 'walkin', label: '⚡ Walk-in Registration' },
          { id: 'reports', label: '📥 Event Lists' },
          { id: 'search', label: '🔍 Search' },
          { id: 'cashier', label: '💰 Token Generator' },
      ];
      if (role === 'GUARD') return [
          { id: 'guard', label: '🛡️ Gate Scanner' },
          { id: 'guard-list', label: '📋 Attendance Sheet' },
          { id: 'reports', label: '📥 Reports' },
      ];
      return [];
  };

  const menuOptions = getMenuOptions();

  return (
    <div className="dashboard-container">
      {/* INJECT STYLES */}
      <style>{responsiveStyles}</style>

      {/* 1. HEADER & HAMBURGER */}
      <div className="glass-card dashboard-header">
        <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="btn-ghost" style={{fontSize:'1.5rem', padding:'5px 12px', border:'1px solid var(--glass-border)'}}>
               {isMenuOpen ? '✕' : '☰'}
            </button>
            <div>
              <h2 style={{ marginBottom: '0.1rem', fontSize:'1.2rem' }}>Srishti 2.6</h2>
              <span className="badge badge-neutral" style={{fontSize:'0.75rem'}}>Role: {role}</span>
              {guardEvent && <span className="badge badge-primary" style={{marginLeft:'5px', fontSize:'0.75rem'}}>{guardEvent.name}</span>}
            </div>
        </div>
        <button onClick={handleLogout} className="btn btn-secondary" style={{ width: 'auto', padding: '8px 16px', fontSize:'0.9rem' }}>Logout</button>
      </div>

      {/* 2. GUARD EVENT SELECTION MODAL */}
      {showGuardModal && (
          <div className="modal-overlay">
              <div className="glass-card modal-content" style={{ width: '90%', maxWidth: '500px' }}>
                  <h2 style={{textAlign:'center', marginBottom:'1.5rem'}}>Select Your Duty Event</h2>
                  <div className="grid-cards">
                      {allEvents.map(ev => (
                          <button key={ev.id} className="btn btn-secondary" onClick={() => { setGuardEvent(ev); setActiveTab('guard'); }}>
                              {ev.name}
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* 3. MENU DROPDOWN */}
      {isMenuOpen && !showGuardModal && (
        <div className="glass-card" style={{ padding: '0.5rem', marginBottom: '1.5rem', border: '1px solid var(--primary)' }}>
            <div style={{color:'var(--text-muted)', fontSize:'0.8rem', padding:'10px', textTransform:'uppercase'}}>Select Tool</div>
            <div style={{display:'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap:'0.5rem'}}>
                {menuOptions.map(option => (
                    <button key={option.id} onClick={() => { setActiveTab(option.id); setIsMenuOpen(false); }}
                        style={{ textAlign: 'left', padding: '12px', background: activeTab === option.id ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
      )}

      {/* 4. CONTENT AREA */}
      {!showGuardModal && (
        <div className="glass-card" style={{ minHeight: '500px', padding: '1rem' }}>
            {activeTab === 'home' && (
                <div style={{textAlign:'center', padding:'4rem 1rem', color: 'var(--text-muted)'}}>
                    <div style={{fontSize:'3rem', marginBottom:'1rem'}}>👋</div>
                    <h3>Welcome, {user.name}</h3>
                    <p>Open the Menu (☰) to access your tools.</p>
                </div>
            )}
            
            {/* Pass guardEvent to constrained panels */}
            {activeTab === 'guard' && <GuardPanel forcedEvent={guardEvent} />}
            {activeTab === 'reports' && <ReportsPanel role={role} forcedEvent={guardEvent} />}
            {activeTab === 'guard-list' && <GuardEventView forcedEvent={guardEvent} />}

            {/* Other Components */}
            {activeTab === 'events' && <EventsManager />}
            {activeTab === 'volunteers' && <VolunteersManager />}
            {activeTab === 'users' && <UsersManager />}
            {activeTab === 'walkin' && <StaffWalkIn volunteerId={user.id} />}
            {activeTab === 'search' && <SearchPanel />}
            {activeTab === 'cashier' && <CashierPanel volunteerId={user.id} />}
        </div>
      )}
    </div>
  );
};

/* =========================================
   INTERNAL SUB-COMPONENTS
   ========================================= */

// 1. EVENTS MANAGER

// Inside AdminDashboard.jsx or wherever EventsManager is defined

const EventsManager = () => {
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false); // <--- NEW STATE FOR MODAL

  // Form State
  const [form, setForm] = useState({ 
      name: '', type: 'SOLO', fee: 0, 
      min_team_size: 2, max_team_size: 5,
      description: '', date: '', start_time: '', end_time: ''
  }); 

  useEffect(() => { load(); }, []);
  const load = async () => { const res = await API.get('/events'); setEvents(res.data); };
  
  const handleCreate = async (e) => { 
      e.preventDefault(); 
      try {
          await API.post('/events', form); 
          load(); 
          // Reset & Close
          setForm({ 
              name: '', type: 'SOLO', fee: 0, 
              min_team_size: 2, max_team_size: 5,
              description: '', date: '', start_time: '', end_time: ''
          }); 
          setShowModal(false); // <--- Close Modal on Success
      } catch(err) {
          alert("Failed to create event. Check inputs.");
      }
  };

  const totalRevenue = events.reduce((sum, e) => sum + (e.revenue || 0), 0);

  const handleDelete = async (id) => { 
    if(confirm("Are you sure you want to delete this event? This action cannot be undone.")) { 
        try {
            await API.delete(`/events/${id}`); 
            load(); 
        } catch (err) {
            alert("Failed to delete event. It might have active registrations.");
        }
    }
  };

  

  return (
    <div>
      {/* HEADER */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem', flexWrap:'wrap', gap:'10px'}}>
        <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
            <h3 style={{margin:0}}>Manage Events</h3>
        </div>
        <div className="badge badge-success" style={{fontSize:'1.1rem'}}>Total Revenue: ₹{totalRevenue}</div>
        {/* NEW ADD BUTTON */}
      </div>
      <button 
                className="btn" 
                onClick={() => setShowModal(true)}
                style={{padding:'5px 15px', fontSize:'0.9rem',marginBottom:'20px',maxWidth:'150px'}}
            >
                + ADD EVENT
            </button>

      {/* POPUP MODAL FORM */}
      {showModal && (
        <div className="modal-overlay">
            <div className="glass-card modal-content" style={{maxWidth:'600px', width:'95%', maxHeight:'90vh', overflowY:'auto'}}>
                
                {/* Modal Header */}
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem'}}>
                    <h2 style={{margin:0}}>Create New Event</h2>
                    <button onClick={() => setShowModal(false)} className="btn-icon" style={{fontSize:'1.5rem'}}>✕</button>
                </div>
                
                {/* The Existing Form Logic */}
                <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    
                    {/* ROW 1: Basic Info */}
                    <div style={{ gridColumn: 'span 2' }}>
                        <label style={{fontSize:'0.8rem', color:'#888'}}>Event Name</label>
                        <input 
                            placeholder="e.g. Hackathon 2025" 
                            value={form.name} 
                            onChange={e => setForm({...form, name: e.target.value})} 
                            required 
                            style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #444', background: 'rgba(0,0,0,0.3)', color: 'white'}}
                        />
                    </div>
                    <div>
                        <label style={{fontSize:'0.8rem', color:'#888'}}>Type</label>
                        <select 
                            value={form.type} 
                            onChange={e => setForm({...form, type: e.target.value})}
                            style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #444', background: 'rgba(0,0,0,0.3)', color: 'white'}}
                        >
                            <option value="SOLO">SOLO</option>
                            <option value="GROUP">GROUP</option>
                        </select>
                    </div>
                    <div>
                            <label style={{fontSize:'0.8rem', color:'#888'}}>Entry Fee (₹)</label>
                            <input 
                            type="number" 
                            value={form.fee} 
                            onChange={e => setForm({...form, fee: e.target.value})} 
                            style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #444', background: 'rgba(0,0,0,0.3)', color: 'white'}}
                            />
                    </div>

                    {/* ROW 2: Scheduling */}
                    <div>
                        <label style={{fontSize:'0.8rem', color:'#888'}}>Date</label>
                        <input 
                            type="date" 
                            value={form.date} 
                            onChange={e => setForm({...form, date: e.target.value})} 
                            style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #444', background: 'rgba(0,0,0,0.3)', color: 'white'}}
                        />
                    </div>
                    <div>
                        <label style={{fontSize:'0.8rem', color:'#888'}}>Start Time</label>
                        <input 
                            type="time" 
                            value={form.start_time} 
                            onChange={e => setForm({...form, start_time: e.target.value})} 
                            style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #444', background: 'rgba(0,0,0,0.3)', color: 'white'}}
                        />
                    </div>
                    <div>
                        <label style={{fontSize:'0.8rem', color:'#888'}}>End Time</label>
                        <input 
                            type="time" 
                            value={form.end_time} 
                            onChange={e => setForm({...form, end_time: e.target.value})} 
                            style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #444', background: 'rgba(0,0,0,0.3)', color: 'white'}}
                        />
                    </div>
                    
                    {/* ROW 3: Limits */}
                    <div>
                        <label style={{fontSize:'0.8rem', color:'#888'}}>Min Team Size</label>
                        <input 
                            type="number" 
                            value={form.min_team_size} 
                            onChange={e => setForm({...form, min_team_size: e.target.value})} 
                            disabled={form.type === 'SOLO'}
                            style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #444', background: 'rgba(0,0,0,0.3)', color: 'white', opacity: form.type === 'SOLO' ? 0.5 : 1}}
                        />
                    </div>
                    <div>
                        <label style={{fontSize:'0.8rem', color:'#888'}}>Max Team Size</label>
                        <input 
                            type="number" 
                            value={form.max_team_size} 
                            onChange={e => setForm({...form, max_team_size: e.target.value})} 
                            disabled={form.type === 'SOLO'}
                            style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #444', background: 'rgba(0,0,0,0.3)', color: 'white', opacity: form.type === 'SOLO' ? 0.5 : 1}}
                        />
                    </div>

                    {/* ROW 4: Description (Full Width) */}
                    <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{fontSize:'0.8rem', color:'#888'}}>Description / Rules</label>
                        <textarea 
                            placeholder="Enter event details, rules, and regulations here..." 
                            value={form.description} 
                            onChange={e => setForm({...form, description: e.target.value})} 
                            rows="3"
                            style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #444', background: 'rgba(0,0,0,0.3)', color: 'white', resize: 'vertical'}}
                        />
                    </div>

                    {/* Footer Actions */}
                    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop:'1rem' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                        <button className="btn" style={{padding: '10px 30px'}}>Create Event</button>
                    </div>

                </form>
            </div>
        </div>
      )}
      
      {/* EVENTS LIST (Unchanged) */}
      <div className="grid-cards">
        {events.map(e => (
          <div key={e.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px' }}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                <div>
                    <h3 style={{margin:0}}>
                        {e.name}
                        {/* 2. OPTIONAL: Add a badge so you know it's hidden */}
                        {e.is_hidden && <span className="badge badge-neutral" style={{marginLeft:'10px', fontSize:'0.7rem'}}>HIDDEN</span>}
                    </h3>
                    <div style={{fontSize:'0.85rem', color:'var(--text-muted)', marginBottom:'0.5rem'}}>
                        {e.type} • ₹{e.fee} 
                        {e.type === 'GROUP' && <span style={{color:'var(--accent)', marginLeft:'5px'}}> (Size: {e.min_team_size}-{e.max_team_size})</span>}
                    </div>
                    {(e.date || e.start_time) && (
                        <div style={{fontSize:'0.8rem', color:'#aaa', marginBottom:'1rem', display:'flex', gap:'10px', alignItems:'center'}}>
                            {e.date && <span>📅 {e.date}</span>}
                            {e.start_time && <span>⏰ {e.start_time.substring(0,5)} {e.end_time ? `- ${e.end_time.substring(0,5)}` : ''}</span>}
                        </div>
                    )}
                </div>

                {/* 3. BUTTONS WRAPPER: Wrap buttons here to keep them side-by-side */}
                <div style={{display:'flex', gap:'8px'}}>
                    

                    {/* EXISTING DELETE BUTTON */}
                    <button 
                        onClick={() => handleDelete(e.id)} 
                        className="btn btn-secondary" 
                        style={{
                            color: 'var(--danger)', borderColor: 'var(--danger)', 
                            background: 'rgba(239, 68, 68, 0.05)', padding: '4px 12px', fontSize: '0.75rem', fontWeight: 'bold'
                        }}
                    >
                        Delete
                    </button>
                </div>
            </div>
            
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(80px, 1fr))', gap:'0.5rem'}}>
                <div style={{background:'rgba(0,0,0,0.3)', padding:'0.5rem', borderRadius:'8px', textAlign:'center'}}>
                    <div style={{fontSize:'1.2rem', fontWeight:'bold'}}>{e.total_registrations}</div>
                    <div style={{fontSize:'0.6rem', color:'var(--text-muted)'}}>REGS</div>
                </div>
                <div style={{background:'rgba(16, 185, 129, 0.2)', padding:'0.5rem', borderRadius:'8px', textAlign:'center'}}>
                    <div style={{fontSize:'1.2rem', fontWeight:'bold', color:'#34d399'}}>{e.total_attended}</div>
                    <div style={{fontSize:'0.6rem', color:'var(--text-muted)'}}>PRESENT</div>
                </div>
                <div style={{background:'rgba(255, 255, 255, 0.1)', padding:'0.5rem', borderRadius:'8px', textAlign:'center'}}>
                    <div style={{fontSize:'1.2rem', fontWeight:'bold', color:'var(--primary)'}}>₹{e.revenue}</div>
                    <div style={{fontSize:'0.6rem', color:'var(--text-muted)'}}>REVENUE</div>
                </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
// 2. GUARD PANEL
const GuardPanel = ({ forcedEvent = null }) => {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(forcedEvent ? forcedEvent.id : null);
  const [uidInput, setUidInput] = useState('');
  const [scanResult, setScanResult] = useState(null); 
  const [scanning, setScanning] = useState(true);
  
  // --- NEW: UI Message State (Replaces Alerts) ---
  const [uiMessage, setUiMessage] = useState(null); // { type: 'success' | 'error', text: '' }

  useEffect(() => { 
      if (forcedEvent) {
          setEvents([forcedEvent]);
          setSelectedEventId(forcedEvent.id);
      } else {
          API.get('/events').then(res => setEvents(res.data)); 
      }
  }, [forcedEvent]);

  // Helper to show temporary success messages
  const showTemporaryMessage = (type, text) => {
      setUiMessage({ type, text });
      if (type === 'success') {
          setTimeout(() => setUiMessage(null), 3000); // Auto-hide success after 3s
      }
  };

  const fetchUserForCheckIn = async (uid) => {
    if (!uid) return;
    setUiMessage(null); // Clear previous errors
    setScanning(false); // Hide camera to show "Processing"

    try {
        const res = await API.get(`/check-uid/${uid}`);
        if (res.data && res.data.user) {
            setScanResult(res.data); 
        } else {
            throw new Error("User data empty");
        }
    } catch (err) { 
        // ERROR HANDLING IN UI
        setScanning(true); // Bring camera back immediately
        setUidInput('');
        setUiMessage({ type: 'error', text: "❌ User Not Found / Invalid ID" });
    }
  };

  const confirmCheckIn = async () => {
    if (!scanResult || !selectedEventId) return;
    try {
        const res = await API.post('/staff/mark-attendance', { user_uid: scanResult.user.uid, event_id: selectedEventId });
        
        // SUCCESS HANDLING IN UI
        showTemporaryMessage('success', `✅ ${res.data.user_name} Checked In!`);
        
        setEvents(prev => prev.map(ev => ev.id === selectedEventId ? { ...ev, total_attended: ev.total_attended + 1 } : ev));
        resetScanner();
    } catch (err) { 
        // ERROR HANDLING IN UI
        setUiMessage({ type: 'error', text: `❌ ${err.response?.data?.detail || "Check-in Failed"}` });
        resetScanner(); 
    }
  };

  const resetScanner = () => { 
      setScanResult(null); 
      setUidInput(''); 
      setScanning(true);
  };

  const handleScannerError = (err) => {
      console.error(err);
      setScanning(false);
      setUiMessage({ type: 'error', text: "📷 Camera Permission Denied. Please allow camera access." });
  };

  const checkEligibility = () => {
      if (!scanResult || !selectedEventId) return { eligible: false, status: null };
      
      const currentEventName = events.find(e => e.id === selectedEventId)?.name;
      const reg = scanResult.registered_events.find(ev => ev.name === currentEventName || ev.event_name === currentEventName); // Handle both naming conventions
      
      // 1. Check if Registered
      if (!reg) return { eligible: false, status: 'NOT_REGISTERED' };
      
      // 2. NEW CHECK: Is Payment Successful?
      if (reg.payment_status !== 'PAID') {
          return { eligible: false, status: 'PAYMENT_PENDING' }; // or PAYMENT_FAILED
      }

      // 3. Check if Already Entered
      if (reg.attended) return { eligible: false, status: 'ALREADY_CHECKED_IN' };
      
      return { eligible: true, status: 'ELIGIBLE', teamName: reg.team_name };
  };

  if(!selectedEventId && !forcedEvent) return (
    <div>
      <h3>Select Event for Gate Entry</h3>
      <div className="grid-cards">{events.map(e => <button key={e.id} className="btn btn-secondary" onClick={() => setSelectedEventId(e.id)}>{e.name}</button>)}</div>
    </div>
  );

  const currentEvent = events.find(e => e.id === selectedEventId);
  const { eligible, status, teamName } = checkEligibility();

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      
      {/* HEADER */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', background:'rgba(255,255,255,0.05)', padding:'10px', borderRadius:'12px', flexWrap:'wrap', gap:'10px'}}>
          {!forcedEvent && <button onClick={() => setSelectedEventId(null)} className="btn btn-secondary" style={{padding:'5px 10px',maxWidth:'80px'}}>Back</button>}
          <div style={{textAlign:'right', flex:1}}>
              <div style={{fontWeight:'bold', fontSize:'1.1rem'}}>{currentEvent?.name}</div>
              <div style={{fontSize:'0.9rem', color:'var(--text-muted)'}}>
                  Reg: <span style={{color:'white'}}>{currentEvent?.total_registrations}</span> • 
                  Pres: <span style={{color:'var(--success)', fontWeight:'bold'}}>{currentEvent?.total_attended}</span>
              </div>
          </div>
      </div>

      {/* --- NEW: UI MESSAGE BAR --- */}
      {uiMessage && (
          <div style={{ 
              background: uiMessage.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(74, 222, 128, 0.2)', 
              color: uiMessage.type === 'error' ? '#fca5a5' : '#4ade80',
              border: `1px solid ${uiMessage.type === 'error' ? '#ef4444' : '#4ade80'}`,
              padding: '1rem', borderRadius: '8px', marginBottom: '1rem', fontWeight: 'bold'
          }}>
              {uiMessage.text}
          </div>
      )}
      
      {/* SCANNER WINDOW */}
      <div style={{ background: 'black', borderRadius: '12px', overflow: 'hidden', height: '350px', marginBottom: '2rem', position:'relative', border: '2px solid var(--glass-border)' }}>
          {scanning ? (
            <Scanner 
                onScan={(result) => { 
                    if (result && result.length > 0) {
                        const val = result[0].rawValue || result[0];
                        fetchUserForCheckIn(val); 
                    }
                }} 
                onError={handleScannerError} // <--- CATCH PERMISSION ERRORS
                components={{ audio: false, finder: false }} 
                constraints={{ facingMode: 'environment' }} 
                styles={{ container: { width: '100%', height: '100%' } }} 
            />
          ) : (
            <div style={{display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'white', flexDirection:'column'}}>
                {!uiMessage && <div className="pulse-loader" style={{marginBottom:'1rem'}}></div>}
                <div style={{color: '#aaa'}}>{uiMessage ? "Scanner Paused" : "Processing..."}</div>
            </div>
          )}
      </div>

      {/* MANUAL INPUT */}
      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{display:'flex', gap:'1rem', alignItems: 'stretch', flexWrap:'wrap'}}>
            <input 
                placeholder="Enter UID..." 
                value={uidInput} 
                onChange={e => setUidInput(e.target.value.toUpperCase())} 
                style={{ flex: 1, padding: '12px 16px', fontSize: '1.2rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white', outline: 'none', minWidth: '200px' }} 
            />
            <button className="btn" onClick={() => fetchUserForCheckIn(uidInput)} style={{ width: 'auto', padding: '0 25px' }}>Check In</button>
        </div>
      </div>

      {/* RESULT MODAL */}
      {scanResult && (
        <div className="modal-overlay">
            <div className="glass-card modal-content" style={{textAlign:'center', maxWidth: '500px', width: '90%'}}>
                <h1 style={{fontSize:'2rem', margin:'0.5rem 0'}}>{scanResult.user.name}</h1>
                <div className="badge badge-neutral" style={{fontSize:'1.2rem', marginBottom:'2rem'}}>{scanResult.user.uid}</div>
                
                {status === 'NOT_REGISTERED' && <div style={{color:'#f87171', fontSize:'1.5rem', fontWeight:'bold'}}>⚠️ NOT REGISTERED</div>}
                {status === 'PAYMENT_PENDING' && (
                    <div style={{color:'#f87171', fontSize:'1.5rem', fontWeight:'bold'}}>
                        ❌ PAYMENT FAILED/PENDING
                        <div style={{fontSize:'1rem', color:'#ccc', marginTop:'5px'}}>Do not allow entry.</div>
                    </div>
                )}
                {status === 'ALREADY_CHECKED_IN' && <div style={{color:'#fbbf24', fontSize:'1.5rem', fontWeight:'bold'}}>⚠️ ALREADY CHECKED IN</div>}
                {status === 'ELIGIBLE' && <div style={{color:'#34d399', fontWeight:'bold', fontSize:'1.5rem'}}>✅ ELIGIBLE <div style={{fontSize:'1rem', color:'white', marginTop:'5px'}}>{teamName}</div></div>}
                
                <div style={{display:'flex', gap:'1rem', marginTop:'2rem'}}>
                    <button className="btn btn-secondary" onClick={resetScanner} style={{flex:1}}>{eligible ? 'Cancel' : 'Close'}</button>
                    {eligible && <button className="btn" onClick={confirmCheckIn} style={{flex:1}}>CONFIRM ENTRY</button>}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

// 3. VOLUNTEERS MANAGER
const VolunteersManager = () => {
    const [vols, setVols] = useState([]);
    const [form, setForm] = useState({ username: '', password: '', role: 'CASHIER' });

    useEffect(() => { load(); }, []);
    const load = async () => { const res = await API.get('/admin/volunteers'); setVols(res.data); };
    
    const handleCreate = async (e) => { 
        e.preventDefault(); 
        await API.post('/admin/volunteers', form); 
        load(); 
        setForm({ username: '', password: '', role: 'CASHIER' }); 
    };

    const handleDelete = async (id, username) => {
        if (!confirm(`Are you sure you want to delete staff member "${username}"?`)) return;
        try {
            await API.delete(`/admin/volunteers/${id}`);
            load();
        } catch (err) {
            alert(err.response?.data?.detail || "Delete Failed");
        }
    };

    return (
      <div>
        <h3>Manage Staff</h3>
        {/* Added flex-wrap here to keep the form usable on mobile */}
        <form onSubmit={handleCreate} className="dashboard-grid-form volunteers-form" style={{ marginBottom: '2rem' }}>
            <input placeholder="Username" value={form.username} onChange={e => setForm({...form, username: e.target.value})} required />
            <input placeholder="PIN" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
            <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                <option value="ADMIN">ADMIN</option>
                <option value="CASHIER">CASHIER</option>
                <option value="GUARD">GUARD</option>
            </select>
            <button className="btn">Add</button>
        </form>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {vols.map(v => (
                <div key={v.id} style={{ 
                    padding: '1rem', 
                    borderBottom: '1px solid var(--glass-border)', 
                    display: 'flex', 
                    justifyContent: 'space-between', /* Pushes button to far right */
                    alignItems: 'center', 
                    gap:'10px',
                    flexWrap: 'nowrap' /* Prevents button from dropping down */
                }}>
                    <div style={{display:'flex', alignItems:'center', gap:'10px', overflow:'hidden'}}>
                        <span style={{fontWeight:'bold', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{v.username}</span> 
                        <span className="badge badge-neutral" style={{fontSize:'0.75rem', flexShrink: 0}}>{v.role}</span>
                    </div>
                    
                    {v.id !== 1 && (
                        <button 
                            onClick={() => handleDelete(v.id, v.username)} 
                            className="btn btn-secondary" 
                            style={{
                                color: 'var(--danger)', 
                                borderColor: 'var(--danger)', 
                                background: 'rgba(239, 68, 68, 0.05)', 
                                padding: '4px 12px', 
                                fontSize: '0.75rem', 
                                fontWeight: 'bold',
                                whiteSpace: 'nowrap', /* Keeps button text on one line */
                                flexShrink: 0, /* Prevents button from getting squashed */
                                width: 'auto' /* Ensures it doesn't stretch */
                            }}
                        >
                            DELETE
                        </button>
                    )}
                </div>
            ))}
        </div>
      </div>
    );
};
// 4. USERS MANAGER (Responsive Table)
const UsersManager = () => {
    const [users, setUsers] = useState([]);
    const [selectedDossierUid, setSelectedDossierUid] = useState(null); // <--- NEW STATE

    useEffect(() => { load(); }, []);
    const load = () => API.get('/admin/users').then(res => setUsers(res.data));

    const handleDelete = async (uid, name) => {
        if (!confirm(`⚠️ WARNING: Delete user "${name}"?\n\nThis cannot be undone.`)) return;
        try {
            await API.delete(`/admin/users/${uid}`);
            alert("User deleted successfully.");
            load();
        } catch (err) {
            alert(err.response?.data?.detail || "Failed to delete user.");
        }
    };

    return (
      <div>
        <h3 style={{marginBottom: '1.5rem'}}>Participants ({users.length})</h3>
        
        <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
            <table className="data-table">
                <thead>
                    <tr>
                        <th style={{textAlign:'left', padding:'10px'}}>UID</th>
                        <th style={{textAlign:'left', padding:'10px'}}>Name</th>
                        <th style={{textAlign:'left', padding:'10px'}}>Status</th>
                        <th style={{textAlign:'left', padding:'10px'}}>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(u => (
                        <tr 
                            key={u.id} 
                            onClick={() => setSelectedDossierUid(u.uid)} // <--- CLICK TO OPEN DOSSIER
                            className="hover-row" // See style below
                            style={{
                                borderBottom: '1px solid rgba(255,255,255,0.05)', 
                                cursor: 'pointer',
                                transition: 'background 0.2s ease'
                            }}
                        >
                            <td style={{padding:'10px'}}><span className="badge badge-neutral">{u.uid}</span></td>
                            <td style={{padding:'10px'}}>
                                <div style={{ fontWeight: 'bold' }}>
                                    {u.name} 
                                    {u.is_shadow && <span style={{color:'orange', fontSize:'0.7rem', marginLeft:'6px', border:'1px solid orange', borderRadius:'4px', padding:'1px 4px'}}>SHADOW</span>}
                                </div>
                                <div style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>{u.email}</div>
                            </td>
                            <td style={{padding:'10px'}}>
                                <span className={u.payment_status === 'PAID' ? 'badge badge-success' : 'badge badge-danger'}>
                                    {u.payment_status}
                                </span>
                            </td>
                            <td style={{padding:'10px'}}>
                                <button 
                                    onClick={(e) => { 
                                        e.stopPropagation(); // <--- PREVENT OPENING DOSSIER
                                        handleDelete(u.uid, u.name); 
                                    }}
                                    className="btn btn-secondary"
                                    style={{
                                        color: 'var(--danger)', borderColor: 'var(--danger)', 
                                        background: 'rgba(239, 68, 68, 0.05)', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 'bold'
                                    }}
                                >
                                    DELETE
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* --- DOSSIER MODAL --- */}
        {selectedDossierUid && (
            <UserCard
                uid={selectedDossierUid} 
                onClose={() => setSelectedDossierUid(null)} 
            />
        )}

        {/* Optional: Add hover style if not in global css */}
        <style>{`
            .hover-row:hover {
                background-color: rgba(255, 255, 255, 0.03);
            }
        `}</style>
      </div>
    );
};

// 5. SEARCH PANEL
const SearchPanel = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Instead of storing full profile data, we just store the UID to open the modal
    const [selectedUid, setSelectedUid] = useState(null); 

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;
        setLoading(true);
        try {
            const res = await API.get(`/staff/search?q=${query}`);
            setResults(res.data);
        } catch (err) {
            alert("Search failed or no connection");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h3 style={{marginBottom: '1.5rem'}}>Search User</h3>
            
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', maxWidth: '600px', marginBottom: '2rem', flexWrap:'wrap' }}>
                <input 
                    placeholder="Name, Email, or UID..." 
                    value={query} 
                    onChange={e => setQuery(e.target.value)} 
                    autoFocus 
                    style={{ fontSize: '1.1rem', flex: 1, minWidth: '200px' }}
                />
                <button className="btn" disabled={loading}>
                    {loading ? 'Searching...' : 'Search'}
                </button>
            </form>

            <div className="grid-cards">
                {results.map(user => (
                    <div 
                        key={user.uid} 
                        className="glass-card" 
                        onClick={() => setSelectedUid(user.uid)} // <--- Just set UID
                        style={{ cursor: 'pointer', borderLeft: '4px solid var(--primary)', padding:'1rem' }}
                    >
                        <div style={{fontWeight:'bold', fontSize:'1.1rem'}}>{user.name}</div>
                        <div style={{color:'var(--primary)', fontSize:'0.9rem', marginBottom:'0.3rem'}}>{user.college || "No College Info"}</div>
                        <div style={{color:'var(--text-muted)', fontSize:'0.9rem'}}>{user.email}</div>
                        <span className="badge badge-neutral" style={{marginTop:'0.5rem', display:'inline-block'}}>{user.uid}</span>
                    </div>
                ))}
            </div>

            {/* --- USE THE COMPONENT --- */}
            {selectedUid && (
                <UserCard 
                    uid={selectedUid} 
                    onClose={() => setSelectedUid(null)} 
                />
            )}
        </div>
    );
};
  
const CashierPanel = ({ volunteerId }) => {
    const [amount, setAmount] = useState(''); const [tokenData, setTokenData] = useState(null);
    const handleGenerate = async (e) => { e.preventDefault(); try { const res = await API.post('/staff/generate-token', { amount: parseFloat(amount), volunteer_id: volunteerId || 1 }); setTokenData(res.data); setAmount(''); } catch (err) { alert("Failed to generate token"); } };
    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <h3 style={{marginBottom: '1rem'}}>Spot Payment Token Generator</h3>
            <p style={{color: 'var(--text-muted)', marginBottom: '2rem'}}>Use this ONLY if student wants to register on their own device.</p>
            <form onSubmit={handleGenerate} style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '3rem', flexWrap:'wrap' }}>
                <input type="number" placeholder="Amount (e.g. 500)" value={amount} onChange={e => setAmount(e.target.value)} style={{ width: '200px', fontSize: '1.2rem', minWidth:'150px' }} autoFocus />
                <button className="btn" style={{ width: 'auto' }}>Generate Token</button>
            </form>
            {tokenData && (<div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '2px dashed var(--primary)', borderRadius: 'var(--radius)', padding: '2rem' }}><div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>TOKEN FOR ₹{tokenData.amount}</div><div style={{ fontSize: '3.5rem', fontWeight: 'bold', letterSpacing: '4px', color: 'white', fontFamily: 'monospace', wordBreak: 'break-all' }}>{tokenData.token}</div></div>)}
        </div>
    );
};
  
export default AdminDashboard;