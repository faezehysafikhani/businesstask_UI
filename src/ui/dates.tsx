import { useEffect, useRef, useState } from 'react';

// Persian (Jalali) dates for inputs. Values stay ISO ("2026-11-15") for the host; people see and type 1405/08/24.
const DAY = 86_400_000;
const PERSIAN = new Intl.DateTimeFormat('en-u-ca-persian', { timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric' });
const FA_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const FA_WEEK = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

interface J { y: number; m: number; d: number }
const noon = (iso: string) => new Date(`${iso}T12:00:00Z`);
const isoOf = (d: Date) => d.toISOString().slice(0, 10);
const toJalali = (d: Date): J => { const p = Object.fromEntries(PERSIAN.formatToParts(d).map((x) => [x.type, x.value])); return { y: +p.year, m: +p.month, d: +p.day }; };
const same = (a: J, b: J) => a.y === b.y && a.m === b.m && a.d === b.d;

/** The Gregorian day of a Jalali date, or null when there is no such day (found by scanning, so leap years are right). */
export function fromJalali(j: J): string | null {
  let t = Date.UTC(j.y + 621, 2, 1, 12);
  for (let i = 0; i < 400; i++, t += DAY) {
    const x = toJalali(new Date(t));
    if (x.y === j.y && x.m === j.m) { if (x.d === j.d) return isoOf(new Date(t)); if (x.d > j.d) return null; }
  }
  return null;
}

const fa = (n: number, pad = 0) => n.toLocaleString('fa-IR', { useGrouping: false, minimumIntegerDigits: pad || 1 });
export function showJalali(iso: string): string { if (!iso) return ''; const j = toJalali(noon(iso.slice(0, 10))); return `${fa(j.y)}/${fa(j.m, 2)}/${fa(j.d, 2)}`; }
const latin = (s: string) => s.replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0)).replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660));
function parse(text: string): string | null {
  const m = latin(text).trim().match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (!m) return null;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  if (y < 1700) return fromJalali({ y, m: mo, d });
  const iso = `${m[1]}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

type Ev = { target: { value: string } };
interface DateProps { value: string; onChange: (e: Ev) => void; className?: string; disabled?: boolean; required?: boolean; dir?: string; min?: string; max?: string }

/** A date field in the Persian calendar: type 1405/08/24 or pick from the calendar. */
export function DateInput({ value, onChange, className, disabled, dir: _dir }: DateProps) {
  const [text, setText] = useState(showJalali(value));
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => setText(showJalali(value)), [value]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const commit = (t: string) => { const iso = t.trim() ? parse(t) : ''; if (iso === null) setText(showJalali(value)); else if (iso !== value.slice(0, 10)) onChange({ target: { value: iso } }); };
  return (
    <div className={`relative ${className?.match(/\b(flex-1|w-full|w-\d+)\b/)?.[0] ?? ''}`} ref={box}>
      <input disabled={disabled} className={`${className ?? ''} w-full`} dir="ltr" inputMode="numeric" autoComplete="off" placeholder="۱۴۰۵/۰۱/۰۱" value={text}
        onChange={(e) => setText(e.target.value)} onBlur={(e) => commit(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && commit(text)} onFocus={() => setOpen(true)} />
      {open && !disabled && <Calendar value={value} onPick={(iso) => { onChange({ target: { value: iso } }); setOpen(false); }} />}
    </div>
  );
}

function Calendar({ value, onPick }: { value: string; onPick: (iso: string) => void }) {
  const today = isoOf(new Date());
  const [cursor, setCursor] = useState(() => noon((value || today).slice(0, 10)));
  const c = toJalali(cursor);
  let first = cursor; while (toJalali(first).d !== 1) first = new Date(first.getTime() - DAY);
  const lead = (first.getUTCDay() + 1) % 7; // Saturday first
  const cells: (Date | null)[] = Array(lead).fill(null);
  for (let d = first; toJalali(d).m === c.m; d = new Date(d.getTime() + DAY)) cells.push(d);
  const step = (n: number) => setCursor(n > 0 ? new Date(first.getTime() + 35 * DAY) : new Date(first.getTime() - DAY));
  return (
    <div className="card absolute z-[90] top-full mt-1 start-0 w-64 p-2 text-sm" dir="rtl">
      <div className="flex items-center justify-between pb-1">
        <button type="button" onClick={() => step(-1)} className="px-2">‹</button>
        <b>{FA_MONTHS[c.m - 1]} {fa(c.y)}</b>
        <button type="button" onClick={() => step(1)} className="px-2">›</button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
        {FA_WEEK.map((w) => <span key={w} className="text-slate-400 py-1">{w}</span>)}
        {cells.map((d, i) => d ? (
          <button type="button" key={i} onClick={() => onPick(isoOf(d))}
            className={`rounded-lg py-1 hover:bg-blue-50 ${isoOf(d) === value.slice(0, 10) ? 'nav-active' : ''} ${isoOf(d) === today && isoOf(d) !== value.slice(0, 10) ? 'ring-1 ring-blue-500' : ''} ${d.getUTCDay() === 5 ? 'text-red-500' : ''}`}>{fa(toJalali(d).d)}</button>
        ) : <span key={i} />)}
      </div>
      <button type="button" onClick={() => onPick(today)} className="mt-1 w-full text-xs text-blue-600 py-1">امروز</button>
    </div>
  );
}

interface TimeProps { value: string; onChange: (e: Ev) => void; className?: string; disabled?: boolean }
/** A 24-hour time field (hour and minute lists). */
export function TimeInput({ value, onChange, className, disabled }: TimeProps) {
  const [h, m] = (value || '09:00').split(':');
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
  if (!minutes.includes(m)) minutes.push(m);
  minutes.sort();
  const set = (hh: string, mm: string) => onChange({ target: { value: `${hh}:${mm}` } });
  return (
    <span className="inline-flex items-center gap-1" dir="ltr">
      <select disabled={disabled} className={className} value={h} onChange={(e) => set(e.target.value, m)}>{hours.map((x) => <option key={x}>{x}</option>)}</select>:
      <select disabled={disabled} className={className} value={m} onChange={(e) => set(h, e.target.value)}>{minutes.map((x) => <option key={x}>{x}</option>)}</select>
    </span>
  );
}
