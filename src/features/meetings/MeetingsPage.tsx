import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { meetingsApi } from '../../api/tasks';
import type { Meeting, MeetingPeople, OfficialHoliday } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { MeetingForm, emptyMeeting } from './MeetingForm';

const iso = (d: Date) => d.toISOString().slice(0, 10);
const monthStart = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
const addMonths = (d: Date, n: number) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));

// A month of meetings and the official holidays, by day. Fridays and holidays take no new meetings (the host refuses them).
export function MeetingsPage() {
  const { me, can } = useAuth();
  const [month, setMonth] = useState(monthStart(new Date()));
  const [list, setList] = useState<Meeting[]>([]);
  const [holidays, setHolidays] = useState<OfficialHoliday[]>([]);
  const [people, setPeople] = useState<MeetingPeople | null>(null);
  const [form, setForm] = useState<{ meeting?: Meeting } | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    const from = iso(month), to = iso(addMonths(month, 1));
    meetingsApi.list(from, to).then(setList).catch((e) => setError(e.message));
    meetingsApi.holidays(from, to).then(setHolidays).catch(() => setHolidays([]));
  }, [month]);
  useEffect(load, [load]);
  useEffect(() => { meetingsApi.people().then(setPeople).catch(() => {}); }, []);

  const days = [...new Set([...list.map((m) => m.details.date), ...holidays.map((h) => h.date)])].sort();
  const fa = (d: string) => new Date(d).toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold">جلسات و تقویم</h1>
        <button className="border rounded-lg px-2 py-1 text-sm bg-white" onClick={() => setMonth(addMonths(month, -1))}>قبلی</button>
        <span className="text-sm">{month.toLocaleDateString('fa-IR', { month: 'long', year: 'numeric' })}</span>
        <button className="border rounded-lg px-2 py-1 text-sm bg-white" onClick={() => setMonth(addMonths(month, 1))}>بعدی</button>
        {can('Meetings.Create') && people?.canCreate && <button className="ms-auto flex items-center gap-1 rounded-lg bg-blue-600 text-white px-3 py-1.5 text-sm" onClick={() => setForm({})}><Plus size={16} /> جلسه جدید</button>}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {people && !people.canCreate && people.message && <p className="text-sm text-amber-700">{people.message}</p>}
      <ul className="space-y-3">
        {days.map((d) => (
          <li key={d} className="bg-white rounded-xl border p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">{fa(d)}{holidays.filter((h) => h.date === d).map((h) => <span key={h.reason} className="text-xs rounded-full bg-red-50 text-red-700 px-2">{h.reason}</span>)}</div>
            {list.filter((m) => m.details.date === d).map((m) => (
              <div key={m.id} className="flex items-center gap-2 text-sm border-t pt-2">
                <button className="text-start flex-1" onClick={() => setForm({ meeting: m })}><span className="text-slate-500" dir="ltr">{m.details.startTime}–{m.details.endTime}</span> <b>{m.details.title}</b>
                  {m.details.location && <span className="text-slate-400"> · {m.details.location}</span>}
                  {m.details.actions.length > 0 && <span className="ms-2 text-xs text-slate-500">{m.details.actions.filter((a) => a.taskId).length}/{m.details.actions.length} اقدام وظیفه شد</span>}</button>
                {m.canDelete && <button title="حذف" className="p-1 hover:text-red-600" onClick={() => confirm('جلسه حذف شود؟') && meetingsApi.remove(m.id, m.version).then(load).catch((e) => setError(e.message))}><Trash2 size={16} /></button>}
              </div>
            ))}
          </li>
        ))}
        {days.length === 0 && <li className="bg-white rounded-xl border px-3 py-8 text-center text-slate-400">جلسه‌ای در این ماه نیست</li>}
      </ul>
      {form && people && me && (
        <MeetingForm meeting={form.meeting} people={people.people} initial={emptyMeeting(me.user.id, iso(new Date()))} onClose={() => setForm(null)} onSaved={() => { load(); if (!form.meeting) setForm(null); }} />
      )}
    </div>
  );
}
