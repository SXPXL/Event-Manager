import React, { useEffect, useState } from 'react';
import API from '../../api';

const UserCard = ({ uid, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await API.get(`/check-uid/${uid}`);
        if (res.data.exists) {
          setData(res.data);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [uid]);

  if (!uid) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="glass-card modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: '700px', width: '90%', padding: '2rem' }}
      >
        {loading ? (
          <div style={{textAlign:'center', padding:'2rem'}}>
             <div className="pulse-loader"></div>
             <p style={{marginTop:'1rem', color:'#888'}}>Accessing Database...</p>
          </div>
        ) : error || !data ? (
          <div style={{textAlign:'center', padding:'2rem'}}>
             <h3 style={{color:'#ef4444'}}>User Not Found</h3>
             <button className="btn btn-secondary" onClick={onClose}>Close</button>
          </div>
        ) : (
          <>
            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1rem', flexWrap:'wrap', gap:'10px' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.8rem' }}>{data.user.name}</h2>
                    <p style={{ color: 'var(--text-muted)', margin: '5px 0' }}>{data.user.college || "No College Provided"}</p>
                    <div style={{ display:'flex', gap:'1rem', fontSize:'0.9rem', color:'#ccc' }}>
                        <span>📞 {data.user.phone || "N/A"}</span>
                        <span>✉️ {data.user.email}</span>
                    </div>
                </div>
                <div style={{textAlign:'right'}}>
                    <span className="badge badge-neutral" style={{ height:'fit-content', fontSize: '1.2rem' }}>{data.user.uid}</span>
                    {data.user.is_shadow && <div style={{color:'orange', fontSize:'0.8rem', marginTop:'5px', fontWeight:'bold'}}>SHADOW USER</div>}
                </div>
            </div>

            {/* TABLE */}
            <h4 style={{ marginBottom: '1rem', color: 'var(--text-muted)', textTransform:'uppercase', fontSize:'0.85rem', letterSpacing:'1px' }}>Participating Events</h4>
            
            <div className="table-responsive">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign:'left', minWidth: '400px' }}>
                    <thead>
                        <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            <th style={{ padding: '8px' }}>Event</th>
                            <th style={{ padding: '8px' }}>Team</th>
                            <th style={{ padding: '8px' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(!data.registered_events || data.registered_events.length === 0) && (
                            <tr><td colSpan="3" style={{padding:'20px', textAlign:'center', color:'#666'}}>No active registrations found.</td></tr>
                        )}
                        {data.registered_events?.map((evt, idx) => {
                            // --- ROBUST DATA HANDLING ---
                            // Check for 'name' OR 'event_name'
                            const eventName = evt.name || evt.event_name || "Unknown Event";
                            
                            // Check for 'team_name' string OR 'team' object
                            // The ?. check prevents the Blank Screen Crash
                            const teamName = evt.team_name || evt.team?.name || "-";
                            const isLeader = evt.team?.is_user_leader || false;

                            return (
                                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>
                                        {eventName}
                                    </td>
                                    <td style={{ padding: '12px 8px' }}>
                                        {teamName !== "-" ? (
                                            <span>
                                                {teamName} 
                                                {isLeader && <span className="badge badge-warning" style={{fontSize:'0.6rem', marginLeft:'5px'}}>LDR</span>}
                                            </span>
                                        ) : (
                                            <span style={{color:'#666'}}>-</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '12px 8px' }}>
                                        {evt.payment_status === 'PAID' ? 
                                            <span className="badge badge-success">PAID</span> : 
                                            <span className="badge badge-warning">{evt.payment_status}</span>
                                        }
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* FOOTER */}
            <button className="btn btn-secondary" style={{ marginTop: '2rem', width: '100%' }} onClick={onClose}>Close Profile</button>
          </>
        )}
      </div>
    </div>
  );
};

export default UserCard;