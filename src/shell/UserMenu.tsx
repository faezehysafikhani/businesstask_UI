import { useEffect, useRef, useState } from 'react';
import { Eye, LayoutPanelTop, LogOut, Moon, Rows3, Sun } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { usePrefs, type ColorTheme, type FontKey } from './prefs';

const COLORS: { id: ColorTheme; hex: string; label: string }[] = [
  { id: 'purple', hex: '#5b4bff', label: 'بنفش' }, { id: 'blue', hex: '#2563eb', label: 'آبی' },
  { id: 'green', hex: '#059669', label: 'سبز' }, { id: 'orange', hex: '#ea580c', label: 'نارنجی' },
];
const FONTS: { id: FontKey; label: string }[] = [{ id: 'vazir', label: 'وزیرمتن' }, { id: 'noto', label: 'Noto Sans Arabic' }, { id: 'plex', label: 'IBM Plex Sans Arabic' }];

export function UserMenu({ onPreviewLogin }: { onPreviewLogin: () => void }) {
  const { me, logout } = useAuth();
  const p = usePrefs();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const name = me?.user.displayName ?? '';
  return (
    <div className="relative" ref={box}>
      <button onClick={() => setOpen(!open)} className="size-9 rounded-full text-white font-bold text-sm" style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }} aria-label="منوی کاربر">
        {name.trim().charAt(0) || '؟'}
      </button>
      {open && (
        <div className="card absolute left-0 top-12 w-72 p-3 space-y-3 z-50 text-sm">
          <div className="font-medium truncate">{name}</div>
          <div>
            <div className="text-xs text-slate-500 mb-1">تم رنگی</div>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button key={c.id} onClick={() => p.set({ color: c.id })} title={c.label} aria-label={c.label}
                  className={`size-7 rounded-full ${p.color === c.id ? 'ring-2 ring-offset-2 ring-offset-white' : ''}`} style={{ background: c.hex, ['--tw-ring-color' as string]: c.hex }} />
              ))}
            </div>
          </div>
          <button onClick={() => p.set({ dark: !p.dark })} className="w-full flex items-center gap-2 hover:bg-slate-100 rounded-lg px-2 py-1.5">
            {p.dark ? <Sun size={15} /> : <Moon size={15} />}{p.dark ? 'حالت روشن' : 'حالت تاریک'}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-slate-500">فونت
              <select value={p.font} onChange={(e) => p.set({ font: e.target.value as FontKey })} className="mt-1 block w-full border border-slate-200 rounded-lg px-1 py-1 text-sm text-slate-800">
                {FONTS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </label>
            <label className="text-xs text-slate-500">اندازه متن
              <select value={p.size} onChange={(e) => p.set({ size: Number(e.target.value) as 14 | 16 | 18 })} className="mt-1 block w-full border border-slate-200 rounded-lg px-1 py-1 text-sm text-slate-800">
                <option value={14}>کوچک</option><option value={16}>متوسط</option><option value={18}>بزرگ</option>
              </select>
            </label>
          </div>
          <button onClick={() => p.set({ density: p.density === 'compact' ? 'comfortable' : 'compact' })} className="w-full flex items-center gap-2 hover:bg-slate-100 rounded-lg px-2 py-1.5">
            <Rows3 size={15} />{p.density === 'compact' ? 'چیدمان راحت' : 'چیدمان فشرده'}
          </button>
          <button onClick={() => { setOpen(false); p.set({ focus: true }); }} className="w-full flex items-center gap-2 hover:bg-slate-100 rounded-lg px-2 py-1.5"><LayoutPanelTop size={15} />حالت تمرکز</button>
          <button onClick={() => { setOpen(false); onPreviewLogin(); }} className="w-full flex items-center gap-2 hover:bg-slate-100 rounded-lg px-2 py-1.5"><Eye size={15} />پیش‌نمایش صفحه ورود</button>
          <button onClick={logout} className="w-full flex items-center gap-2 hover:bg-slate-100 rounded-lg px-2 py-1.5 text-red-600"><LogOut size={15} />خروج</button>
        </div>
      )}
    </div>
  );
}
