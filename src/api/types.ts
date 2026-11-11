export interface User { id: string; tenantId: string; displayName: string; email?: string | null }
export interface AuthResponse { accessToken: string; refreshToken: string; user: User }
export interface Me { user: User; permissions: string[] }
export interface Paged<T> { items: T[]; pageNumber: number; pageSize: number; totalCount: number; totalPages: number }

export const Status = { Todo: 0, InProgress: 1, Paused: 2, Completed: 3 } as const;
export const StatusLabel: Record<number, string> = { 0: 'انجام نشده', 1: 'در حال انجام', 2: 'متوقف', 3: 'انجام شده' };
export const PriorityLabel: Record<number, string> = { 0: 'کم', 1: 'متوسط', 2: 'زیاد' };

export interface TaskStatusDef { id: string; name: string; category: number; color?: string | null; sortOrder: number; isActive: boolean }

export const ReviewLabel: Record<number, string> = { 0: '', 1: 'در انتظار بازبینی', 2: 'تأیید شده', 3: 'بازگشت برای بازکاری' };
export interface ReviewItem { id: string; title: string; dueDate: string; submittedBy?: UserSummary | null; submittedAtUtc?: string | null; comment?: string | null }
export interface WorkflowInstance { id: string; subjectType: string; subjectId: string; totalSteps: number; currentStepOrder: number; status: number; currentApproverUserId?: string | null }
export interface WorkflowStep { id?: string; order: number; name: string; approverUserId?: string | null; approverKey?: string | null; isOptional?: boolean }
export interface WorkflowDefinition { id: string; name: string; subjectType: string; scopeType: string; isActive: boolean; steps: WorkflowStep[] }

export const RequestStatusLabel: Record<number, string> = { 0: 'در انتظار بررسی', 1: 'تبدیل به وظیفه شد', 2: 'رد شد' };
export interface RequestCategory { id: string; name: string; routeToUserId?: string | null; urgentRouteToUserId?: string | null; defaultPriority: number; isActive: boolean }
export interface TaskRequest {
  id: string; categoryId?: string | null; categoryName?: string | null; title: string; description?: string | null; priority: number; neededBy?: string | null;
  requester?: UserSummary | null; routedTo?: UserSummary | null; status: number; decisionNote?: string | null; convertedTaskId?: string | null; createdAtUtc: string;
}

export interface TaskBrief { id: string; title: string; status: number; isDone: boolean }
export interface Criterion { id: string; text: string; isMet: boolean; sortOrder: number }
export interface TaskPlanning { blockedReason?: string | null; blockedBy: TaskBrief[]; blocking: TaskBrief[]; criteria: Criterion[]; canComplete: boolean }
export interface TemplateBody { title: string; description?: string | null; priority: number; isProject: boolean; dueInDays: number; subTasks: string[]; criteria: string[]; tags: string[] }
export interface TaskTemplate { id: string; name: string; isProject: boolean; body: TemplateBody }

export interface UserSummary { id: string; displayName: string }
export interface TaskListItem {
  id: string; title: string; isProject: boolean; status: number; priority: number; dueDate: string;
  assignedUser?: UserSummary | null; subTaskCount: number; completedSubTaskCount: number; archivedAtUtc?: string | null; customStatusId?: string | null; reviewStatus?: number;
}
export interface TaskDetail {
  id: string; title: string; description?: string | null; isProject: boolean; status: number; priority: number;
  dueDate: string; assignedUser?: UserSummary | null; rowVersion?: string | null; archivedAtUtc?: string | null; customStatusId?: string | null;
}
