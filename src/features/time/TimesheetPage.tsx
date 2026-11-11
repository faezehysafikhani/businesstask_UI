import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { tasksApi, timeApi } from '../../api/tasks';
import { ApprovalLabel, fmtMinutes, type TaskListItem, type TimesheetWeek } from '../../api/types';

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (s: string, n: number) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return iso(d); };

// My week (it opens on Saturday): entries per task, totals per day, send for approval. Entries are editable until sent.
export function TimesheetPage() {
  const [day, setDay] = useState(iso(new Date()));
  const [week, setWeek] = useState<TimesheetWeek | null>(null);
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [f, setF] = useState({ taskId: '', date: iso(new Date()), hours: '1', minutes: '0', note: '' });
  const [error, setError] = useState('');
  const load = useCallback(() => { timeApi.week(day).then(setWeek).catch((e) => setError(e.message)); }, [day]);
  useEffect(load, [load]);
  useEffect(() => { tasksApi.list({ pageSize: 200 }).then((r) => setTasks(r.items)).catch(() => {}); }, []);

  async function act(fn: () => Promise<unknown>) { setError(''); try { await fn(); load(); } catch (e) { setError((e as Error).message); } }
  function add(e: FormEvent) {
    e.preventDefault();
    const minutes = Number(f.hours || 0) * 60 + Number(f.minutes || 0);
    act(() => timeApi.log({ taskId: f.taskId, date: f.date, minutes, note: f.note || undefined }).then(() => setF({ ...f, note: '' })));
  }
  const days = week ? Array.from({ length: 7 }, (_, i) => addDays(week.weekStart, i)) : [];

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold">ساعت کاری من</h1>
        <button className="border rounded-lg px-2 py-1 text-sm bg-white" onClick={() => setDay(addDays(day, -7))}>هفته قبل</button>
        <button className="border rounded-lg px-2 py-1 text-sm bg-white" onClick={() => setDay(iso(new Date()))}>این هفته</button>
        <button className="border rounded-lg px-2 py-1 text-sm bg-white" onClick={() => setDay(addDays(day, 7))}>هفته بعد</button>
        {week && <span className="ms-auto text-sm">{ApprovalLabel[week.status]} · جمع <b dir="ltr">{fmtMinutes(week.totalMinutes)}</b></span>}
      </div>
      {week?.decisionComment && week.status === 3 && <p className="text-sm rounded-lg bg-red-50 text-red-700 px-3 py-2">برگشت داده شد: {week.decisionComment}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {days.map((d) => (
          <div key={d} className="bg-white rounded-lg border py-2"><div className="text-slate-400">{new Date(d).toLocaleDateString('fa-IR', { weekday: 'short', day: 'numeric' })}</div>
            <div className="font-medium" dir="ltr">{fmtMinutes(week?.minutesPerDay[d] ?? 0)}</div></div>
        ))}
      </div>

      <form onSubmit={add} className="bg-white rounded-xl border p-3 flex flex-wrap gap-2 items-center text-sm">
        <select className="border rounded-lg px-2 py-1 flex-1 min-w-40" value={f.taskId} onChange={(e) => setF({ ...f, taskId: e.target.value })}>
          <option value="">وظیفه…</option>{tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
        <input type="date" className="border rounded-lg px-2 py-1" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        <input type="number" min={0} className="w-16 border rounded-lg px-2 py-1" value={f.hours} onChange={(e) => setF({ ...f, hours: e.target.value })} /> ساعت
        <input type="number" min={0} max={59} className="w-16 border rounded-lg px-2 py-1" value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value })} /> دقیقه
        <input className="border rounded-lg px-2 py-1 flex-1 min-w-32" placeholder="توضیح" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
        <button disabled={!f.taskId} className="rounded-lg bg-blue-600 text-white px-3 py-1 disabled:opacity-50">ثبت</button>
      </form>

      <table className="w-full text-sm bg-white rounded-xl border overflow-hidden">
        <thead className="bg-slate-50 text-slate-500"><tr>{['روز', 'وظیفه', 'زمان', 'توضیح', 'وضعیت', ''].map((h) => <th key={h} className="text-start px-3 py-2 font-normal">{h}</th>)}</tr></thead>
        <tbody>
          {week?.entries.map((e) => (
            <tr key={e.id} className="border-t">
              <td className="px-3 py-2">{new Date(e.date).toLocaleDateString('fa-IR')}</td><td className="px-3 py-2">{e.taskTitle ?? '—'}</td>
              <td className="px-3 py-2" dir="ltr">{fmtMinutes(e.minutes)}{e.source === 1 && ' ⏱'}</td><td className="px-3 py-2">{e.note}</td>
              <td className="px-3 py-2">{ApprovalLabel[e.status]}</td>
              <td className="px-3 py-2 text-end">{(e.status === 0 || e.status === 3) && <button className="p-1 hover:text-red-600" title="حذف" onClick={() => confirm('حذف شود؟') && act(() => timeApi.remove(e.id))}><Trash2 size={16} /></button>}</td>
            </tr>
          ))}
          {week && week.entries.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400">زمانی ثبت نشده است</td></tr>}
        </tbody>
      </table>
      {week?.canSubmit && <button className="rounded-lg bg-green-600 text-white px-4 py-2 text-sm" onClick={() => confirm('هفته برای تأیید ارسال شود؟ بعد از ارسال قابل ویرایش نیست.') && act(() => timeApi.submit(week.weekStart))}>ارسال هفته برای تأیید</button>}
    </div>
  );
}
