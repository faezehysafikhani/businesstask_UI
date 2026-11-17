import { useMemo, useState } from 'react';
import { DateRangeInput, type DateRange } from './dates';
import { norm } from './format';
import type { Opt } from '../constants/enums';

/** One filterable column. `get` returns the comparable value: text, the enum value (select) or an ISO date (date). */
export type Col<T> =
  | { key: string; kind: 'text'; get: (r: T) => string }
  | { key: string; kind: 'select'; get: (r: T) => string; options: Opt[] }
  | { key: string; kind: 'date'; get: (r: T) => string | null | undefined; end?: (r: T) => string | null | undefined };

type Val = string | DateRange;
const KEY = 'tf:';
const load = (id: string): Record<string, Val> => { try { return JSON.parse(sessionStorage.getItem(KEY + id) || '{}'); } catch { return {}; } };

/**
 * Column filters applied to the WHOLE array (filter, then sort, then paginate).
 * Values persist per page in sessionStorage.
 */
export function useColumnFilters<T>(id: string, rows: T[], cols: Col<T>[]) {
  const [vals, setVals] = useState<Record<string, Val>>(() => load(id));
  const set = (k: string, v: Val) => setVals((p) => { const n = { ...p, [k]: v }; try { sessionStorage.setItem(KEY + id, JSON.stringify(n)); } catch { /* ignore */ } return n; });
  const clear = () => { setVals({}); try { sessionStorage.removeItem(KEY + id); } catch { /* ignore */ } };
  const active = cols.filter((c) => { const v = vals[c.key]; return Array.isArray(v) || (typeof v === 'string' && v !== ''); }).length;
  const filtered = useMemo(() => rows.filter((r) => cols.every((c) => {
    const v = vals[c.key];
    if (!v) return true;
    if (c.kind === 'text') return norm(c.get(r)).includes(norm(v as string));
    if (c.kind === 'select') return c.get(r) === v;
    const [a, b] = v as [string, string]; const s = c.get(r)?.slice(0, 10); const e = (c.end?.(r) ?? c.get(r))?.slice(0, 10);
    return !!s && !!e && e >= a && s <= b;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  })), [rows, vals]);
  return { filtered, vals, set, clear, active, cols };
}
export type ColumnFilters<T> = ReturnType<typeof useColumnFilters<T>>;

const IN = 'tf-in w-full min-w-[70px] rounded-lg border px-2 py-1 text-xs bg-white';

/** The filter row under the table header. `layout` lists the column key per <th> (null = no filter). */
export function FilterRow<T>({ f, layout }: { f: ColumnFilters<T>; layout: (string | null)[] }) {
  return (
    <tr className="tf-row">
      {layout.map((k, i) => {
        const c = k ? f.cols.find((x) => x.key === k) : null;
        if (!c) return <th key={i} />;
        const v = f.vals[c.key];
        return (
          <th key={i} className="px-2 py-1 font-normal">
            {c.kind === 'text' && <input type="search" aria-label={`فیلتر ${c.key}`} className={IN} placeholder="جستجو…" value={(v as string) ?? ''} onChange={(e) => f.set(c.key, e.target.value)} />}
            {c.kind === 'select' && (
              <select aria-label={`فیلتر ${c.key}`} className={IN} value={(v as string) ?? ''} onChange={(e) => f.set(c.key, e.target.value)}>
                <option value="">همه</option>{c.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            )}
            {c.kind === 'date' && <DateRangeInput className={IN} value={Array.isArray(v) ? (v as [string, string]) : null} onChange={(r) => f.set(c.key, r as Val)} />}
          </th>
        );
      })}
    </tr>
  );
}

/** Result counter and clear button above a table. */
export function FilterBar({ f, shown, total }: { f: { active: number; clear: () => void }; shown: number; total: number }) {
  if (!f.active) return null;
  return (
    <div className="flex items-center gap-3 text-xs text-slate-500">
      <span>{shown.toLocaleString('fa-IR')} نتیجه از {total.toLocaleString('fa-IR')}</span>
      <button type="button" className="text-blue-600" onClick={f.clear}>پاک کردن فیلترها</button>
    </div>
  );
}

/** Filter bar for card lists: a search box (the first text column), selects and a date range, with counter and clear. */
export function CardFilterBar<T>({ f, total, labels }: { f: ColumnFilters<T>; total: number; labels?: Record<string, string> }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {f.cols.map((c) => {
        const v = f.vals[c.key]; const lb = labels?.[c.key] ?? c.key;
        if (c.kind === 'text') return <input key={c.key} type="search" autoComplete="off" aria-label={lb} placeholder={lb === c.key ? 'جستجو…' : `جستجو: ${lb}`} className={`${IN} !h-9 flex-1 min-w-48 max-w-xs`} value={(v as string) ?? ''} onChange={(e) => f.set(c.key, e.target.value)} />;
        if (c.kind === 'select') return (
          <select key={c.key} aria-label={lb} className={`${IN} !h-9 !w-auto`} value={(v as string) ?? ''} onChange={(e) => f.set(c.key, e.target.value)}>
            <option value="">همه {lb}</option>{c.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        );
        return <div key={c.key} className="w-44"><DateRangeInput className={`${IN} !h-9`} value={Array.isArray(v) ? (v as [string, string]) : null} onChange={(r) => f.set(c.key, r as Val)} /></div>;
      })}
      <FilterBar f={f} shown={f.filtered.length} total={total} />
    </div>
  );
}
