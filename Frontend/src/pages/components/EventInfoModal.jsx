import React, { useState } from 'react';

const EventInfoModal = ({ event, onClose, onConfirm }) => {
  const [agreed, setAgreed] = useState(false);

  // Format Date & Time
  const formatDate = (dateStr) => {
    if(!dateStr) return "Date TBA";
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  const formatTime = (start, end) => {
    if(!start) return "";
    let s = start.substring(0, 5);
    let e = end ? end.substring(0, 5) : "";
    return `${s} ${e ? '- ' + e : ''}`;
  };

  return (
    <div className="modal-overlay">
      <div className="glass-card modal-content" style={{ maxWidth: '600px', width: '90%', textAlign: 'left' }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
            <div>
                <h2 style={{ fontSize: '1.8rem', margin: 0, lineHeight: 1.2 }}>{event.name}</h2>
                <div style={{ color: 'var(--primary)', fontWeight: 'bold', marginTop: '5px' }}>
                    {event.type} • ₹{event.fee}
                </div>
            </div>
            <button onClick={onClose} className="btn-icon" style={{ fontSize: '1.5rem', lineHeight: 1 }}>✕</button>
        </div>

        {/* DETAILS BODY */}
        <div style={{ maxHeight: '60vh', overflowY: 'auto', marginBottom: '1.5rem', paddingRight: '5px' }}>
            
            {/* DATE & TIME BADGE */}
            {(event.date || event.start_time) && (
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px', marginBottom: '1rem', display:'flex', gap:'15px', alignItems:'center' }}>
                    <span style={{ fontSize: '1.2rem' }}>📅</span>
                    <div>
                        <div style={{ fontWeight: 'bold' }}>{formatDate(event.date)}</div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{formatTime(event.start_time, event.end_time)}</div>
                    </div>
                </div>
            )}

            {/* DESCRIPTION */}
            <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Description & Rules</h4>
            <div style={{ whiteSpace: 'pre-line', lineHeight: '1.6', color: '#e0e0e0', fontSize: '0.95rem' }}>
                {event.description || "No description provided for this event."}
            </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
            <label style={{ display: 'flex', gap: '10px', cursor: 'pointer', marginBottom: '1.5rem', alignItems: 'center' }}>
                <input 
                    type="checkbox" 
                    checked={agreed} 
                    onChange={e => setAgreed(e.target.checked)} 
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.9rem' }}>I have read the rules and agree to the terms.</span>
            </label>

            <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
                <button 
                    className="btn" 
                    disabled={!agreed} 
                    style={{ flex: 1, opacity: agreed ? 1 : 0.5, cursor: agreed ? 'pointer' : 'not-allowed' }}
                    onClick={onConfirm}
                >
                    Add to Stack
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};

export default EventInfoModal;