import type { Meeting, OfficialHoliday } from '../../api/types';

const DAY_MS = 86_400_000;
const PERSIAN = new Intl.DateTimeFormat('en-u-ca-persian', { timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric' });
const WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
const COLORS = ['#5b4bff', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];

export const noon = (iso: string) => new Date(`${iso}T12:00:00Z`);
export const isoOf = (d: Date) => d.toISOString().slice(0, 10);
const jalali = (d: Date) => { const p = Object.fromEntries(PERSIAN.formatToParts(d).map((x) => [x.type, x.value])); return { y: +p.year, m: +p.month, d: +p.day }; };
const weekIndex = (d: Date) => (d.getUTCDay() + 1) % 7; // the week opens on Saturday

/** The days a month view (or the one week of it around `cursor`) shows, Saturday first, padded to whole weeks. */
export function calendarDays(cursor: Date, view: 'month' | 'week'): Date[] {
  if (view === 'week') {
    const start = new Date(cursor.getTime() - weekIndex(cursor) * DAY_MS);
    return Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * DAY_MS));
  }
  let first = cursor;
  while (jalali(first).d !== 1) first = new Date(first.getTime() - DAY_MS);
  let last = cursor;
  while (jalali(new Date(last.getTime() + DAY_MS)).d !== 1) last = new Date(last.getTime() + DAY_MS);
  const start = new Date(first.getTime() - weekIndex(first) * DAY_MS);
  const end = new Date(last.getTime() + (6 - weekIndex(last)) * DAY_MS);
  const out: Date[] = [];
  for (let t = start.getTime(); t <= end.getTime(); t += DAY_MS) out.push(new Date(t));
  return out;
}

/** Day 1 of the Persian month that holds `d`. */
export function firstOfMonth(d: Date): Date { let x = d; while (jalali(x).d !== 1) x = new Date(x.getTime() - DAY_MS); return x; }

export const monthTitle = (d: Date) => new Intl.DateTimeFormat('fa-IR', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(d);

export function MonthCalendar({ cursor, view, meetings, holidays, canCreate, onEvent, onDay }: {
  cursor: Date; view: 'month' | 'week'; meetings: Meeting[]; holidays: OfficialHoliday[]; canCreate: boolean;
  onEvent: (m: Meeting) => void; onDay: (iso: string) => void;
}) {
  const days = calendarDays(cursor, view);
  const today = isoOf(new Date());
  const month = jalali(cursor).m;
  return (
    <div className="card p-4">
      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((w) => <div key={w} className="text-center text-[11px] text-slate-400 py-1">{w}</div>)}
        {days.map((d) => {
          const iso = isoOf(d);
          const hol = holidays.filter((h) => h.date.slice(0, 10) === iso);
          const friday = d.getUTCDay() === 5;
          const off = hol.length > 0 || friday;
          const out = view === 'month' && jalali(d).m !== month;
          const list = meetings.filter((m) => m.details.date.slice(0, 10) === iso);
          return (
            <div key={iso} onClick={() => canCreate && !off && onDay(iso)} title={hol.map((h) => h.reason).join('، ') || undefined}
              className={`rounded-2xl bg-slate-50 p-1.5 text-[11px] flex flex-col gap-1 overflow-hidden ${view === 'week' ? 'min-h-48' : 'min-h-24'} ${out ? 'opacity-35' : ''} ${canCreate && !off ? 'cursor-pointer hover:bg-blue-50' : ''}`}
              style={iso === today ? { boxShadow: 'inset 0 0 0 2px var(--secondary)', background: 'var(--tint)' } : undefined}>
              <span className={`font-bold text-xs ${off ? 'text-red-500' : ''}`}>{jalali(d).d.toLocaleString('fa-IR')}</span>
              {hol[0] && <small className="text-red-500 truncate">{hol[0].reason}</small>}
              {list.map((m) => (
                <button key={m.id} onClick={(e) => { e.stopPropagation(); onEvent(m); }}
                  className="text-start rounded-lg px-1.5 py-0.5 text-white truncate hover:scale-[1.04]"
                  style={{ background: COLORS[(m.details.type.length + m.details.title.length) % COLORS.length] }} title={m.details.title}>
                  {m.details.startTime} {m.details.title}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
