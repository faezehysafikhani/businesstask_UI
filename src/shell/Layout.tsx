import { NavLink, Outlet } from 'react-router-dom';
import { CheckSquare, ClipboardCheck, Copy, Inbox, ListChecks, LogOut, MessageSquarePlus, Route, Tags } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

// Each menu item shows only when the host grants its permission. New modules add a line here.
const MENU = [{ to: '/tasks', label: 'وظایف', icon: CheckSquare, permission: 'Tasks.View' },
  { to: '/templates', label: 'قالب‌ها', icon: Copy, permission: 'Tasks.View' },
  { to: '/requests', label: 'درخواست‌های من', icon: MessageSquarePlus, permission: 'Requests.Submit' },
  { to: '/requests/inbox', label: 'صندوق درخواست‌ها', icon: Inbox, permission: 'Requests.Handle' },
  { to: '/settings/request-categories', label: 'دسته‌های درخواست', icon: Tags, permission: 'Requests.Manage' },
  { to: '/reviews', label: 'بازبینی‌های من', icon: ClipboardCheck, permission: 'Workflow.View' },
  { to: '/settings/review-flow', label: 'مسیر بازبینی', icon: Route, permission: 'Workflow.Configure' },
  { to: '/settings/statuses', label: 'وضعیت‌ها', icon: ListChecks, permission: 'Tasks.ManageStatuses' },
];

export function Layout() {
  const { me, can, logout } = useAuth();
  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-white border-l p-3 flex flex-col gap-1">
        <div className="font-bold px-2 py-3">مدیریت وظایف</div>
        {MENU.filter((m) => can(m.permission)).map((m) => (
          <NavLink key={m.to} to={m.to} className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${isActive ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-100'}`}>
            <m.icon size={16} /> {m.label}
          </NavLink>
        ))}
        <div className="mt-auto text-xs text-slate-500 px-2">{me?.user.displayName}</div>
        <button onClick={logout} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-slate-100"><LogOut size={16} /> خروج</button>
      </aside>
      <main className="flex-1 p-6"><Outlet /></main>
    </div>
  );
}
