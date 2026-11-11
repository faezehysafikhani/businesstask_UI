import { useEffect, useState } from 'react';
import { timeApi } from '../../api/tasks';
import { fmtMinutes, type Workload } from '../../api/types';

// Per person: logged time + estimate still left against the capacity of the range (44 hours a week unless changed).
export function WorkloadPage() {
  const [w, setW] = useState<Workload | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [hours, setHours] = useState('44');
  const [error, setError] = useState('');
  const load = () => timeApi.workload(from || undefined, to || undefined, Number(hours) * 60).then(setW).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4 max-w-4xl">
      <h1 className="text-xl font-bold">بار کاری</h1>
      <div className="flex flex-wrap gap-2 items-center text-sm">
        از <input type="date" className="border rounded-lg px-2 py-1" value={from} onChange={(e) => setFrom(e.target.value)} />
        تا <input type="date" className="border rounded-lg px-2 py-1" value={to} onChange={(e) => setTo(e.target.value)} />
        ظرفیت هفتگی <input type="number" className="w-16 border rounded-lg px-2 py-1" value={hours} onChange={(e) => setHours(e.target.value)} /> ساعت
        <button className="rounded-lg bg-blue-600 text-white px-3 py-1" onClick={load}>نمایش</button>
        {w && <span className="text-slate-500">{w.from} تا {w.to}</span>}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ul className="bg-white rounded-xl border divide-y text-sm">
        {w?.people.map((r) => (
          <li key={r.user.id} className="p-3 space-y-1">
            <div className="flex items-center gap-3"><span className="font-medium">{r.user.displayName}</span>
              <span className="text-slate-500">ثبت‌شده <b dir="ltr">{fmtMinutes(r.loggedMinutes)}</b> · باقی‌مانده برآورد <b dir="ltr">{fmtMinutes(r.remainingEstimatedMinutes)}</b> · {r.openTasks} وظیفه باز</span>
              <span className={`ms-auto font-medium ${r.utilization > 1 ? 'text-red-600' : r.utilization > 0.8 ? 'text-amber-600' : 'text-green-600'}`}>{Math.round(r.utilization * 100)}٪</span></div>
            <div className="h-2 rounded bg-slate-100 overflow-hidden"><div className={`h-full ${r.utilization > 1 ? 'bg-red-500' : r.utilization > 0.8 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, r.utilization * 100)}%` }} /></div>
          </li>
        ))}
        {w && w.people.length === 0 && <li className="p-6 text-center text-slate-400">داده‌ای نیست</li>}
      </ul>
    </div>
  );
}
