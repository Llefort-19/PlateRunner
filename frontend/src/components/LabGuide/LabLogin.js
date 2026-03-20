import React, { useState } from 'react';
import axios from 'axios';

const LabLogin = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await axios.post('/api/auth/login', { username, password });
      onLogin();
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
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
      <div style={{
        width: 64,
        height: 64,
        borderRadius: 16,
        background: '#2563eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 32,
        marginBottom: 16,
      }}>
        ⚗️
      </div>

      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#0f172a' }}>
        PlateRunner Lab
      </h1>
      <p style={{ margin: '0 0 28px', fontSize: 14, color: '#64748b' }}>
        Sign in to continue
      </p>

      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 300 }}>
        {error && (
          <div style={{
            background: '#fef2f2',
            color: '#dc2626',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 13,
            marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          style={{
            display: 'block',
            width: '100%',
            padding: '12px 14px',
            border: '1.5px solid #cbd5e1',
            borderRadius: 10,
            fontSize: 16,
            marginBottom: 12,
            boxSizing: 'border-box',
            outline: 'none',
          }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          style={{
            display: 'block',
            width: '100%',
            padding: '12px 14px',
            border: '1.5px solid #cbd5e1',
            borderRadius: 10,
            fontSize: 16,
            marginBottom: 20,
            boxSizing: 'border-box',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={loading || !username || !password}
          style={{
            display: 'block',
            width: '100%',
            padding: '14px',
            background: loading ? '#93c5fd' : '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 600,
            cursor: loading ? 'default' : 'pointer',
            boxSizing: 'border-box',
          }}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
};

export default LabLogin;
