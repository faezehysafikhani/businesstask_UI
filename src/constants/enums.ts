// Single source of truth for fixed values: forms and column filters both read from here.
import { ApprovalLabel, PriorityLabel, RequestStatusLabel, ReviewLabel } from '../api/types';
import { PROJECT_STATUS_LABEL, PROJECT_TYPE_LABEL } from '../api/projects';

export interface Opt { value: string; label: string }
const fromRecord = (r: Record<string | number, string>, skipEmpty = true): Opt[] =>
  Object.entries(r).filter(([, l]) => !skipEmpty || l).map(([value, label]) => ({ value, label }));

export const PRIORITY_OPTS = fromRecord(PriorityLabel);
export const PROJECT_TYPE_OPTS = fromRecord(PROJECT_TYPE_LABEL);
export const PROJECT_STATUS_OPTS = fromRecord(PROJECT_STATUS_LABEL);
export const APPROVAL_OPTS = fromRecord(ApprovalLabel);
export const REQUEST_STATUS_OPTS = fromRecord(RequestStatusLabel);
export const REVIEW_OPTS = fromRecord(ReviewLabel);
export const ACTIVE_OPTS: Opt[] = [{ value: 'true', label: 'فعال' }, { value: 'false', label: 'غیرفعال' }];
