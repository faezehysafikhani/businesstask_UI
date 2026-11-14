import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { meetingsApi } from '../../api/tasks';
import type { Meeting, MeetingPeople, OfficialHoliday } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { MeetingForm, emptyMeeting } from './MeetingForm';
import { MonthCalendar, calendarDays, firstOfMonth, isoOf, monthTitle, noon } from './MonthCalendar';

const iso = (d: Date) => d.toISOString().slice(0, 10);

// A month of meetings and the official holidays, by day. Fridays and holidays take no new meetings (the host refuses them).
export function MeetingsPage() {
  const { me, can } = useAuth();
  const [cursor, setCursor] = useState(() => noon(iso(new Date())));
  const [view, setView] = useState<'month' | 'week'>('month');
  const [list, setList] = useState<Meeting[]>([]);
  const [holidays, setHolidays] = useState<OfficialHoliday[]>([]);
  const [people, setPeople] = useState<MeetingPeople | null>(null);
  const [form, setForm] = useState<{ meeting?: Meeting; date?: string } | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    const range = calendarDays(cursor, view);
    const from = isoOf(range[0]), to = isoOf(new Date(range[range.length - 1].getTime() + 86_400_000));
    meetingsApi.list(from, to).then(setList).catch((e) => setError(e.message));
    meetingsApi.holidays(from, to).then(setHolidays).catch(() => setHolidays([]));
  }, [cursor, view]);
  useEffect(load, [load]);
  useEffect(() => { meetingsApi.people().then(setPeople).catch(() => {}); }, []);


  const step = (n: number) => setCursor((c) => {
    if (view === 'week') return new Date(c.getTime() + n * 7 * 86_400_000);
    const first = firstOfMonth(c).getTime();
    return new Date(n > 0 ? first + 35 * 86_400_000 : first - 86_400_000); // inside the next / previous Persian month
  });
  const newOn = (date: string) => setForm({ date });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">جلسات و تقویم</h1>
        <div className="flex items-center gap-1 rounded-2xl bg-white p-1 shadow-[var(--shadow)] text-sm">
          <button className="px-3 py-1.5 rounded-xl" onClick={() => step(-1)}>قبلی</button>
          <span className="px-2 font-medium">{monthTitle(cursor)}</span>
          <button className="px-3 py-1.5 rounded-xl" onClick={() => step(1)}>بعدی</button>
        </div>
        <button className="rounded-2xl bg-white px-4 py-2 text-sm shadow-[var(--shadow)]" onClick={() => setCursor(noon(iso(new Date())))}>امروز</button>
        <div className="flex rounded-2xl bg-white p-1 text-sm shadow-[var(--shadow)]">
          {(['month', 'week'] as const).map((v) => <button key={v} onClick={() => setView(v)} className={`px-4 py-1.5 rounded-xl ${view === v ? 'nav-active' : 'text-slate-600'}`}>{v === 'month' ? 'ماه' : 'هفته'}</button>)}
        </div>
        {can('Meetings.Create') && people?.canCreate && <button data-primary className="ms-auto flex items-center gap-1 rounded-2xl text-white px-5 py-2.5 text-sm font-semibold" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }} onClick={() => setForm({})}><Plus size={16} /> جلسه جدید</button>}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {people && !people.canCreate && people.message && <p className="text-sm text-amber-700">{people.message}</p>}
      <MonthCalendar cursor={cursor} view={view} meetings={list} holidays={holidays} canCreate={can('Meetings.Create') && !!people?.canCreate}
        onEvent={(m) => setForm({ meeting: m })} onDay={newOn} />
      {list.length === 0 && <p className="text-center text-sm text-slate-400">جلسه‌ای در این بازه نیست</p>}
      {form && people && me && (
        <MeetingForm meeting={form.meeting} people={people.people} initial={emptyMeeting(me.user.id, form.date ?? iso(new Date()))} onClose={() => setForm(null)} onSaved={() => { load(); if (!form.meeting) setForm(null); }} />
      )}
    </div>
  );
}
