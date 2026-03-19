import React from 'react';
import axios from 'axios';

const MobileBridge = ({ onDesktop, onLogout }) => {
  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch {
      // ignore
    }
    onLogout();
  };

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 24px',
      background: '#f8fafc',
      fontFamily: 'inherit',
    }}>
      {/* Logo */}
      <div style={{
        width: 80,
        height: 80,
        borderRadius: 20,
        background: '#2563eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 40,
        marginBottom: 20,
      }}>
        ⚗️
      </div>

      <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 700, color: '#0f172a' }}>
        PlateRunner
      </h1>
      <p style={{ margin: '0 0 40px', fontSize: 15, color: '#64748b' }}>
        Where would you like to go?
      </p>

      {/* Primary: Lab Guide */}
      <a
        href="/lab"
        style={{
          display: 'block',
          width: '100%',
          maxWidth: 320,
          background: '#2563eb',
          color: '#fff',
          borderRadius: 14,
          padding: '16px',
          fontSize: 17,
          fontWeight: 600,
          textAlign: 'center',
          textDecoration: 'none',
          marginBottom: 12,
          boxSizing: 'border-box',
        }}
      >
        Open Lab Guide
      </a>

      {/* Secondary: Desktop App */}
      <button
        onClick={onDesktop}
        style={{
          display: 'block',
          width: '100%',
          maxWidth: 320,
          background: '#fff',
          color: '#2563eb',
          border: '1.5px solid #2563eb',
          borderRadius: 14,
          padding: '16px',
          fontSize: 17,
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: 40,
          boxSizing: 'border-box',
        }}
      >
        Use Desktop App
      </button>

      {/* Log out */}
      <button
        onClick={handleLogout}
        style={{
          background: 'none',
          border: 'none',
          color: '#94a3b8',
          fontSize: 14,
          cursor: 'pointer',
          padding: 0,
        }}
      >
        Log out
      </button>
    </div>
  );
};

export default MobileBridge;
