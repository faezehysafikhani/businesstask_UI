import { NavLink } from 'react-router-dom';
import { ChevronDown, LogOut, Star } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { GROUPS, MENU, itemAllowed, type MenuItem } from './menu';
import { usePrefs } from './prefs';

function Item({ m, compact, pinned, onNavigate }: { m: MenuItem; compact: boolean; pinned: boolean; onNavigate?: () => void }) {
  const { togglePin } = usePrefs();
  return (
    <div className="group/item relative">
      <NavLink to={m.to} end={m.to === '/organization'} onClick={onNavigate} title={compact ? m.label : undefined}
        className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition ${isActive ? 'nav-active' : 'hover:bg-slate-100'}`}>
        <m.icon size={17} className="shrink-0" />
        <span className={compact ? 'hidden group-hover/side:inline whitespace-nowrap' : 'truncate'}>{m.label}</span>
      </NavLink>
      <button onClick={() => togglePin(m.to)} aria-label={pinned ? 'برداشتن پین' : 'پین کردن'}
        className={`absolute top-1/2 -translate-y-1/2 left-2 ${compact ? 'hidden group-hover/side:block' : ''} ${pinned ? 'text-amber-400' : 'text-slate-400 opacity-0 group-hover/item:opacity-100'}`}>
        <Star size={13} fill={pinned ? 'currentColor' : 'none'} />
      </button>
    </div>
  );
}

export function SidebarBody({ compact, onNavigate }: { compact: boolean; onNavigate?: () => void }) {
  const { me, can, logout } = useAuth();
  const { pins, closedGroups, toggleGroup } = usePrefs();
  const allowed = MENU.filter((m) => itemAllowed(m, can));
  const pinned = allowed.filter((m) => pins.includes(m.to));
  return (
    <>
      <div className="flex items-center gap-3 px-3 py-4">
        <div className="size-9 rounded-xl grid place-items-center text-white font-bold shrink-0" style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}>B</div>
        <div className={`font-bold ${compact ? 'hidden group-hover/side:block whitespace-nowrap' : ''}`}>مدیریت وظایف</div>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 space-y-3 pb-3">
        {pinned.length > 0 && (
          <div className="space-y-1">
            <div className={`px-3 text-[11px] text-slate-500 ${compact ? 'hidden group-hover/side:block' : ''}`}>پین‌شده</div>
            {pinned.map((m) => <Item key={`p${m.to}`} m={m} compact={compact} pinned onNavigate={onNavigate} />)}
          </div>
        )}
        {GROUPS.map((g) => {
          const items = allowed.filter((m) => m.group === g.id);
          if (!items.length) return null;
          const closed = closedGroups.includes(g.id) && !compact;
          return (
            <div key={g.id} className="space-y-1">
              <button onClick={() => toggleGroup(g.id)} className={`w-full flex items-center justify-between px-3 text-[11px] text-slate-500 hover:text-slate-700 ${compact ? 'hidden group-hover/side:flex' : ''}`}>
                {g.label}<ChevronDown size={13} className={`transition ${closed ? '-rotate-90' : ''}`} />
              </button>
              {!closed && items.map((m) => <Item key={m.to} m={m} compact={compact} pinned={pins.includes(m.to)} onNavigate={onNavigate} />)}
            </div>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-2 space-y-1">
        <div className={`px-3 text-xs text-slate-500 truncate ${compact ? 'hidden group-hover/side:block' : ''}`}>{me?.user.displayName}</div>
        <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm hover:bg-slate-100">
          <LogOut size={17} className="shrink-0" /><span className={compact ? 'hidden group-hover/side:inline' : ''}>خروج</span>
        </button>
      </div>
    </>
  );
}
