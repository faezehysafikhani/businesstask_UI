import type { ReactNode } from 'react';

/** A list with nothing in it: a big icon, a line, and the page's main action. */
export function Empty({ icon, text, actionLabel, onAction }: { icon: ReactNode; text: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="py-14 text-center text-slate-400 space-y-2">
      <div className="text-5xl opacity-80">{icon}</div>
      <div className="text-sm">{text}</div>
      {onAction && actionLabel && <button onClick={onAction} className="mt-2 rounded-2xl px-5 py-2.5 text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>{actionLabel}</button>}
    </div>
  );
}
