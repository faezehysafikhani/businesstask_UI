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
