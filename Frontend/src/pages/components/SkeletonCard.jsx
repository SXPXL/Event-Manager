import React from 'react';

const SkeletonCard = () => {
  return (
    <div className="glass-card" style={{ height: '200px', position: 'relative', overflow: 'hidden' }}>
      {/* ANIMATION STYLES INJECTED HERE FOR ISOLATION */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .skeleton-box {
          background: #2a2a30;
          background-image: linear-gradient(90deg, #2a2a30 25%, #3a3a40 50%, #2a2a30 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div className="skeleton-box" style={{ width: '60px', height: '20px' }}></div>
        <div className="skeleton-box" style={{ width: '40px', height: '20px' }}></div>
      </div>
      
      <div className="skeleton-box" style={{ width: '80%', height: '30px', marginBottom: '1rem' }}></div>
      <div className="skeleton-box" style={{ width: '50%', height: '20px', marginBottom: '2rem' }}></div>
      
      <div className="skeleton-box" style={{ width: '100%', height: '40px', marginTop: 'auto' }}></div>
    </div>
  );
};

export default SkeletonCard;