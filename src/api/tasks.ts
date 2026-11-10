import { api } from './client';
import type { Paged, TaskDetail, TaskListItem } from './types';

const B = '/api/task-management/tasks';
export interface TaskQuery { pageNumber?: number; pageSize?: number; search?: string; archived?: boolean; isProject?: boolean }

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
  archive: (id: string) => api('POST', `${B}/${id}/archive`),
  restore: (id: string) => api('POST', `${B}/${id}/restore`),
};
