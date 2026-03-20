import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import './LabGuide.css';
import { buildSteps } from './buildSteps';
import LabGuideShell from './LabGuideShell';
import StepCard from './StepCard';
import InstallBanner from './InstallBanner';
import LabLogin from './LabLogin';

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

const LabGuide = () => {
  const [steps, setSteps] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [deviations, setDeviations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  // Debounced save
  const saveRef = useRef(null);
  useEffect(() => {
    saveRef.current = debounce(async (devs) => {
      try {
        await axios.post('/api/lab/deviations', { deviations: devs });
      } catch {
        // Silent fail — deviations are advisory
      }
    }, 800);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [protoRes, devRes] = await Promise.all([
          axios.get('/api/lab/protocol'),
          axios.get('/api/lab/deviations'),
        ]);
        const built = buildSteps(protoRes.data.protocol);
        setSteps(built);
        setDeviations(devRes.data.deviations || []);
      } catch (e) {
        if (e.response?.status === 401) {
          const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
          if (standalone) {
            setNeedsLogin(true);
          } else {
            window.location.href = '/';
          }
        } else {
          setError('Failed to load lab guide. Please return to desktop and try again.');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSaveDeviation = useCallback((newDev) => {
    setDeviations(prev => {
      const idx = prev.findIndex(
        d => d.step_index === newDev.step_index && d.field === newDev.field
      );
      const updated = idx >= 0
        ? prev.map((d, i) => i === idx ? newDev : d)
        : [...prev, newDev];
      saveRef.current?.(updated);
      return updated;
    });
  }, []);

  const handleNavigate = useCallback((idx) => {
    setCurrentIndex(Math.max(0, Math.min(steps.length - 1, idx)));
  }, [steps.length]);

  if (needsLogin) {
    return <LabLogin onLogin={() => { setNeedsLogin(false); setLoading(true); window.location.reload(); }} />;
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', fontFamily: 'inherit' }}>
        <div style={{ textAlign: 'center', color: 'var(--color-text-secondary, #64748b)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚗️</div>
          Loading lab guide…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', padding: 24, fontFamily: 'inherit' }}>
        <div style={{ textAlign: 'center', maxWidth: 340 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <p style={{ marginBottom: 16 }}>{error}</p>
          <a href="/" style={{ color: 'var(--color-primary, #4f46e5)', textDecoration: 'none' }}>← Back to desktop</a>
        </div>
      </div>
    );
  }

  if (steps.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', padding: 24, fontFamily: 'inherit' }}>
        <div style={{ textAlign: 'center', maxWidth: 340 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <p style={{ marginBottom: 8, fontWeight: 600 }}>No protocol configured yet</p>
          <p style={{ color: 'var(--color-text-secondary, #64748b)', fontSize: 14, marginBottom: 16 }}>
            Go to the Design tab on your desktop, open the Plating Protocol wizard, and complete it.
          </p>
          <a href="/" style={{ color: 'var(--color-primary, #4f46e5)', textDecoration: 'none' }}>← Back to desktop</a>
        </div>
      </div>
    );
  }

  const step = steps[currentIndex];
  const deviation = deviations.find(
    d => d.step_index === step.index && d.step_type === step.type
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <InstallBanner />
      <LabGuideShell steps={steps} currentIndex={currentIndex} onNavigate={handleNavigate}>
        <StepCard
          key={currentIndex}
          step={step}
          deviation={deviation || null}
          deviations={deviations}
          onSaveDeviation={handleSaveDeviation}
        />
      </LabGuideShell>
    </div>
  );
};

export default LabGuide;
