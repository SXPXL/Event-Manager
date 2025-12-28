import React from 'react';

const Loading = ({ message = "Loading..." }) => {
  return (
    <div style={styles.container}>
      <div className="spinner"></div>
      <h3 style={styles.text}>{message}</h3>
      <style>{`
        .spinner {
          width: 50px;
          height: 50px;
          border: 5px solid rgba(255, 255, 255, 0.1);
          border-top: 5px solid var(--primary, #4f46e5); /* Use your primary color */
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

const styles = {
  container: {
    height: '100vh',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#121212', // Match your background
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 9999,
  },
  text: {
    color: '#e0e0e0',
    fontSize: '1.2rem',
    fontWeight: '300',
    letterSpacing: '1px',
    marginTop: '10px'
  }
};

export default Loading;