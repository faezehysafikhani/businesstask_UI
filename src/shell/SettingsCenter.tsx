import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { MENU, itemAllowed } from './menu';

/** All settings pages as big cards, with a search box. */
export function SettingsCenter({ onClose }: { onClose: () => void }) {
  const { can } = useAuth();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const items = useMemo(() => MENU.filter((m) => m.group === 'settings' && itemAllowed(m, can) && `${m.label} ${m.hint ?? ''}`.includes(q.trim())), [q, can]);
  return (
    <div className="fixed inset-0 z-50 backdrop grid place-items-center p-4" onClick={onClose}>
      <div className="card w-full max-w-3xl max-h-[85vh] overflow-y-auto p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <h2 className="font-bold text-lg">مرکز تنظیمات</h2>
          <div className="flex-1 flex items-center gap-2 border border-slate-200 rounded-xl px-3">
            <Search size={15} className="text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} autoFocus autoComplete="off" placeholder="جستجو در تنظیمات" className="flex-1 py-2 bg-transparent outline-none text-sm" />
          </div>
          <button onClick={onClose} aria-label="بستن" className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((m) => (
            <button key={m.to} onClick={() => { nav(m.to); onClose(); }} className="card p-4 text-start space-y-2 hover:shadow-[var(--shadow-lg)]">
              <span className="size-10 rounded-xl grid place-items-center bg-blue-50 text-blue-600"><m.icon size={20} /></span>
              <div className="font-medium text-sm">{m.label}</div>
              {m.hint && <div className="text-xs text-slate-500">{m.hint}</div>}
            </button>
          ))}
          {items.length === 0 && <p className="col-span-full text-center text-sm text-slate-400 p-6">تنظیمی پیدا نشد.</p>}
        </div>
      </div>
    </div>
  );
}
