import { useState, useEffect } from 'react';
import API from '../../api'; 

const GuardEventView = ({ forcedEvent }) => {
  const [masterList, setMasterList] = useState([]);
  const [events, setEvents] = useState([]);
  
  // Selection State
  const [selectedEventId, setSelectedEventId] = useState(forcedEvent ? forcedEvent.id : '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [regRes, eventRes] = await Promise.all([
          API.get('/staff/all-registrations'),
          API.get('/events')
        ]);
        setMasterList(regRes.data);
        setEvents(eventRes.data);
      } catch (err) {
        console.error("Failed to load roster");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Sync forcedEvent if it changes
  useEffect(() => {
    if(forcedEvent) setSelectedEventId(forcedEvent.id);
  }, [forcedEvent]);

  // Grouping Logic
  const getGroupedData = () => {
    if (!selectedEventId) return {};
    const eventAttendees = masterList.filter(r => r.event_id === parseInt(selectedEventId));
    return eventAttendees.reduce((groups, ticket) => {
      const key = ticket.team_name || "Individual";
      if (!groups[key]) groups[key] = [];
      groups[key].push(ticket);
      return groups;
    }, {});
  };

  const groupedAttendees = getGroupedData();

  return (
    <div className="dashboard-container">
      
      {/* 1. SELECTOR (Hidden if Guard is locked to an event) */}
      {!forcedEvent && (
        <div className="glass-card" style={{ marginBottom: '2rem' }}>
            <label style={{color:'#aaa', marginBottom:'5px', display:'block'}}>Select Event to View Roster:</label>
            <select 
            value={selectedEventId} 
            onChange={e => setSelectedEventId(e.target.value)}
            style={{ width: '100%', padding: '15px', background: '#222', color: 'white', border: '1px solid #444', borderRadius:'8px' }}
            >
            <option value="">-- Choose Event --</option>
            {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
        </div>
      )}

      {/* 2. HEADER FOR LOCKED EVENT */}
      {forcedEvent && <h3 style={{marginBottom:'1rem'}}>📋 Roster: {forcedEvent.name}</h3>}
      
      {loading && <div style={{padding:'2rem', textAlign:'center', color:'#888'}}>Loading Database...</div>}

      {/* 3. ROSTER GRID */}
      <div className="grid-cards">
        {/* Empty State */}
        {selectedEventId && Object.keys(groupedAttendees).length === 0 && !loading && (
           <div style={{gridColumn:'1/-1', textAlign:'center', color:'#666', padding:'2rem'}}>
              No participants found.
           </div>
        )}

        {/* Team Cards */}
        {Object.keys(groupedAttendees).map((teamName) => (
          <div key={teamName} className="glass-card" style={{ borderTop: '4px solid var(--primary)' }}>
            
            {/* Team Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom:'1px solid #333', paddingBottom:'0.5rem' }}>
              <h3 style={{ margin: 0, fontSize:'1.1rem', color:'white' }}>{teamName}</h3>
              <span className="badge badge-neutral">{groupedAttendees[teamName].length}</span>
            </div>

            {/* Member List (Read-Only) */}
            <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
              {groupedAttendees[teamName].map((member) => (
                <div key={member.reg_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems:'center' }}>
                  
                  {/* User Info */}
                  <div>
                    <div style={{fontWeight:'bold', fontSize:'0.95rem'}}>{member.user_name}</div>
                    <div style={{fontSize:'0.75rem', color:'#888'}}>{member.user_uid}</div>
                  </div>

                  {/* Status Indicator (No Button) */}
                  <span 
                    style={{
                      fontSize: '0.75rem', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px',
                      background: member.attended ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      color: member.attended ? '#34d399' : '#666',
                      border: member.attended ? '1px solid #34d399' : '1px solid #444'
                    }}
                  >
                    {member.attended ? "IN" : "PENDING"}
                  </span>

                </div>
              ))}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
};

export default GuardEventView;