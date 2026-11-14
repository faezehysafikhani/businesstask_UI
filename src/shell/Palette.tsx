import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { MENU, itemAllowed } from './menu';

/** Ctrl+K: jump to a page. Arrow keys move, Enter opens, Esc closes. */
export function Palette({ onClose }: { onClose: () => void }) {
  const { can } = useAuth();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [at, setAt] = useState(0);
  const ref = useRef<HTMLInputElement>(null);
  const hits = useMemo(() => MENU.filter((m) => itemAllowed(m, can) && `${m.label} ${m.hint ?? ''}`.includes(q.trim())), [q, can]);
  useEffect(() => ref.current?.focus(), []);
  useEffect(() => setAt(0), [q]);
  const go = (to: string) => { nav(to); onClose(); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    else if (e.key === 'ArrowDown') { e.preventDefault(); setAt((i) => Math.min(i + 1, hits.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAt((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && hits[at]) go(hits[at].to);
  };
  return (
    <div className="fixed inset-0 z-[60] backdrop grid place-items-start justify-center pt-[15vh] p-4" onClick={onClose}>
      <div className="card w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()} onKeyDown={onKey}>
        <div className="flex items-center gap-2 px-4 border-b border-slate-200">
          <Search size={16} className="text-slate-400" />
          <input ref={ref} value={q} onChange={(e) => setQ(e.target.value)} placeholder="برو به صفحه…" autoComplete="off" className="flex-1 py-3 bg-transparent outline-none" />
          <kbd className="text-[10px] text-slate-400 border rounded px-1">Esc</kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto p-2">
          {hits.map((m, i) => (
            <li key={m.to}>
              <button onClick={() => go(m.to)} onMouseEnter={() => setAt(i)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-start ${i === at ? 'bg-blue-50 text-blue-700' : ''}`}>
                <m.icon size={16} />{m.label}{m.hint && <span className="text-xs text-slate-400 ms-auto">{m.hint}</span>}
              </button>
            </li>
          ))}
          {hits.length === 0 && <li className="p-6 text-center text-sm text-slate-400">چیزی پیدا نشد.</li>}
        </ul>
      </div>
    </div>
  );
}
