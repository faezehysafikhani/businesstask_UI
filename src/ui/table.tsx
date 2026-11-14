import { useMemo, useState, type ReactNode } from 'react';

export type SortDir = 'asc' | 'desc';
/** Sort rows by a column on the data itself (numbers, dates and Persian text). Click again to reverse. */
export function useSort<T>(rows: T[] | undefined, getters: Record<string, (r: T) => string | number | null | undefined>) {
  const [sort, setSort] = useState<{ key: string; dir: SortDir } | null>(null);
  const sorted = useMemo(() => {
    if (!rows || !sort || !getters[sort.key]) return rows ?? [];
    const g = getters[sort.key];
    const m = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = g(a) ?? '', y = g(b) ?? '';
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'fa', { numeric: true })) * m;
    });
    // getters are rebuilt each render by the caller; the sort state and rows are what matter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort]);
  const toggle = (key: string) => setSort((s) => (s?.key === key ? (s.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' }));
  return { sorted, sort, toggle };
}

export function SortTh({ k, sort, onSort, children }: { k: string; sort: { key: string; dir: SortDir } | null; onSort: (k: string) => void; children: ReactNode }) {
  return <th data-sort={sort?.key === k ? sort.dir : undefined} onClick={() => onSort(k)} className="text-start px-3 py-2 font-medium">{children}</th>;
}

const AVATAR_COLORS = ['#5b4bff', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
export function Avatar({ name }: { name: string }) {
  let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return <span className="avatar" style={{ background: AVATAR_COLORS[h % AVATAR_COLORS.length] }}>{name.trim().charAt(0)}</span>;
}

/** Priority colours: the host has three levels (low, medium, high). */
export const PRIORITY_COLOR: Record<number, string> = { 0: '#10b981', 1: '#eab308', 2: '#f97316' };
