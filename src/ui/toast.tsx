import { useEffect, useState } from 'react';

export type ToastKind = 'success' | 'error' | 'info';
interface ToastItem { id: number; kind: ToastKind; text: string }
type Listener = (t: ToastItem) => void;
const listeners = new Set<Listener>();
let seq = 0;

/** Show a short message. Called by the API layer after a change succeeds or fails. */
export function notify(kind: ToastKind, text: string) {
  const t = { id: ++seq, kind, text };
  listeners.forEach((l) => l(t));
}

const COLOR: Record<ToastKind, string> = { success: '#10b981', error: '#ef4444', info: '#5b4bff' };

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    const l: Listener = (t) => {
      setItems((x) => [...x.slice(-3), t]);
      setTimeout(() => setItems((x) => x.filter((i) => i.id !== t.id)), t.kind === 'error' ? 5000 : 2500);
    };
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2" role="status" aria-live="polite">
      {items.map((t) => <div key={t.id} className="toast" style={{ ['--c' as string]: COLOR[t.kind] }}>{t.text}</div>)}
    </div>
  );
}
