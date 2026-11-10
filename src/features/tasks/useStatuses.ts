import { useEffect, useMemo, useState } from 'react';
import { statusesApi } from '../../api/tasks';
import { StatusLabel, type TaskStatusDef } from '../../api/types';

export interface StatusOption { key: string; label: string; color?: string | null; payload: { status: number } | { customStatusId: string } }

// Built-in statuses first, then the organization's active custom ones. `labelOf` shows a task's status:
// its custom label when it has one, otherwise the built-in name.
export function useStatuses() {
  const [defs, setDefs] = useState<TaskStatusDef[]>([]);
  useEffect(() => { statusesApi.list().then(setDefs).catch(() => setDefs([])); }, []);
  return useMemo(() => {
    const byId = new Map(defs.map((d) => [d.id, d]));
    const options: StatusOption[] = [
      ...Object.entries(StatusLabel).map(([v, l]) => ({ key: `b${v}`, label: l, payload: { status: Number(v) } })),
      ...defs.filter((d) => d.isActive).map((d) => ({ key: d.id, label: d.name, color: d.color, payload: { customStatusId: d.id } })),
    ];
    const labelOf = (status: number, customStatusId?: string | null) => (customStatusId && byId.get(customStatusId)?.name) || StatusLabel[status];
    const colorOf = (customStatusId?: string | null) => (customStatusId ? byId.get(customStatusId)?.color : undefined);
    const keyOf = (status: number, customStatusId?: string | null) => (customStatusId && byId.has(customStatusId) ? customStatusId : `b${status}`);
    return { defs, options, labelOf, colorOf, keyOf };
  }, [defs]);
}
