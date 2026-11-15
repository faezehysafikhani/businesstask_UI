import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function Modal({ title, onClose, children, size = 'md' }: { title: string; onClose: () => void; children: ReactNode; size?: 'md' | 'lg' | 'xl' }) {
  return createPortal(
    <div className="fixed inset-0 backdrop grid place-items-center p-4 z-50" onClick={onClose}>
      <div className={`bg-white rounded-[22px] w-full ${size === 'xl' ? 'max-w-5xl' : size === 'lg' ? 'max-w-3xl' : 'max-w-2xl'} p-6 space-y-3 shadow-[0_30px_80px_rgba(30,20,100,.35)]`} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h2 className="font-bold">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="بستن">✕</button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
