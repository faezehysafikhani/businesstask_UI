import { api } from './client';

// The organization structure's own API (/api/org-structure): companies, the chart, nodes, posts
// (unit positions), appointments, the people's places, leaving and role transfer.
const O = '/api/org-structure';

export interface PersonRef { userId: string; displayName: string; isActive: boolean; avatarUrl?: string | null }
export interface ManagerRef extends PersonRef { source: string }

export interface OrgCompany {
  id: string; tenantId: string; name: string; code: string; description?: string | null; manager?: PersonRef | null;
  isActive: boolean; linkedUnitIds: string[]; parentCompanyId?: string | null; phone?: string | null; email?: string | null;
  website?: string | null; nationalId?: string | null; economicCode?: string | null; address?: string | null;
  headTitle?: string | null; logoUrl?: string | null; uiLevel?: string | null;
}

export interface OrgNode {
  id: string; name: string; parentNodeId?: string | null; nodeTypeId?: string | null; nodeTypeName?: string | null;
  companyId?: string | null; managerUserId?: string | null; isActive: boolean; sortOrder: number; childCount: number;
  rowVersion: string; code?: string | null; latinName?: string | null; correspondenceTitle?: string | null;
  phone?: string | null; address?: string | null; validFrom?: string | null; validTo?: string | null;
}

export interface OrgNodeType {
  id: string; code: string; name: string; color: string; icon: string; isDomainBoundary: boolean;
  sortOrder: number; isActive: boolean; nodeCount: number;
}

export interface NodePathItem { id: string; name: string }

export interface OrgLink { linkId: string; targetNodeId: string; linkTypeId: string; name: string; lineStyle: string; countsAsManager: boolean }

export interface OrgChartMember {
  userId: string; displayName: string; isActive: boolean; positionTitle?: string | null; managerUserId?: string | null;
  avatarUrl?: string | null; positionId?: string | null;
}

export interface OrgChartPosition {
  unitPositionId: string; positionId: string; title: string; sortOrder: number; isActive: boolean;
  holders: OrgChartMember[]; code: string; isHead: boolean; parentPostId?: string | null;
}

export interface OrgChartUnit {
  unitId: string; name: string; manager?: PersonRef | null; members: OrgChartMember[]; children: OrgChartUnit[];
  teams: { teamId: string; name: string; description?: string | null; owner: PersonRef; members: OrgChartMember[] }[];
  isActive: boolean; peopleCount: number; positions?: OrgChartPosition[] | null; parentNodeId?: string | null;
  nodeType?: { nodeTypeId: string; name: string; color: string; icon: string; isDomainBoundary: boolean } | null;
  links?: OrgLink[] | null;
}

export interface OrgChartCompany {
  companyId: string; name: string; code: string; isActive: boolean; manager?: PersonRef | null;
  members: OrgChartMember[]; units: OrgChartUnit[]; peopleCount: number; positions?: OrgChartPosition[] | null;
  uiLevel?: string | null; headTitle?: string | null; logoUrl?: string | null;
}

export interface HeldPosition {
  unitPositionId: string; unitId?: string | null; unitName: string; positionId: string; title: string; code?: string | null;
}

export interface UserAssignment {
  userId: string; displayName: string; isUserActive: boolean; companyId: string; companyName: string;
  unitId?: string | null; unitName?: string | null; positionId?: string | null; positionTitle?: string | null;
  explicitManagerUserId?: string | null; manager?: ManagerRef | null; positions?: HeldPosition[] | null;
}

export interface UnitPosition {
  id: string; unitId?: string | null; unitName?: string | null; positionId: string; title: string; sortOrder: number;
  isPositionActive: boolean; holders: PersonRef[]; code: string; companyId: string; companyName?: string | null;
  parentPostId?: string | null; isManagerPost: boolean;
}

export interface OrgPosition {
  id: string; title: string; parentPositionId?: string | null; isActive: boolean; companyIds?: string[] | null;
}

export interface Appointment {
  id: string; unitPositionId: string; postTitle?: string | null; postCode?: string | null; place?: string | null;
  person: PersonRef; startDate?: string | null; endDate?: string | null; isActive: boolean;
}

export interface NodeChange {
  id: string; action: string; userId?: string | null; atUtc: string; details?: string | null; canUndo: boolean;
}

export interface OffboardResult {
  userId: string; ended: Appointment[]; transferred: Appointment[]; cancelled: Appointment[]; headlessCompanyIds: string[];
}

export interface TransferResult { fromUserId: string; toUserId: string; effectiveDate: string; transferred: Appointment[] }

export interface CompanyGroup { id: string; name: string; code: string; isActive: boolean; children: CompanyGroup[] }

export const orgApi = {
  companies: () => api<OrgCompany[]>('GET', `${O}/companies`),
  companyGroups: () => api<CompanyGroup[]>('GET', `${O}/company-groups`),
  chart: (companyId?: string | null, asOf?: string | null) => {
    const q = new URLSearchParams();
    if (companyId) q.set('companyId', companyId);
    if (asOf) q.set('asOf', asOf);
    return api<OrgChartCompany[]>('GET', `${O}/chart?${q}`);
  },

  node: (id: string) => api<OrgNode>('GET', `${O}/nodes/${id}`),
  nodes: (companyId?: string | null) => api<OrgNode[]>('GET', `${O}/nodes?${companyId ? `companyId=${companyId}` : ''}`),
  ancestors: (id: string) => api<NodePathItem[]>('GET', `${O}/nodes/${id}/ancestors`),
  changes: (id: string, take = 30) => api<NodeChange[]>('GET', `${O}/nodes/${id}/changes?take=${take}`),
  update: (id: string, b: { name: string; nodeTypeId?: string | null; rowVersion?: string | null }) => api<OrgNode>('PUT', `${O}/nodes/${id}`, b),
  setValidity: (id: string, b: { validFrom?: string | null; validTo?: string | null; rowVersion?: string | null }) => api<OrgNode>('PUT', `${O}/nodes/${id}/validity`, b),
  setManager: (id: string, b: { managerUserId: string | null; rowVersion?: string | null }) => api<OrgNode>('PUT', `${O}/nodes/${id}/manager`, b),
  move: (id: string, b: { parentNodeId: string | null; companyId?: string | null; rowVersion?: string | null }) => api<OrgNode>('POST', `${O}/nodes/${id}/move`, b),
  setActive: (id: string, active: boolean, rowVersion?: string | null) => api<OrgNode>('POST', `${O}/nodes/${id}/${active ? 'activate' : 'deactivate'}`, { rowVersion }),
  nodeTypes: () => api<OrgNodeType[]>('GET', `${O}/node-types`),

  posts: (unitId: string) => api<UnitPosition[]>('GET', `${O}/unit-positions?unitId=${unitId}`),
  positions: () => api<OrgPosition[]>('GET', `${O}/positions`),
  addPost: (unitId: string, b: { positionId: string; code?: string | null; parentPostId?: string | null }) => api<UnitPosition>('POST', `${O}/units/${unitId}/positions`, b),
  removePost: (postId: string) => api('DELETE', `${O}/unit-positions/${postId}`),

  appoint: (postId: string, b: { userId: string; startDate?: string | null }) => api<Appointment>('POST', `${O}/unit-positions/${postId}/appointment`, b),
  endAppointment: (postId: string, endDate?: string | null) => api<Appointment>('POST', `${O}/unit-positions/${postId}/appointment/end`, { endDate }),
  cancelUpcoming: (postId: string) => api<Appointment>('POST', `${O}/unit-positions/${postId}/appointment/cancel`),
  postHistory: (postId: string) => api<Appointment[]>('GET', `${O}/unit-positions/${postId}/history`),

  assignments: (companyId?: string | null, unitId?: string | null) => {
    const q = new URLSearchParams();
    if (companyId) q.set('companyId', companyId);
    if (unitId) q.set('unitId', unitId);
    return api<UserAssignment[]>('GET', `${O}/assignments?${q}`);
  },
  userHistory: (userId: string) => api<Appointment[]>('GET', `${O}/users/${userId}/positions/history`),

  offboard: (userId: string, b: { successorUserId?: string | null; postIds?: string[] | null }) => api<OffboardResult>('POST', `${O}/users/${userId}/offboard`, b),
  transfer: (userId: string, b: { toUserId: string; effectiveDate?: string | null; postIds?: string[] | null }) => api<TransferResult>('POST', `${O}/users/${userId}/transfer`, b),
};

/** The module's permissions: any one of them lets the structure be read. */
export const ORG_PERMISSIONS = [
  'org_structure.view', 'org_structure.manage_companies', 'org_structure.manage_positions', 'org_structure.manage_assignments',
  'org_structure.manage_position_permissions', 'org_structure.node.view', 'org_structure.node.create', 'org_structure.node.update',
  'org_structure.node.move', 'org_structure.node.deactivate', 'org_structure.node.assign', 'org_structure.manage_rules',
  'org_structure.manage_templates',
];

export const faDate = (iso?: string | null) => iso ? new Date(iso).toLocaleDateString('fa-IR') : '—';

/** A date input's value (yyyy-mm-dd) from an ISO date; empty when there is none. */
export const dayOf = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** A date input's day as the API's DateTimeOffset (local midnight); empty means no limit. */
export const isoDay = (day: string) => day ? new Date(`${day}T00:00:00`).toISOString() : null;

/**
 * The start/effective day of an appointment: today (or a past day) is «now», a later day is that
 * day's midnight. The API refuses a start before now, so «today» must not be sent as its midnight.
 */
export const isoStart = (day: string) => {
  if (!day) return null;
  const start = new Date(`${day}T00:00:00`);
  return start.getTime() <= Date.now() ? null : start.toISOString();
};
