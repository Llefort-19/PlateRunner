import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Helper function to format validation error details
const formatValidationDetails = (details) => {
  if (!details || typeof details !== 'object') return '';

  const errors = [];
  Object.entries(details).forEach(([field, messages]) => {
    // Handle both array and string error messages
    if (Array.isArray(messages)) {
      messages.forEach(msg => {
        // Make field names user-friendly
        const friendlyField = field
          .replace(/_/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase());
        errors.push(`${friendlyField}: ${msg}`);
      });
    } else {
      const friendlyField = field
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
      errors.push(`${friendlyField}: ${messages}`);
    }
  });

  return errors.join('\n');
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      message,
      type,
      duration
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-remove toast after duration
    setTimeout(() => {
      removeToast(id);
    }, duration);

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showSuccess = useCallback((message, duration) => {
    return showToast(message, 'success', duration);
  }, [showToast]);

  const showError = useCallback((message, duration) => {
    return showToast(message, 'error', duration);
  }, [showToast]);

  const showInfo = useCallback((message, duration) => {
    return showToast(message, 'info', duration);
  }, [showToast]);

  const showWarning = useCallback((message, duration) => {
    return showToast(message, 'warning', duration);
  }, [showToast]);

  const showValidationError = useCallback((errorResponse, duration = 8000) => {
    const { message, details, error } = errorResponse;

    // Handle different error response formats
    const errorMessage = message || error || 'Validation failed';

    if (details) {
      const detailsText = formatValidationDetails(details);
      return showError(`${errorMessage}\n\n${detailsText}`, duration);
    }

    return showError(errorMessage, duration);
  }, [showError]);

  const value = {
    toasts,
    showToast,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    showValidationError,
    removeToast
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
}; 