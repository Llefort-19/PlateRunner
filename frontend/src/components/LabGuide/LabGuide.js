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
  const [labInputs, setLabInputs] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  // Debounced save for lab inputs
  const saveInputsRef = useRef(null);
  useEffect(() => {
    saveInputsRef.current = debounce(async (inputs) => {
      try {
        await axios.post('/api/lab/inputs', { inputs });
      } catch {
        // Silent fail — inputs are advisory
      }
    }, 800);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [protoRes, inputsRes, ctxRes] = await Promise.all([
          axios.get('/api/lab/protocol'),
          axios.get('/api/lab/inputs'),
          axios.get('/api/experiment/context'),
        ]);
        const liveCtx = ctxRes.data || {};
        const liveMaterials = protoRes.data.materials || [];
        const built = buildSteps(protoRes.data.protocol);
        // Patch the header step with live context so title/eln are always current
        // Patch the materials step with live materials so newly added/edited materials always appear
        const patched = built.map(step => {
          if (step.type === 'header') {
            return { ...step, data: { ...step.data, title: liveCtx.title || step.data.title || '', eln: liveCtx.eln || step.data.eln || '' } };
          }
          if (step.type === 'materials' && liveMaterials.length > 0) {
            return { ...step, data: { ...step.data, materials: liveMaterials } };
          }
          return step;
        });
        setSteps(patched);
        setLabInputs(inputsRes.data.inputs || {});
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

  const handleSaveInput = useCallback((stepIndex, data) => {
    setLabInputs(prev => {
      const updated = { ...prev, [String(stepIndex)]: { ...prev[String(stepIndex)], ...data } };
      saveInputsRef.current?.(updated);
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
  const labInput = labInputs[String(step.index)] || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <InstallBanner />
      <LabGuideShell steps={steps} currentIndex={currentIndex} onNavigate={handleNavigate}>
        <StepCard
          key={currentIndex}
          step={step}
          labInput={labInput}
          labInputs={labInputs}
          onSaveInput={handleSaveInput}
        />
      </LabGuideShell>
    </div>
  );
};

export default LabGuide;
