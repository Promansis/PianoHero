import { useEffect, useState } from 'react';

export type ToastVariant = 'info' | 'success' | 'warn' | 'error';

export interface ToastMessage {
  id: number;
  variant: ToastVariant;
  title: string;
  message?: string;
  icon?: string;
  durationMs?: number;
}

type Listener = (toasts: ToastMessage[]) => void;

const listeners = new Set<Listener>();
let toasts: ToastMessage[] = [];
let nextId = 1;

function emit() {
  for (const listener of listeners) listener(toasts);
}

export const toastBus = {
  push(input: Omit<ToastMessage, 'id'>) {
    const toast: ToastMessage = { id: nextId++, durationMs: 4000, ...input };
    toasts = [...toasts, toast];
    emit();
    if (toast.durationMs && toast.durationMs > 0) {
      window.setTimeout(() => toastBus.dismiss(toast.id), toast.durationMs);
    }
    return toast.id;
  },
  dismiss(id: number) {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  },
};

function defaultIcon(variant: ToastVariant): string {
  switch (variant) {
    case 'success':
      return '✓';
    case 'warn':
      return '!';
    case 'error':
      return '✕';
    default:
      return 'i';
  }
}

export function ToastHost() {
  const [items, setItems] = useState<ToastMessage[]>(toasts);

  useEffect(() => {
    const listener: Listener = (next) => setItems(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="toast-host" aria-live="polite">
      {items.map((toast, index) => (
        <aside
          key={toast.id}
          className={`achievement-toast toast-item toast-item--${toast.variant}`}
          role="status"
          style={{ bottom: `${24 + index * 92}px` }}
        >
          <div className="achievement-toast-icon">{toast.icon ?? defaultIcon(toast.variant)}</div>
          <div>
            <p className="eyebrow">{toast.variant === 'error' ? 'Error' : toast.variant === 'warn' ? 'Heads up' : toast.variant === 'success' ? 'Success' : 'Notice'}</p>
            <strong>{toast.title}</strong>
            {toast.message && <p className="panel-copy">{toast.message}</p>}
          </div>
          <button className="secondary-button" onClick={() => toastBus.dismiss(toast.id)}>
            Dismiss
          </button>
        </aside>
      ))}
    </div>
  );
}
