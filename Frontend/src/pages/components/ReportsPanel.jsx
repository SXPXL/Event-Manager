import { useState, useEffect } from 'react';
import API from '../../api';

const ReportsPanel = ({ role, forcedEvent = null }) => {
  const [events, setEvents] = useState([]);
  const [filterOption, setFilterOption] = useState('ALL');
  const [sortOption, setSortOption] = useState('NAME'); // <--- New State
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (forcedEvent) {
        setEvents([forcedEvent]);
        setLoading(false);
    } else {
        API.get('/events')
        .then(res => setEvents(res.data))
        .finally(() => setLoading(false));
    }
  }, [forcedEvent]);

  const downloadReport = async (eventId, eventName) => {
    try {
        // Pass both filter and sort params
        const response = await API.get(`/staff/export/event/${eventId}?filter=${filterOption}&sort=${sortOption}`, { responseType: 'blob' });
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${eventName}_${filterOption}_${sortOption}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    } catch (err) {
        alert("Download failed.");
    }
  };

  const downloadMaster = async () => {
    if(!confirm("Download FULL Database Report?")) return;
    try {
        const response = await API.get(`/admin/export/master`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `MASTER_DB_EXPORT.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    } catch (err) { alert("Download failed"); }
  };

  if (loading) return <div>Loading Data...</div>;

  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem'}}>
        <h3>📥 Data Extraction {forcedEvent && <span className="badge badge-primary">{forcedEvent.name}</span>}</h3>
        {role === 'ADMIN' && (
            <button className="btn" style={{width:'auto', background:'var(--accent)'}} onClick={downloadMaster}>
                ⬇ Export Master DB
            </button>
        )}
      </div>

      <div style={{background:'rgba(255,255,255,0.05)', padding:'1rem', borderRadius:'12px', marginBottom:'2rem', display:'flex', gap:'1.5rem', alignItems:'center', flexWrap:'wrap'}}>
          
          {/* FILTER DROPDOWN */}
          <div style={{display:'flex', flexDirection:'column', gap:'0.3rem'}}>
              <span style={{color:'var(--text-muted)', fontSize:'0.8rem', textTransform:'uppercase'}}>Filter Rows</span>
              <select value={filterOption} onChange={e => setFilterOption(e.target.value)} style={{padding:'8px', borderRadius:'6px', border:'none', fontSize:'1rem', minWidth:'150px'}}>
                  <option value="ALL">All Participants</option>
                  <option value="PRESENT">Attended Only</option>
                  <option value="ABSENT">Absent Only</option>
              </select>
          </div>

          {/* SORT DROPDOWN (NEW) */}
          <div style={{display:'flex', flexDirection:'column', gap:'0.3rem'}}>
              <span style={{color:'var(--text-muted)', fontSize:'0.8rem', textTransform:'uppercase'}}>Sort Order</span>
              <select value={sortOption} onChange={e => setSortOption(e.target.value)} style={{padding:'8px', borderRadius:'6px', border:'none', fontSize:'1rem', minWidth:'150px'}}>
                  <option value="NAME">By Name (A-Z)</option>
                  <option value="TEAM">Group by Team</option>
              </select>
          </div>

      </div>

      <div className="grid-cards">
        {events.map(e => (
          <div key={e.id} className="glass-card" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div>
                <div style={{fontWeight:'bold', fontSize:'1.1rem'}}>{e.name}</div>
                <div style={{fontSize:'0.9rem', color:'var(--text-muted)'}}>
                    {e.type} • {e.total_registrations} Regs 
                    {sortOption === 'TEAM' && e.type === 'GROUP' && <span style={{color:'var(--primary)', marginLeft:'5px'}}> (Grouped)</span>}
                </div>
            </div>
            <button className="btn btn-secondary" onClick={() => downloadReport(e.id, e.name)}>
                ⬇ Download List
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReportsPanel;