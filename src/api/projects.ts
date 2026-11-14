import { api } from './client';
import type { Paged, User } from './types';

// The project area: the charter (Project Management Core), the team of a project, its stakeholders
// with the power/interest matrix, and the portfolio (the projects the caller may see).
const P = '/api/project-management';

export const PROJECT_TYPE_LABEL: Record<string, string> = { Waterfall: 'آبشاری', Agile: 'چابک' };
export const PROJECT_STATUS_LABEL: Record<string, string> = { Draft: 'پیش‌نویس', Active: 'فعال', OnHold: 'متوقف', Completed: 'تمام‌شده', Archived: 'بایگانی' };
export const APPROVAL_STATUS_LABEL: Record<string, string> = { NotSubmitted: 'ارسال نشده', PendingApproval: 'در انتظار تأیید', Approved: 'تأییدشده', Rejected: 'ردشده' };
export const POWER_LABEL: Record<string, string> = { Low: 'کم', Medium: 'متوسط', High: 'زیاد' };
export const INTEREST_LABEL: Record<string, string> = { Low: 'کم', Medium: 'متوسط', High: 'زیاد' };
export const QUADRANT_LABEL: Record<string, string> = {
  ManageClosely: 'مدیریت نزدیک', KeepSatisfied: 'رضایت نگه‌داشتن', KeepInformed: 'مطلع نگه‌داشتن', Monitor: 'پایش',
};

export interface Project {
  id: string; tenantId: string; name: string; code: string; type: string; status: string; approvalStatus: string;
  ownerUserId?: string | null; managerUserId?: string | null; organizationUnitId?: string | null; workCalendarId?: string | null;
  startDate?: string | null; endDate?: string | null; cost?: number | null; goal?: string | null; requirements?: string | null;
  constraints?: string | null; assumptions?: string | null; description?: string | null; charter?: string | null; createdAtUtc: string;
}

export interface ProjectInput {
  name: string; code?: string | null; type: string; managerUserId?: string | null; ownerUserId?: string | null;
  organizationUnitId?: string | null; startDate?: string | null; endDate?: string | null; cost?: number | null;
  goal?: string | null; requirements?: string | null; constraints?: string | null; assumptions?: string | null;
  description?: string | null; charter?: string | null;
}

export interface ProjectMember { id: string; tenantId: string; projectId: string; userId: string; roleTitle?: string | null }
export interface Stakeholder {
  id: string; tenantId: string; projectId: string; name: string; isInternal: boolean; expectations?: string | null;
  notes?: string | null; power: string; interest: string; engagementStrategy?: string | null; requirements?: string | null;
  approvalStatus: string; createdByUserId?: string | null; quadrant: string; strategy?: string | null;
}
export interface StakeholderMatrixItem { id: string; name: string; isInternal: boolean }
export interface StakeholderMatrix {
  projectId: string; totalStakeholders: number;
  cells: { power: string; interest: string; quadrant: string; stakeholders: StakeholderMatrixItem[] }[];
}
export interface StakeholderSettings {
  projectId: string; manageClosely: string; keepSatisfied: string; keepInformed: string; monitor: string; isDefault: boolean;
}

export const projectsApi = {
  /** The projects the caller may see (the portfolio): what they own, manage, or are visible to. */
  portfolio: (q: { search?: string; status?: string; type?: string }) => {
    const p = new URLSearchParams();
    if (q.search) p.set('search', q.search);
    if (q.status) p.set('status', q.status);
    if (q.type) p.set('type', q.type);
    return api<Project[]>('GET', `/api/portfolio/projects?${p}`);
  },
  /** Every project of the tenant, with paging (for those who may see all). */
  list: (q: { pageNumber?: number; pageSize?: number; search?: string; status?: string; type?: string }) => {
    const p = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => { if (v !== undefined && v !== '') p.set(k, String(v)); });
    return api<Paged<Project>>('GET', `${P}/projects/?${p}`);
  },
  get: (id: string) => api<Project>('GET', `${P}/projects/${id}`),
  create: (tenantId: string, b: ProjectInput) => api<Project>('POST', `${P}/projects/`, { ...b, tenantId }),
  update: (id: string, b: ProjectInput) => api<Project>('PUT', `${P}/projects/${id}`, b),
  remove: (id: string) => api('DELETE', `${P}/projects/${id}`),
  archive: (id: string) => api<void>('POST', `${P}/projects/${id}/archive`),
  setStatus: (id: string, status: string) => api<Project>('PUT', `${P}/projects/${id}/status`, { status }),

  members: (projectId: string) => api<ProjectMember[]>('GET', `${P}/team/members/?projectId=${projectId}`),
  availableUsers: (projectId: string) => api<User[]>('GET', `${P}/team/members/available-users?projectId=${projectId}`),
  addMember: (tenantId: string, projectId: string, userId: string, roleTitle?: string | null) =>
    api<ProjectMember>('POST', `${P}/team/members/`, { tenantId, projectId, userId, roleTitle }),
  updateMember: (memberId: string, roleTitle?: string | null) => api<ProjectMember>('PUT', `${P}/team/members/${memberId}`, { roleTitle }),
  removeMember: (memberId: string) => api('DELETE', `${P}/team/members/${memberId}`),

  stakeholders: (projectId: string) => api<Stakeholder[]>('GET', `${P}/stakeholders/?projectId=${projectId}`),
  matrix: (projectId: string) => api<StakeholderMatrix>('GET', `${P}/stakeholders/matrix?projectId=${projectId}`),
  addStakeholder: (tenantId: string, projectId: string, b: { name: string; isInternal: boolean; power: string; interest: string; expectations?: string | null; notes?: string | null; engagementStrategy?: string | null; requirements?: string | null }) =>
    api<Stakeholder>('POST', `${P}/stakeholders/`, { ...b, tenantId, projectId }),
  updateStakeholder: (id: string, b: { name: string; isInternal: boolean; power: string; interest: string; expectations?: string | null; notes?: string | null; engagementStrategy?: string | null; requirements?: string | null }) =>
    api<Stakeholder>('PUT', `${P}/stakeholders/${id}`, b),
  removeStakeholder: (id: string) => api('DELETE', `${P}/stakeholders/${id}`),
  stakeholderSettings: (projectId: string) => api<StakeholderSettings>('GET', `${P}/stakeholders/settings?projectId=${projectId}`),
  saveStakeholderSettings: (tenantId: string, projectId: string, b: { manageClosely?: string | null; keepSatisfied?: string | null; keepInformed?: string | null; monitor?: string | null }) =>
    api<StakeholderSettings>('PUT', `${P}/stakeholders/settings`, { ...b, tenantId, projectId }),
};

/** The permissions of the project area; any one of them lets the area be seen. */
export const PROJECT_PERMISSIONS = [
  'Projects.View', 'Portfolio.View', 'Portfolio.ViewAll',
  'ProjectTeam.View', 'Stakeholders.View',
];
