import { NavLink, Outlet } from 'react-router-dom';
import { CheckSquare, BarChart3, CalendarDays, FileUp, MessageSquare, Network, Send, Gauge, ShieldCheck, Users, Webhook, Clock, Zap, ClipboardCheck, Copy, Inbox, ListChecks, LogOut, MessageSquarePlus, Route, Tags, Building2, UsersRound, FolderKanban, type LucideIcon } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { TimerBar } from '../features/time/TimerBar';
import { MembershipBanner } from '../features/admin/MembershipBanner';
import { ORG_PERMISSIONS } from '../api/org';
import { PROJECT_PERMISSIONS } from '../api/projects';

// Each menu item shows only when the host grants its permission (a list: any one of them). New modules add a line here.
interface MenuItem { to: string; label: string; icon: LucideIcon; permission: string | string[] }
const MENU: MenuItem[] = [{ to: '/tasks', label: 'وظایف', icon: CheckSquare, permission: 'Tasks.View' },
  { to: '/meetings', label: 'جلسات و تقویم', icon: CalendarDays, permission: 'Meetings.View' },
  { to: '/organization', label: 'ساختار سازمانی', icon: Building2, permission: ORG_PERMISSIONS },
  { to: '/organization/people', label: 'جایگاه افراد', icon: UsersRound, permission: ORG_PERMISSIONS },
  { to: '/projects', label: 'پروژه‌ها', icon: FolderKanban, permission: PROJECT_PERMISSIONS },
  { to: '/timesheet', label: 'ساعت کاری', icon: Clock, permission: 'Timesheets.Log' },
  { to: '/workload', label: 'بار کاری', icon: BarChart3, permission: 'Timesheets.ViewAll' },
  { to: '/templates', label: 'قالب‌ها', icon: Copy, permission: 'Tasks.View' },
  { to: '/requests', label: 'درخواست‌های من', icon: MessageSquarePlus, permission: 'Requests.Submit' },
  { to: '/requests/inbox', label: 'صندوق درخواست‌ها', icon: Inbox, permission: 'Requests.Handle' },
  { to: '/settings/request-categories', label: 'دسته‌های درخواست', icon: Tags, permission: 'Requests.Manage' },
  { to: '/reviews', label: 'بازبینی‌های من', icon: ClipboardCheck, permission: 'Workflow.View' },
  { to: '/settings/review-flow', label: 'مسیر بازبینی', icon: Route, permission: 'Workflow.Configure' },
  { to: '/settings/timesheet-flow', label: 'مسیر تأیید ساعت', icon: Route, permission: 'Workflow.Configure' },
  { to: '/settings/automation', label: 'قاعده‌های خودکار', icon: Zap, permission: 'Automation.Manage' },
  { to: '/settings/membership', label: 'پلن و مصرف', icon: Gauge, permission: 'Membership.View' },
  { to: '/settings/webhooks', label: 'وب‌هوک‌ها', icon: Webhook, permission: 'Webhooks.Manage' },
  { to: '/settings/users', label: 'کاربران و حساب سرویس', icon: Users, permission: 'users.view' },
  { to: '/my-reports', label: 'گزارش زمان‌بندی‌شده', icon: Send, permission: 'Tasks.View' },
  { to: '/import', label: 'ورود از CSV', icon: FileUp, permission: 'Tasks.Create' },
  { to: '/settings/sms', label: 'پنل پیامک', icon: MessageSquare, permission: 'sms_settings.view' },
  { to: '/settings/ldap', label: 'Active Directory', icon: Network, permission: 'ldap_settings.view' },
  { to: '/settings/statuses', label: 'وضعیت‌ها', icon: ListChecks, permission: 'Tasks.ManageStatuses' },
];

export function Layout() {
  const { me, can, logout } = useAuth();
  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-white border-l p-3 flex flex-col gap-1">
        <div className="font-bold px-2 py-3">مدیریت وظایف</div>
        {MENU.filter((m) => Array.isArray(m.permission) ? m.permission.some(can) : can(m.permission)).map((m) => (
          <NavLink key={m.to} to={m.to} className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${isActive ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-100'}`}>
            <m.icon size={16} /> {m.label}
          </NavLink>
        ))}
        <NavLink to="/security" className="mt-auto flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-slate-100"><ShieldCheck size={16} /> امنیت حساب</NavLink>
        <div className="text-xs text-slate-500 px-2">{me?.user.displayName}</div>
        <button onClick={logout} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-slate-100"><LogOut size={16} /> خروج</button>
      </aside>
      <div className="flex-1 min-w-0"><MembershipBanner /><TimerBar /><main className="p-6"><Outlet /></main></div>
    </div>
  );
}
