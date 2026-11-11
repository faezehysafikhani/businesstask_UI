import { api } from './client';
import type { Paged, ReviewItem, TaskDetail, TaskListItem, TaskStatusDef, WorkflowDefinition, WorkflowInstance } from './types';

const B = '/api/task-management/tasks';
export interface TaskQuery { pageNumber?: number; pageSize?: number; search?: string; archived?: boolean; isProject?: boolean; customStatusId?: string }

export const tasksApi = {
  list(q: TaskQuery) {
    const p = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => { if (v !== undefined && v !== '') p.set(k, String(v)); });
    return api<Paged<TaskListItem>>('GET', `${B}/?${p}`);
  },
  get: (id: string) => api<TaskDetail>('GET', `${B}/${id}`),
  create: (b: { title: string; dueDate: string; priority: number; description?: string; isProject?: boolean }) => api<TaskDetail>('POST', `${B}/`, b),
  // rowVersion from the last read: the host answers 409 if someone else changed the task meanwhile.
  update: (id: string, b: { title: string; dueDate: string; priority: number; description?: string | null; rowVersion?: string | null }) =>
    api<TaskDetail>('PUT', `${B}/${id}`, b),
  // Exactly one: a built-in status (0..3) or a custom status id.
  setStatus: (id: string, b: { status: number } | { customStatusId: string }) => api<TaskDetail>('PATCH', `${B}/${id}/status`, b),
  quick: (title: string) => api<TaskDetail>('POST', `${B}/quick`, { title }),
  bulk: (b: { ids: string[]; action: 'Status' | 'CustomStatus' | 'Priority' | 'Archive' | 'Restore'; status?: number; customStatusId?: string; priority?: number }) =>
    api<{ succeeded: string[]; failed: { id: string; code: string; message: string }[] }>('POST', `${B}/bulk`, b),
  submitReview: (id: string, comment?: string) => api<TaskDetail>('POST', `${B}/${id}/submit-review`, { comment }),
  inReview: (ids: string[]) => api<ReviewItem[]>('POST', `${B}/in-review`, { ids }),
  archive: (id: string) => api('POST', `${B}/${id}/archive`),
  restore: (id: string) => api('POST', `${B}/${id}/restore`),
};

export const statusesApi = {
  list: () => api<TaskStatusDef[]>('GET', '/api/task-management/statuses'),
  create: (b: { name: string; category: number; color?: string; sortOrder?: number }) => api<TaskStatusDef>('POST', '/api/task-management/statuses', b),
  update: (id: string, b: { name: string; category: number; color?: string | null; sortOrder: number; isActive: boolean }) =>
    api<TaskStatusDef>('PUT', `/api/task-management/statuses/${id}`, b),
  remove: (id: string) => api('DELETE', `/api/task-management/statuses/${id}`),
};

// The approval backend (Workflow module of the host): task reviews are one subject type of it.
export const TASK_REVIEW = 'TaskReview';
export const workflowApi = {
  pending: () => api<WorkflowInstance[]>('GET', '/api/workflow/approval-center/'),
  approve: (id: string, comment?: string) => api('POST', `/api/workflow/approval-center/${id}/approve`, { comment }),
  reject: (id: string, comment?: string) => api('POST', `/api/workflow/approval-center/${id}/reject`, { comment }),
  definitions: (subjectType: string) => api<WorkflowDefinition[]>('GET', `/api/workflow/definitions/?subjectType=${subjectType}`),
  setSteps: (subjectType: string, steps: { name: string; approverUserId?: string | null; approverRoleId?: string | null; approverKey?: string | null; isOptional?: boolean }[]) =>
    api<WorkflowDefinition>('PUT', '/api/workflow/definitions/by-scope', { subjectType, name: 'بازبینی وظیفه', steps }),
};

export const requestsApi = {
  categories: () => api<import('./types').RequestCategory[]>('GET', '/api/task-management/requests/categories'),
  saveCategory: (id: string | null, b: { name: string; routeToUserId?: string | null; urgentRouteToUserId?: string | null; defaultPriority: number; isActive: boolean }) =>
    id ? api<import('./types').RequestCategory>('PUT', `/api/task-management/requests/categories/${id}`, b) : api<import('./types').RequestCategory>('POST', '/api/task-management/requests/categories', b),
  list: (mine: boolean) => api<import('./types').TaskRequest[]>('GET', `/api/task-management/requests/?mine=${mine}`),
  submit: (b: { title: string; description?: string; categoryId?: string; priority?: number; neededBy?: string }) => api<import('./types').TaskRequest>('POST', '/api/task-management/requests/', b),
  convert: (id: string, b: { dueDate?: string }) => api<TaskDetail>('POST', `/api/task-management/requests/${id}/convert`, b),
  reject: (id: string, note?: string) => api<import('./types').TaskRequest>('POST', `/api/task-management/requests/${id}/reject`, { note }),
};

// Users for pickers (the host's user list; the caller needs permission to list users).
export async function listUsers(): Promise<{ id: string; displayName: string }[]> {
  const r = await api<{ id: string; displayName: string }[] | { items: { id: string; displayName: string }[] }>('GET', '/api/identity/users/?pageSize=200');
  return Array.isArray(r) ? r : r.items;
}

export const planningApi = {
  get: (id: string) => api<import('./types').TaskPlanning>('GET', `${B}/${id}/planning`),
  addDependency: (id: string, blockedByTaskId: string) => api<import('./types').TaskPlanning>('POST', `${B}/${id}/dependencies`, { blockedByTaskId }),
  removeDependency: (id: string, blockedByTaskId: string) => api<import('./types').TaskPlanning>('DELETE', `${B}/${id}/dependencies/${blockedByTaskId}`),
  setBlocker: (id: string, reason: string | null) => api<import('./types').TaskPlanning>('PUT', `${B}/${id}/blocker`, { reason }),
  addCriterion: (id: string, text: string) => api<import('./types').TaskPlanning>('POST', `${B}/${id}/criteria`, { text }),
  setMet: (id: string, criterionId: string, met: boolean) => api<import('./types').TaskPlanning>('PUT', `${B}/${id}/criteria/${criterionId}/met`, { met }),
  deleteCriterion: (id: string, criterionId: string) => api<import('./types').TaskPlanning>('DELETE', `${B}/${id}/criteria/${criterionId}`),
  addSubTasks: (id: string, titles: string[]) => api('POST', `${B}/${id}/subtasks/bulk`, { titles }),
  saveAsTemplate: (id: string, name: string) => api<import('./types').TaskTemplate>('POST', `${B}/${id}/save-as-template`, { name }),
  wip: () => api<{ limitPerUser: number | null }>('GET', '/api/task-management/wip/'),
  setWip: (limitPerUser: number | null) => api<{ limitPerUser: number | null }>('PUT', '/api/task-management/wip/', { limitPerUser }),
};

export const templatesApi = {
  list: () => api<import('./types').TaskTemplate[]>('GET', '/api/task-management/templates/'),
  create: (name: string, body: import('./types').TemplateBody) => api<import('./types').TaskTemplate>('POST', '/api/task-management/templates/', { name, body }),
  remove: (id: string) => api('DELETE', `/api/task-management/templates/${id}`),
  instantiate: (id: string, b: { title?: string }) => api<TaskDetail>('POST', `/api/task-management/templates/${id}/instantiate`, b),
};

const S = '/api/task-management/timesheets';
export const timeApi = {
  week: (day: string, userId?: string) => api<import('./types').TimesheetWeek>('GET', `${S}/week?day=${day}${userId ? `&userId=${userId}` : ''}`),
  log: (b: { taskId: string; date: string; minutes: number; note?: string }) => api<import('./types').TimeEntry>('POST', `${S}/entries`, b),
  update: (id: string, b: { date: string; minutes: number; note?: string }) => api<import('./types').TimeEntry>('PUT', `${S}/entries/${id}`, b),
  remove: (id: string) => api('DELETE', `${S}/entries/${id}`),
  timer: () => api<import('./types').RunningTimer | null>('GET', `${S}/timer`),
  start: (taskId: string) => api<import('./types').RunningTimer>('POST', `${S}/timer/start`, { taskId }),
  stop: () => api<import('./types').TimeEntry>('POST', `${S}/timer/stop`),
  submit: (weekStart: string) => api<import('./types').TimesheetWeek>('POST', `${S}/submit`, { weekStart }),
  inReview: (ids: string[]) => api<import('./types').TimesheetReviewItem[]>('POST', `${S}/in-review`, { ids }),
  workload: (from?: string, to?: string, capacityMinutes?: number) => api<import('./types').Workload>('GET', `${S}/workload?${new URLSearchParams(Object.entries({ from, to, capacityMinutes }).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))}`),
  taskTime: (id: string) => api<import('./types').TaskTime>('GET', `${B}/${id}/time`),
  setEstimate: (id: string, minutes: number | null) => api<import('./types').TaskTime>('PUT', `${B}/${id}/estimate`, { minutes }),
};
export const TIMESHEET = 'Timesheet';

const A = '/api/task-management/automation';
export const automationApi = {
  rules: () => api<import('./types').AutomationRule[]>('GET', `${A}/rules`),
  save: (id: string | null, b: { name: string; trigger: string; conditions: import('./types').AutomationConditions; actions: import('./types').AutomationAction[]; sortOrder?: number; isActive: boolean }) =>
    id ? api<import('./types').AutomationRule>('PUT', `${A}/rules/${id}`, b) : api<import('./types').AutomationRule>('POST', `${A}/rules`, b),
  remove: (id: string) => api('DELETE', `${A}/rules/${id}`),
  log: () => api<import('./types').AutomationLog[]>('GET', `${A}/log`),
};

const M = '/api/calendar/meetings';
export const meetingsApi = {
  list: (from: string, to: string) => api<import('./types').Meeting[]>('GET', `${M}/?from=${from}&to=${to}`),
  people: () => api<import('./types').MeetingPeople>('GET', `${M}/people-options`),
  save: (id: string | null, b: import('./types').MeetingInput) => id ? api<import('./types').Meeting>('PUT', `${M}/${id}`, b) : api<import('./types').Meeting>('POST', `${M}/`, b),
  remove: (id: string, version: number) => api('DELETE', `${M}/${id}?version=${version}`),
  convert: (id: string, index: number) => api<{ meeting: import('./types').Meeting; converted: { index: number; taskId: string; title: string }[]; skipped: string[] }>('POST', `${M}/${id}/actions/${index}/convert-to-task`),
  convertAll: (id: string) => api<{ meeting: import('./types').Meeting; converted: { index: number; taskId: string; title: string }[]; skipped: string[] }>('POST', `${M}/${id}/actions/convert-all`),
  holidays: (from: string, to: string) => api<import('./types').OfficialHoliday[]>('GET', `/api/calendar/work-calendars/official-holidays?from=${from}&to=${to}`),
};

const W = '/api/task-management/webhooks';
export const webhooksApi = {
  events: () => api<string[]>('GET', `${W}/events`),
  list: () => api<import('./types').Webhook[]>('GET', `${W}/`),
  create: (b: { name: string; url: string; events: string[] }) => api<{ webhook: import('./types').Webhook; secret: string }>('POST', `${W}/`, b),
  update: (id: string, b: { name: string; url: string; events: string[]; isActive: boolean }) => api<import('./types').Webhook>('PUT', `${W}/${id}`, b),
  rotate: (id: string) => api<{ webhook: import('./types').Webhook; secret: string }>('POST', `${W}/${id}/rotate-secret`),
  ping: (id: string) => api('POST', `${W}/${id}/ping`),
  deliveries: (id: string) => api<import('./types').WebhookDelivery[]>('GET', `${W}/${id}/deliveries`),
  remove: (id: string) => api('DELETE', `${W}/${id}`),
};

const MB = '/api/task-management/membership';
export const membershipApi = {
  get: () => api<import('./types').Membership>('GET', `${MB}/`),
  set: (b: { planName: string; maxUsers?: number | null; maxStorageMb?: number | null; validFrom?: string | null; validUntil?: string | null; notes?: string | null }) => api<import('./types').Membership>('PUT', `${MB}/`, b),
  clear: () => api('DELETE', `${MB}/`),
  retention: () => api<{ automationLogDays: number | null; webhookDeliveryDays: number | null }>('GET', `${MB}/retention`),
  setRetention: (b: { automationLogDays: number | null; webhookDeliveryDays: number | null }) => api('PUT', `${MB}/retention`, b),
};

export interface ReportSubscription { id: string; frequency: string; dayOfWeek?: string | null; dayOfMonth?: number | null; hour: number; bySms: boolean; byEmail: boolean; isActive: boolean; nextRunAtUtc: string; lastSentAtUtc?: string | null }
export const reportsApi = {
  list: () => api<ReportSubscription[]>('GET', '/api/task-management/report-subscriptions/'),
  save: (id: string | null, b: { frequency: string; dayOfWeek?: string | null; dayOfMonth?: number | null; hour: number; bySms: boolean; byEmail: boolean; isActive: boolean }) =>
    id ? api<ReportSubscription>('PUT', `/api/task-management/report-subscriptions/${id}`, b) : api<ReportSubscription>('POST', '/api/task-management/report-subscriptions/', b),
  remove: (id: string) => api('DELETE', `/api/task-management/report-subscriptions/${id}`),
};

export interface ImportRow { line: number; title?: string | null; dueDate?: string | null; priority?: string | null; assignee?: string | null; valid: boolean; errors: string[] }
export const importApi = {
  preview: (csv: string) => api<{ total: number; valid: number; invalid: number; rows: ImportRow[] }>('POST', '/api/task-management/tasks/import/preview', { csv }),
  run: (csv: string, skipInvalid: boolean) => api<{ created: number; skipped: number; taskIds: string[]; failed: ImportRow[] }>('POST', '/api/task-management/tasks/import', { csv, skipInvalid }),
};

export interface SmsChannel { enabled: boolean; provider: string; apiUrl?: string | null; lineNumber?: string | null; apiKeyConfigured?: boolean; usernameConfigured?: boolean; passwordConfigured?: boolean }
export const smsApi = {
  get: () => api<{ sms: SmsChannel }>('GET', '/api/platform/notification-channels/'),
  providers: () => api<{ key: string; displayName: string; defaultBaseUrl: string }[]>('GET', '/api/platform/notification-channels/providers'),
  save: (sms: { enabled: boolean; provider: string; apiUrl?: string | null; apiKey?: string | null; lineNumber?: string | null; username?: string | null; password?: string | null }) =>
    api('PUT', '/api/platform/notification-channels/', { sms }),
  test: (phoneNumber: string) => api<{ success: boolean; message: string }>('POST', '/api/platform/notification-channels/test-sms', { phoneNumber }),
};

export interface LdapSettings { enabled: boolean; host?: string | null; port: number; useSsl: boolean; useStartTls: boolean; domain?: string | null; baseDn?: string | null; bindUsername?: string | null; bindPassword?: string | null; userSearchBase?: string | null; userFilter?: string | null; connectionTimeoutSeconds: number; trustServerCertificate?: boolean; bindPasswordConfigured?: boolean }
export interface LdapSyncRow { username?: string | null; displayName?: string | null; action: string; reason?: string | null }
export interface LdapSyncReport { applied: boolean; created: number; updated: number; deactivated: number; reactivated: number; unchanged: number; skipped: number; rows: LdapSyncRow[] }
export const ldapApi = {
  get: () => api<LdapSettings>('GET', '/api/platform/ldap/'),
  save: (s: LdapSettings) => api<LdapSettings>('PUT', '/api/platform/ldap/', s),
  test: (s: LdapSettings | null) => api<{ success: boolean; message: string; entriesFound?: number | null }>('POST', '/api/platform/ldap/test', s),
  preview: (attributes?: Record<string, string>) => api<LdapSyncReport>('POST', '/api/platform/ldap/sync/preview', { attributes: attributes ?? null, deactivateMissing: true }),
  sync: (attributes?: Record<string, string>) => api<LdapSyncReport>('POST', '/api/platform/ldap/sync', { attributes: attributes ?? null, deactivateMissing: true }),
};
