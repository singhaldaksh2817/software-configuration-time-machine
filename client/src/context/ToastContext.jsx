import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', title = null) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    setToasts(prev => [...prev, { id, message, type, title }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-archival-success shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-archival-warning shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-archival-danger shrink-0" />,
    info: <Info className="w-5 h-5 text-archival-teal shrink-0" />
  };

  const borders = {
    success: 'border-archival-success/40',
    warning: 'border-archival-warning/40',
    error: 'border-archival-danger/40',
    info: 'border-archival-teal/40'
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-lg bg-archival-elevated border ${borders[toast.type] || 'border-archival-border'} shadow-2xl transition-all duration-200 animate-in slide-in-from-bottom-2`}
          >
            {icons[toast.type] || icons.info}
            <div className="flex-1 min-w-0">
              {toast.title && <div className="text-sm font-semibold text-archival-text">{toast.title}</div>}
              <div className="text-xs text-archival-muted leading-relaxed break-words">{toast.message}</div>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-archival-muted hover:text-archival-text transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
