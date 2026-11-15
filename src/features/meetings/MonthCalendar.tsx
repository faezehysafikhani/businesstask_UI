import type { Meeting, OfficialHoliday } from '../../api/types';

const DAY_MS = 86_400_000;
const PERSIAN = new Intl.DateTimeFormat('en-u-ca-persian', { timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric' });
const WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

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

export function MonthCalendar({ cursor, view, meetings, holidays, selected, onSelect }: {
  cursor: Date; view: 'month' | 'week'; meetings: Meeting[]; holidays: OfficialHoliday[]; selected: string; onSelect: (iso: string) => void;
}) {
  const days = calendarDays(cursor, view);
  const today = isoOf(new Date());
  const month = jalali(cursor).m;
  return (
    <div className="card p-3">
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => <div key={w} className="text-center text-[11px] text-slate-400 py-1">{w}</div>)}
        {days.map((d) => {
          const iso = isoOf(d);
          const off = d.getUTCDay() === 5 || holidays.some((h) => h.date.slice(0, 10) === iso);
          const out = view === 'month' && jalali(d).m !== month;
          const count = meetings.filter((m) => m.details.date.slice(0, 10) === iso).length;
          const sel = iso === selected;
          return (
            <button type="button" key={iso} onClick={() => onSelect(iso)} aria-pressed={sel}
              className={`h-16 rounded-xl text-base flex flex-col items-center justify-center gap-0.5 ${out ? 'opacity-35' : ''} ${sel ? 'nav-active' : 'bg-slate-50 hover:bg-blue-50'} ${!sel && iso === today ? 'ring-2 ring-blue-500' : ''}`}>
              <span className={`font-semibold ${off && !sel ? 'text-red-500' : ''}`}>{jalali(d).d.toLocaleString('fa-IR')}</span>
              {count > 0 ? <span className={`text-[10px] leading-none rounded-full px-1.5 py-0.5 ${sel ? 'bg-white/25' : 'bg-blue-50 text-blue-700'}`}>{count.toLocaleString('fa-IR')}</span> : <span className="h-3" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
