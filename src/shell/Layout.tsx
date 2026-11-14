import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Bell, LayoutGrid, LayoutPanelTop, Menu, Search, Settings2, WifiOff, Wifi } from 'lucide-react';
import { TimerBar } from '../features/time/TimerBar';
import { MembershipBanner } from '../features/admin/MembershipBanner';
import { LoginPage } from '../auth/LoginPage';
import { SidebarBody } from './Sidebar';
import { Palette } from './Palette';
import { SettingsCenter } from './SettingsCenter';
import { UserMenu } from './UserMenu';
import { GROUPS, itemFor } from './menu';
import { usePrefs } from './prefs';

const todayFa = new Intl.DateTimeFormat('fa-IR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  const [back, setBack] = useState(false);
  useEffect(() => {
    let t: number | undefined;
    const off = () => { setOnline(false); setBack(false); };
    const on = () => { setOnline(true); setBack(true); t = window.setTimeout(() => setBack(false), 2500); };
    window.addEventListener('offline', off); window.addEventListener('online', on);
    return () => { window.removeEventListener('offline', off); window.removeEventListener('online', on); clearTimeout(t); };
  }, []);
  return { online, back };
}

function typing(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
}

function Breadcrumb() {
  const { pathname } = useLocation();
  const item = itemFor(pathname);
  if (!item) return null;
  const group = GROUPS.find((g) => g.id === item.group);
  const detail = pathname !== item.to;
  return (
    <nav className="flex items-center gap-2 px-8 pt-4 text-xs text-slate-400" aria-label="مسیر صفحه">
      <Link to="/tasks" className="hover:text-blue-600">خانه</Link><span>›</span>
      {group && <><span>{group.label}</span><span>›</span></>}
      {detail ? <><Link to={item.to} className="hover:text-blue-600">{item.label}</Link><span>›</span><b className="text-slate-800 font-semibold">جزئیات</b></> : <b className="text-slate-800 font-semibold">{item.label}</b>}
    </nav>
  );
}

export function Layout() {
  const p = usePrefs();
  const { pathname } = useLocation();
  const { online, back } = useOnline();
  const [palette, setPalette] = useState(false);
  const [hub, setHub] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [bell, setBell] = useState(false);
  const [loginPreview, setLoginPreview] = useState(false);
  useEffect(() => setMobileNav(false), [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(true); return; }
      if (e.key === 'Escape' && p.focus) p.set({ focus: false });
      if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === '/') { const s = document.querySelector<HTMLInputElement>('main input[data-search], main input[type=search]'); if (s) { e.preventDefault(); s.focus(); } }
      else if (e.key.toLowerCase() === 'n') document.querySelector<HTMLElement>('main [data-primary]')?.click();
      else if (e.key.toLowerCase() === 'f') p.set({ focus: !p.focus });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [p]);

  const btn = 'tip size-9 rounded-xl bg-white grid place-items-center shadow-[var(--shadow)]';
  return (
    <div className="min-h-screen flex">
      {(!online || back) && (
        <div role="status" className={`fixed top-0 inset-x-0 z-[70] py-2 text-center text-sm font-semibold text-white flex items-center justify-center gap-2 ${online ? 'bg-gradient-to-l from-emerald-500 to-emerald-400' : 'bg-gradient-to-l from-red-500 to-orange-500'}`}>
          {online ? <><Wifi size={15} />اتصال برقرار شد</> : <><WifiOff size={15} />اتصال اینترنت قطع است؛ تغییرات ذخیره نمی‌شوند</>}
        </div>
      )}
      {!p.focus && (
        <>
          <div className={`shrink-0 max-[899px]:hidden ${p.collapsed ? 'w-[4.75rem]' : 'w-60'}`}>
            <aside className={`group/side glass fixed top-0 bottom-0 z-40 flex flex-col shadow-[-8px_0_30px_rgba(80,70,200,.08)] transition-[width] duration-200 ${p.collapsed ? 'w-[4.75rem] hover:w-60 hover:shadow-[var(--shadow-lg)]' : 'w-60'}`}>
              <SidebarBody compact={p.collapsed} />
            </aside>
          </div>
          {mobileNav && (
            <div className="min-[900px]:hidden fixed inset-0 z-[80] backdrop" onClick={() => setMobileNav(false)}>
              <aside className="absolute right-0 top-0 bottom-0 w-64 flex flex-col bg-white" onClick={(e) => e.stopPropagation()}>
                <SidebarBody compact={false} onNavigate={() => setMobileNav(false)} />
              </aside>
            </div>
          )}
        </>
      )}
      <div className="flex-1 min-w-0 flex flex-col">
        {!p.focus && (
          <header className="glass sticky top-0 z-30 h-14 flex items-center gap-3 px-4 min-[900px]:px-8 border-b border-slate-200">
            <button onClick={() => setMobileNav(true)} className={`${btn} min-[900px]:hidden`} data-tip="منو" aria-label="منو"><Menu size={17} /></button>
            <button onClick={() => p.set({ collapsed: !p.collapsed })} className={`${btn} max-[899px]:hidden`} data-tip="جمع‌کردن منو" aria-label="جمع‌کردن منو"><LayoutPanelTop size={17} className="-rotate-90" /></button>
            <button onClick={() => setPalette(true)} className="flex-1 max-w-md flex items-center gap-2 bg-white rounded-2xl px-4 py-2 text-sm text-slate-400 shadow-[var(--shadow)]">
              <Search size={15} />جستجو و رفتن به صفحه…<kbd className="ms-auto max-[899px]:hidden text-[11px] bg-blue-50 text-blue-600 rounded-md px-2">Ctrl K</kbd>
            </button>
            <span className="ms-auto text-xs text-slate-500 max-[899px]:hidden">{todayFa}</span>
            <button onClick={() => p.set({ focus: true })} className={btn} data-tip="حالت تمرکز (F)" aria-label="حالت تمرکز"><LayoutGrid size={17} /></button>
            <button onClick={() => setHub(true)} className={btn} data-tip="مرکز تنظیمات" aria-label="مرکز تنظیمات"><Settings2 size={17} /></button>
            <div className="relative">
              <button onClick={() => setBell(!bell)} className={btn} data-tip="اعلان‌ها" aria-label="اعلان‌ها"><Bell size={17} /></button>
              {bell && <div className="card absolute left-0 top-12 w-64 p-6 text-center text-sm text-slate-500 z-50">اعلان تازه‌ای نیست.</div>}
            </div>
            <UserMenu onPreviewLogin={() => setLoginPreview(true)} />
          </header>
        )}
        {!p.focus && <Breadcrumb />}
        <MembershipBanner /><TimerBar />
        <main key={pathname} className="page-enter p-4 min-[900px]:px-8 min-[900px]:py-7"><Outlet /></main>
      </div>
      {p.focus && <button onClick={() => p.set({ focus: false })} className="fixed top-3.5 left-3.5 z-[60] rounded-full bg-slate-800 text-white text-xs font-semibold px-4 py-2 shadow-[var(--shadow-lg)]">خروج از حالت تمرکز</button>}
      {palette && <Palette onClose={() => setPalette(false)} />}
      {hub && <SettingsCenter onClose={() => setHub(false)} />}
      {loginPreview && (
        <div className="fixed inset-0 z-[90] overflow-auto bg-slate-50">
          <button onClick={() => setLoginPreview(false)} className="fixed top-3 left-3 z-[91] rounded-full bg-slate-800 text-white text-xs px-4 py-2">بستن پیش‌نمایش</button>
          <LoginPage />
        </div>
      )}
    </div>
  );
}
