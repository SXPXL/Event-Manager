import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const role = localStorage.getItem('userRole'); 
  const [activeTab, setActiveTab] = useState('home');

  const handleLogout = () => { localStorage.removeItem('userRole'); navigate('/admin'); };

  return (
    <div className="dashboard-container">
      {/* HEADER */}
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', padding: '1.5rem' }}>
        <div>
          <h2 style={{ marginBottom: '0.2rem' }}>EventFlow Control</h2>
          <span className="badge badge-neutral">Role: {role}</span>
        </div>
        <button onClick={handleLogout} className="btn btn-secondary" style={{ width: 'auto', padding: '8px 16px' }}>Logout</button>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '5px' }}>
        {role === 'ADMIN' && (
          <>
            <TabButton label="Events" active={activeTab === 'events'} onClick={() => setActiveTab('events')} />
            <TabButton label="Staff" active={activeTab === 'volunteers'} onClick={() => setActiveTab('volunteers')} />
            <TabButton label="Participants" active={activeTab === 'users'} onClick={() => setActiveTab('users')} />
          </>
        )}
        {(role === 'CASHIER' || role === 'ADMIN') && <TabButton label="Cash Token Gen" active={activeTab === 'cashier'} onClick={() => setActiveTab('cashier')} />}
        {(role === 'GUARD' || role === 'ADMIN') && <TabButton label="Gate Entry" active={activeTab === 'guard'} onClick={() => setActiveTab('guard')} />}
      </div>

      {/* CONTENT */}
      <div className="glass-card" style={{ minHeight: '400px' }}>
        {activeTab === 'home' && <div style={{textAlign:'center', padding:'3rem', color: 'var(--text-muted)'}}>Select a tool from the menu above.</div>}
        {activeTab === 'events' && <EventsManager />}
        {activeTab === 'volunteers' && <VolunteersManager />}
        {activeTab === 'users' && <UsersManager />}
        {activeTab === 'cashier' && <CashierPanel />}
        {activeTab === 'guard' && <GuardPanel />}
      </div>
    </div>
  );
};

const TabButton = ({ label, active, onClick }) => (
  <button onClick={onClick} style={{
      background: active ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
      color: 'white', border: active ? 'none' : '1px solid var(--glass-border)',
      padding: '10px 24px', borderRadius: '30px', cursor: 'pointer', transition: 'all 0.3s', whiteSpace: 'nowrap'
    }}>
    {label}
  </button>
);

/* --- SUB COMPONENTS --- */

const EventsManager = () => {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({ name: '', type: 'SOLO', fee: 0, max_team_size: 1 });
  useEffect(() => { load(); }, []);
  const load = async () => { const res = await API.get('/events'); setEvents(res.data); };
  const handleCreate = async (e) => { e.preventDefault(); await API.post('/events', form); load(); setForm({ name: '', type: 'SOLO', fee: 0, max_team_size: 1 }); };
  const handleDelete = async (id) => { if(confirm("Delete?")) { await API.delete(`/events/${id}`); load(); }};

  return (
    <div>
      <h3 style={{marginBottom: '1.5rem'}}>Manage Events</h3>
      <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '1rem', marginBottom: '2rem' }}>
        <input placeholder="Event Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
        <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
          <option value="SOLO">SOLO</option><option value="GROUP">GROUP</option>
        </select>
        <input type="number" placeholder="Fee" value={form.fee} onChange={e => setForm({...form, fee: e.target.value})} />
        <input type="number" placeholder="Size" value={form.max_team_size} onChange={e => setForm({...form, max_team_size: e.target.value})} />
        <button className="btn" style={{padding: '0 20px'}}>Add</button>
      </form>
      <div className="grid-cards">
        {events.map(e => (
          <div key={e.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div><div style={{fontWeight:'bold'}}>{e.name}</div><div style={{fontSize:'0.85rem', color:'var(--text-muted)'}}>{e.type} • ₹{e.fee}</div></div>
            <button onClick={() => handleDelete(e.id)} className="btn-ghost">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
};

const VolunteersManager = () => {
  const [vols, setVols] = useState([]);
  const [form, setForm] = useState({ username: '', password: '', role: 'CASHIER' });
  useEffect(() => { load(); }, []);
  const load = async () => { const res = await API.get('/admin/volunteers'); setVols(res.data); };
  const handleCreate = async (e) => { e.preventDefault(); await API.post('/admin/volunteers', form); load(); setForm({ username: '', password: '', role: 'CASHIER' }); };

  return (
    <div>
      <h3 style={{marginBottom: '1.5rem'}}>Manage Staff</h3>
      <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '1rem', marginBottom: '2rem' }}>
        <input placeholder="Username" value={form.username} onChange={e => setForm({...form, username: e.target.value})} required />
        <input placeholder="PIN" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
        <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}><option value="ADMIN">ADMIN</option><option value="CASHIER">CASHIER</option><option value="GUARD">GUARD</option></select>
        <button className="btn">Add</button>
      </form>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {vols.map(v => (
          <div key={v.id} style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between' }}>
            <span>{v.username}</span> <span className="badge badge-neutral">{v.role}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const UsersManager = () => {
  const [users, setUsers] = useState([]);
  useEffect(() => { API.get('/admin/users').then(res => setUsers(res.data)); }, []);
  return (
    <div>
      <h3 style={{marginBottom: '1.5rem'}}>Participants ({users.length})</h3>
      <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
        <table className="data-table">
          <thead><tr><th>UID</th><th>Name</th><th>Email</th><th>Status</th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td><span className="badge badge-neutral">{u.uid}</span></td>
                <td>{u.name} {u.is_shadow && <span style={{color:'orange', fontSize:'0.8rem'}}>(Shadow)</span>}</td>
                <td style={{color:'var(--text-muted)'}}>{u.email}</td>
                <td><span className={u.payment_status === 'PAID' ? 'badge badge-success' : 'badge badge-danger'}>{u.payment_status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- NEW CASHIER PANEL (Token Generator) ---
const CashierPanel = () => {
  const [amount, setAmount] = useState('');
  const [tokenData, setTokenData] = useState(null);

  const handleGenerate = async (e) => {
    e.preventDefault();
    try { 
      // Hardcoding volunteer_id to 1 for MVP. In real app, store this in localStorage on login.
      const res = await API.post('/staff/generate-token', { amount: parseFloat(amount), volunteer_id: 1 });
      setTokenData(res.data);
      setAmount('');
    } catch (err) { alert("Failed to generate token"); }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <h3 style={{marginBottom: '1rem'}}>Spot Payment Token Generator</h3>
      <p style={{color: 'var(--text-muted)', marginBottom: '2rem'}}>
        1. Collect Cash from student.<br/>
        2. Generate Token.<br/>
        3. Student enters token in their Checkout Cart.
      </p>

      {/* Generator Form */}
      <form onSubmit={handleGenerate} style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '3rem' }}>
        <input 
          type="number" 
          placeholder="Amount (e.g. 500)" 
          value={amount} 
          onChange={e => setAmount(e.target.value)} 
          style={{ width: '200px', fontSize: '1.2rem' }}
          autoFocus
        />
        <button className="btn" style={{ width: 'auto' }}>Generate Token</button>
      </form>

      {/* Result Display */}
      {tokenData && (
        <div style={{ 
          background: 'rgba(99, 102, 241, 0.1)', 
          border: '2px dashed var(--primary)', 
          borderRadius: 'var(--radius)', 
          padding: '2rem' 
        }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>TOKEN GENERATED FOR ₹{tokenData.amount}</div>
          <div style={{ fontSize: '3.5rem', fontWeight: 'bold', letterSpacing: '4px', color: 'white', fontFamily: 'monospace' }}>
            {tokenData.token}
          </div>
          <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Share this code with the student.</p>
          <button className="btn-ghost" onClick={() => setTokenData(null)} style={{marginTop:'1rem'}}>Clear</button>
        </div>
      )}
    </div>
  );
};

const GuardPanel = () => {
  const [events, setEvents] = useState([]); const [selectedEvent, setSelectedEvent] = useState(null);
  const [uid, setUid] = useState(''); const [status, setStatus] = useState(null);
  useEffect(() => { API.get('/events').then(res => setEvents(res.data)); }, []);
  const handleCheckIn = async (e) => {
    e.preventDefault();
    try { const res = await API.post('/staff/mark-attendance', { user_uid: uid, event_id: selectedEvent }); setStatus({ success: true, msg: `ACCESS GRANTED: ${res.data.user_name}` }); setUid(''); }
    catch (err) { setStatus({ success: false, msg: err.response?.data?.detail || "ACCESS DENIED" }); }
  };

  if(!selectedEvent) return (
    <div>
      <h3>Select Check-in Event</h3>
      <div className="grid-cards">
        {events.map(e => <button key={e.id} className="btn btn-secondary" onClick={() => setSelectedEvent(e.id)}>{e.name}</button>)}
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
      <button onClick={() => setSelectedEvent(null)} className="btn-ghost" style={{marginBottom:'1rem'}}>&larr; Change Event</button>
      <h3>Gate Entry</h3>
      <form onSubmit={handleCheckIn}>
        <input placeholder="Scan/Type UID" value={uid} onChange={e => setUid(e.target.value)} autoFocus style={{fontSize:'1.5rem', textAlign:'center', letterSpacing:'2px'}} />
        <button className="btn" style={{marginTop:'1rem'}}>Verify Entry</button>
      </form>
      {status && <div style={{ marginTop: '2rem', padding: '1rem', borderRadius: 'var(--radius)', background: status.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: status.success ? '#34d399' : '#f87171', fontWeight: 'bold', fontSize: '1.2rem' }}>{status.msg}</div>}
    </div>
  );
};

export default AdminDashboard;