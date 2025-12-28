import { useState, useEffect } from 'react';
import API from '../../api';

const StaffWalkIn = ({ volunteerId }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);

  // Form State
  const [isGroup, setIsGroup] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [leader, setLeader] = useState({ name: '', email: '', phone: '', college: '' });
  const [members, setMembers] = useState([]); 

  useEffect(() => {
    API.get('/events').then(res => setEvents(res.data));
  }, []);

  // --- HANDLERS ---
  const handleEventChange = (e) => {
    const newId = e.target.value;
    setSelectedEventId(newId);

    // AUTO-DETECT GROUP vs SOLO
    const evt = events.find(ev => ev.id == newId);
    if (evt) {
        if (evt.type === 'GROUP') {
            setIsGroup(true);
        } else {
            setIsGroup(false);
            setMembers([]); 
        }
    }
  };

  const handleAddMember = () => {
    setMembers([...members, { name: '', email: '' }]);
  };

  const handleMemberChange = (index, field, value) => {
    const updated = [...members];
    updated[index][field] = value;
    setMembers(updated);
  };

  const removeMember = (index) => {
    const updated = members.filter((_, i) => i !== index);
    setMembers(updated);
  };

  const calculateTotal = () => {
    const evt = events.find(e => e.id == selectedEventId);
    if (!evt) return 0;
    
    // FIX: Return the flat fee for the event (Do not multiply by members)
    return evt.fee; 
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEventId) { alert("Select an Event!"); return; }
    
    // --- START CHANGES: DYNAMIC MIN/MAX VALIDATION ---
    const evt = events.find(e => e.id == selectedEventId);
    
    if (isGroup) {
        const totalParticipants = 1 + members.length; // Leader + Members

        if (totalParticipants < evt.min_team_size) {
            alert(`⚠️ GROUP EVENT ERROR\n\nThis event requires a minimum of ${evt.min_team_size} participants.\nYou currently have ${totalParticipants}.`);
            return;
        }

        if (totalParticipants > evt.max_team_size) {
            alert(`⚠️ GROUP EVENT ERROR\n\nThis event allows a maximum of ${evt.max_team_size} participants.\nYou currently have ${totalParticipants}.`);
            return;
        }
    }
    // --- END CHANGES ---
    
    setLoading(true);
    try {
      const payload = {
        ...leader,
        event_id: parseInt(selectedEventId),
        volunteer_id: volunteerId || 1,
        members: isGroup ? members : []
      };

      const res = await API.post('/staff/walk-in-register', payload);
      setSuccessData(res.data.data);
    } catch (err) {
      alert(err.response?.data?.detail || "Registration Failed");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSuccessData(null);
    setLeader({ name: '', email: '', phone: '', college: '' });
    setMembers([]);
    setIsGroup(false);
    setSelectedEventId('');
  };

  // --- RESULT VIEW ---
  if (successData) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '3rem' }}>✅</div>
        <h2>Registration Complete</h2>
        <p style={{ color: 'var(--success)', fontSize: '1.5rem', fontWeight: 'bold' }}>
          Collected: ₹{successData.total_paid}
        </p>
        
        <div style={{ margin: '2rem auto', maxWidth: '600px', textAlign: 'left' }}>
          <h4 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
            WRITE THESE UIDS ON ID CARDS:
          </h4>
          {successData.participants.map((p, idx) => (
            <div key={idx} className="glass-card" style={{ padding: '1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{p.name}</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{p.role}</div>
              </div>
              <div className="badge badge-neutral" style={{ fontSize: '1.4rem', letterSpacing: '2px' }}>
                {p.uid}
              </div>
            </div>
          ))}
        </div>

        <button className="btn" onClick={resetForm}>Next Registration</button>
      </div>
    );
  }

  // --- FORM VIEW ---
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h3>⚡ Walk-in Registration</h3>
        {selectedEventId && (
            <span className={`badge ${isGroup ? 'badge-warning' : 'badge-primary'}`}>
                {isGroup ? 'GROUP EVENT' : 'SOLO EVENT'}
            </span>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h4 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>1. Event Selection</h4>
          <select 
            required 
            value={selectedEventId} 
            onChange={handleEventChange}
            style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '8px' }}
          >
            <option value="">-- Select Event --</option>
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>
                {ev.name} ({ev.type}) - ₹{ev.fee}
              </option>
            ))}
          </select>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h4 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>2. {isGroup ? 'Team Leader' : 'Participant'} Details</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <input required placeholder="Full Name" value={leader.name} onChange={e => setLeader({...leader, name: e.target.value})} />
            <input required type="email" placeholder="Email" value={leader.email} onChange={e => setLeader({...leader, email: e.target.value})} />
            <input required placeholder="Phone" value={leader.phone} onChange={e => setLeader({...leader, phone: e.target.value})} />
            <input required placeholder="College" value={leader.college} onChange={e => setLeader({...leader, college: e.target.value})} />
          </div>
        </div>

        {isGroup && (
          <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem', borderLeft: '4px solid var(--accent)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0 }}>3. Team Members</h4>
                <button type="button" onClick={handleAddMember} className="btn-ghost" style={{ border: '1px solid var(--glass-border)' }}>+ Add Member</button>
            </div>
            
            {members.map((mem, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input required placeholder="Member Name" value={mem.name} onChange={e => handleMemberChange(idx, 'name', e.target.value)} />
                    <input required type="email" placeholder="Member Email" value={mem.email} onChange={e => handleMemberChange(idx, 'email', e.target.value)} />
                    <button type="button" onClick={() => removeMember(idx)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>✕</button>
                </div>
            ))}
            {members.length === 0 && <p style={{ color: 'var(--warning)', fontWeight: 'bold' }}>⚠️ Add the required amount of participants.</p>}
          </div>
        )}

        <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>TOTAL PAYABLE CASH</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)' }}>₹{calculateTotal()}</div>
            </div>
            <button type="submit" className="btn" style={{ width: 'auto', padding: '12px 30px' }} disabled={loading}>
                {loading ? 'Processing...' : '💰 Collect Cash & Register'}
            </button>
        </div>
      </form>
    </div>
  );
};

export default StaffWalkIn;