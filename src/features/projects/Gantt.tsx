import type { Project } from '../../api/projects';

const STATUS_COLOR: Record<string, string> = { Active: '#10b981', Draft: '#8a5cff', OnHold: '#f59e0b', Completed: '#2563eb', Archived: '#94a3b8' };
const DAY = 86_400_000;

/** The projects on a time line: a coloured bar per project (by status), a red line for today. */
export function Gantt({ rows }: { rows: Project[] }) {
  const dated = rows.filter((r) => r.startDate && r.endDate).map((r) => ({ r, s: new Date(r.startDate!).getTime(), e: new Date(r.endDate!).getTime() })).filter((x) => x.e >= x.s);
  if (dated.length === 0) return null;
  const now = Date.now();
  const min = Math.min(...dated.map((x) => x.s), now), max = Math.max(...dated.map((x) => x.e), now);
  const span = Math.max(DAY, max - min);
  const pos = (t: number) => ((t - min) / span) * 100;
  const fa = (t: number) => new Intl.DateTimeFormat('fa-IR', { month: 'short', year: 'numeric' }).format(t);
  return (
    <div className="card p-4 space-y-2">
      <h4 className="font-bold text-sm">نمای زمانی پروژه‌ها</h4>
      <div className="relative">
        {dated.map(({ r, s, e }) => (
          <div key={r.id} className="relative h-9 border-t border-dashed border-slate-200">
            <div className="absolute top-1 h-7 rounded-full px-3 flex items-center text-xs font-semibold text-white whitespace-nowrap overflow-hidden shadow-[0_6px_14px_rgba(0,0,0,.15)] min-w-16"
              style={{ right: `${pos(s)}%`, width: `${Math.max(2, pos(e) - pos(s))}%`, background: STATUS_COLOR[r.status] ?? '#8a5cff' }} title={`${new Date(s).toLocaleDateString('fa-IR')} تا ${new Date(e).toLocaleDateString('fa-IR')}`}>{r.name}</div>
          </div>
        ))}
        <div className="absolute top-0 bottom-0 w-0.5 bg-rose-500" style={{ right: `${pos(now)}%` }}><span className="absolute -top-4 right-[-16px] text-[11px] font-bold text-rose-500">امروز</span></div>
      </div>
      <div className="flex justify-between text-[11px] text-slate-400"><span>{fa(min)}</span><span>{fa(max)}</span></div>
    </div>
  );
}
