import { useEffect, useState } from 'react';

export interface ToastMessage {
  id: string;
  text: string;
}

let toastListeners: Array<(msg: ToastMessage) => void> = [];

// Simple pub/sub so any component can trigger a toast without prop drilling.
export function showToast(text: string) {
  const msg: ToastMessage = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, text };
  toastListeners.forEach((listener) => listener(msg));
}

export function ToastHost() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const listener = (msg: ToastMessage) => {
      setToasts((prev) => [...prev, msg]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== msg.id));
      }, 4000);
    };
    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== listener);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 28,
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      zIndex: 9999,
      pointerEvents: 'none',
    }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            backgroundColor: 'rgba(20,20,20,0.92)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 10,
            padding: '12px 20px',
            color: '#fff',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '0.85rem',
            fontWeight: 500,
            boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
            animation: 'toast-in 200ms ease',
            maxWidth: 400,
            textAlign: 'center',
          }}
        >
          {t.text}
        </div>
      ))}
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
