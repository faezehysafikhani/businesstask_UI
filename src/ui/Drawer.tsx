import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

/** A panel from the edge: shows a record without leaving the page. */
export function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <>
      <div className="fixed inset-0 z-[74] backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label={title}>
        <button onClick={onClose} aria-label="بستن" className="absolute top-4 left-4 size-8 rounded-full bg-blue-50 text-blue-600 grid place-items-center"><X size={16} /></button>
        <h3 className="text-lg font-bold mt-2 mb-4 pe-8">{title}</h3>
        {children}
      </aside>
    </>
  );
}
