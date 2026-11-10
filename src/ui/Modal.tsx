import type { ReactNode } from 'react';

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h2 className="font-bold">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="بستن">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
