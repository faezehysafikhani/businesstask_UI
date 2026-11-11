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
