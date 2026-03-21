import React, { useState, useEffect } from 'react';

const InstallBanner = () => {
  const [installPrompt, setInstallPrompt] = useState(window.__pwaInstallPrompt || null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false); // session-only

  useEffect(() => {
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone
    ) {
      setIsStandalone(true);
      return;
    }

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    // Check if already captured globally (before React mounted)
    if (window.__pwaInstallPrompt) {
      setInstallPrompt(window.__pwaInstallPrompt);
    }

    // Also listen for late-arriving events
    const handler = (e) => {
      e.preventDefault();
      window.__pwaInstallPrompt = e;
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setDismissed(true);
    }
    setInstallPrompt(null);
  };

  // Don't show if: already standalone, dismissed, or nothing actionable (app already installed)
  if (isStandalone || dismissed || (!isIOS && !installPrompt)) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      background: 'rgba(0,0,0,0.55)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 20,
        padding: '32px 24px 24px',
        maxWidth: 360,
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>
        {/* Logo */}
        <img
          src="/Unicorn_lab_no_bg.png"
          alt="PlateRunner"
          style={{ width: 240, height: 240, objectFit: 'contain', margin: '0 auto 16px', display: 'block' }}
        />

        <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: '#0f172a' }}>
          Install PlateRunner Lab
        </h2>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>
          Add to your home screen for the best lab experience
        </p>

        {isIOS ? (
          /* iOS: Safari share instructions */
          <div style={{
            background: '#f1f5f9',
            borderRadius: 12,
            padding: '16px',
            textAlign: 'left',
            marginBottom: 20,
          }}>
            <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
              To install on iOS:
            </p>
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: '#334155', lineHeight: 1.8 }}>
              <li>Tap the <strong>Share</strong> button <span style={{ fontSize: 16 }}>⬆</span> in Safari</li>
              <li>Scroll down and tap <strong>Add to Home Screen</strong></li>
              <li>Tap <strong>Add</strong> to confirm</li>
            </ol>
          </div>
        ) : installPrompt ? (
          /* Android: native install prompt available */
          <button
            onClick={handleInstall}
            style={{
              width: '100%',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '14px',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: 12,
            }}
          >
            Install app
          </button>
        ) : null}

        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            fontSize: 14,
            cursor: 'pointer',
            padding: '8px',
            display: 'block',
            width: '100%',
          }}
        >
          Not now
        </button>
      </div>
    </div>
  );
};

export default InstallBanner;
