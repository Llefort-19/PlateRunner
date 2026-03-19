import React, { useState, useEffect } from 'react';

const DISMISSED_KEY = 'lab_install_banner_dismissed';

const InstallBanner = () => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Already installed as PWA — don't show banner
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setIsStandalone(true);
      return;
    }

    if (localStorage.getItem(DISMISSED_KEY)) {
      setDismissed(true);
      return;
    }

    // Detect iOS Safari
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    // Listen for Chrome/Android install prompt
    const handler = (e) => {
      e.preventDefault();
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

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  };

  // Don't show if: already installed, dismissed, or neither iOS nor Android prompt
  if (isStandalone || dismissed || (!installPrompt && !isIOS)) return null;

  return (
    <div style={{
      background: '#2563eb',
      color: '#fff',
      padding: '10px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      fontSize: 13,
      flexShrink: 0,
    }}>
      <span style={{ flex: 1 }}>
        {isIOS
          ? <>Tap <strong>Share</strong> → <strong>Add to Home Screen</strong> to install PlateRunner Lab</>
          : <>Install <strong>PlateRunner Lab</strong> on your home screen for the best experience</>
        }
      </span>
      {!isIOS && installPrompt && (
        <button
          onClick={handleInstall}
          style={{
            background: '#fff',
            color: '#2563eb',
            border: 'none',
            borderRadius: 6,
            padding: '4px 12px',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Install
        </button>
      )}
      <button
        onClick={handleDismiss}
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(255,255,255,0.8)',
          fontSize: 18,
          cursor: 'pointer',
          lineHeight: 1,
          padding: '0 2px',
        }}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
};

export default InstallBanner;
