import { CheckSquare, BarChart3, CalendarDays, FileUp, MessageSquare, Network, Send, Gauge, ShieldCheck, Users, Webhook, Clock, Zap, ClipboardCheck, Copy, Inbox, ListChecks, MessageSquarePlus, Route, Tags, Building2, UsersRound, FolderKanban, type LucideIcon } from 'lucide-react';
import { ORG_PERMISSIONS } from '../api/org';
import { PROJECT_PERMISSIONS } from '../api/projects';

export type GroupId = 'daily' | 'requests' | 'org' | 'settings';
export const GROUPS: { id: GroupId; label: string }[] = [
  { id: 'daily', label: 'کار روزانه' }, { id: 'requests', label: 'درخواست‌ها و بازبینی' },
  { id: 'org', label: 'سازمان' }, { id: 'settings', label: 'تنظیمات' },
];

// Each item shows only when the host grants its permission (a list: any one of them). New modules add a line here.
export interface MenuItem { to: string; label: string; icon: LucideIcon; permission: string | string[]; group: GroupId; hint?: string }
export const MENU: MenuItem[] = [
  { to: '/tasks', label: 'وظایف', icon: CheckSquare, permission: 'Tasks.View', group: 'daily' },
  { to: '/meetings', label: 'جلسات و تقویم', icon: CalendarDays, permission: 'Meetings.View', group: 'daily' },
  { to: '/projects', label: 'پروژه‌ها', icon: FolderKanban, permission: PROJECT_PERMISSIONS, group: 'daily' },
  { to: '/timesheet', label: 'ساعت کاری', icon: Clock, permission: 'Timesheets.Log', group: 'daily' },
  { to: '/workload', label: 'بار کاری', icon: BarChart3, permission: 'Timesheets.ViewAll', group: 'daily' },
  { to: '/templates', label: 'قالب‌ها', icon: Copy, permission: 'Tasks.View', group: 'daily' },
  { to: '/requests', label: 'درخواست‌های من', icon: MessageSquarePlus, permission: 'Requests.Submit', group: 'requests' },
  { to: '/requests/inbox', label: 'صندوق درخواست‌ها', icon: Inbox, permission: 'Requests.Handle', group: 'requests' },
  { to: '/reviews', label: 'بازبینی‌های من', icon: ClipboardCheck, permission: 'Workflow.View', group: 'requests' },
  { to: '/my-reports', label: 'گزارش زمان‌بندی‌شده', icon: Send, permission: 'Tasks.View', group: 'requests' },
  { to: '/organization', label: 'ساختار سازمانی', icon: Building2, permission: ORG_PERMISSIONS, group: 'org' },
  { to: '/organization/people', label: 'جایگاه افراد', icon: UsersRound, permission: ORG_PERMISSIONS, group: 'org' },
  { to: '/settings/users', label: 'کاربران و حساب سرویس', icon: Users, permission: 'users.view', group: 'org' },
  { to: '/settings/request-categories', label: 'دسته‌های درخواست', icon: Tags, permission: 'Requests.Manage', group: 'settings', hint: 'دسته‌بندی و مسیر درخواست‌ها' },
  { to: '/settings/review-flow', label: 'مسیر بازبینی', icon: Route, permission: 'Workflow.Configure', group: 'settings', hint: 'چه کسی وظایف را تأیید می‌کند' },
  { to: '/settings/timesheet-flow', label: 'مسیر تأیید ساعت', icon: Route, permission: 'Workflow.Configure', group: 'settings', hint: 'تأیید هفتگی ساعت کاری' },
  { to: '/settings/automation', label: 'قاعده‌های خودکار', icon: Zap, permission: 'Automation.Manage', group: 'settings', hint: 'اتوماسیون و SLA' },
  { to: '/settings/statuses', label: 'وضعیت‌ها', icon: ListChecks, permission: 'Tasks.ManageStatuses', group: 'settings', hint: 'وضعیت‌های سفارشی و سقف WIP' },
  { to: '/settings/membership', label: 'پلن و مصرف', icon: Gauge, permission: 'Membership.View', group: 'settings', hint: 'سقف کاربر و فضا' },
  { to: '/settings/webhooks', label: 'وب‌هوک‌ها', icon: Webhook, permission: 'Webhooks.Manage', group: 'settings', hint: 'اطلاع‌رسانی به سامانه‌های دیگر' },
  { to: '/import', label: 'ورود از CSV', icon: FileUp, permission: 'Tasks.Create', group: 'settings', hint: 'ورود دسته‌ای وظایف' },
  { to: '/settings/sms', label: 'پنل پیامک', icon: MessageSquare, permission: 'sms_settings.view', group: 'settings', hint: 'سرویس‌دهنده‌ی پیامک' },
  { to: '/settings/ldap', label: 'Active Directory', icon: Network, permission: 'ldap_settings.view', group: 'settings', hint: 'اتصال و همگام‌سازی کاربران' },
  { to: '/security', label: 'امنیت حساب', icon: ShieldCheck, permission: [], group: 'settings', hint: 'رمز، MFA و نشست‌ها' },
];

export const itemAllowed = (m: MenuItem, can: (p: string) => boolean) =>
  m.permission === '' || (Array.isArray(m.permission) ? m.permission.length === 0 || m.permission.some(can) : can(m.permission));

/** The menu entry that owns a path (the longest matching prefix). */
export function itemFor(pathname: string): MenuItem | undefined {
  return [...MENU].sort((a, b) => b.to.length - a.to.length).find((m) => pathname === m.to || pathname.startsWith(m.to + '/'));
}
