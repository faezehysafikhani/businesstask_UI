import { useEffect, useState } from 'react';
import { ClipboardList, Clock, Users } from 'lucide-react';
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
    <div className="space-y-4 max-w-5xl">
      <h1 className="text-xl font-bold">بار کاری</h1>
      <div className="flex flex-wrap gap-2 items-center text-sm">
        از <input type="date" className="border rounded-lg px-2 py-1" value={from} onChange={(e) => setFrom(e.target.value)} />
        تا <input type="date" className="border rounded-lg px-2 py-1" value={to} onChange={(e) => setTo(e.target.value)} />
        ظرفیت هفتگی <input type="number" className="w-16 border rounded-lg px-2 py-1" value={hours} onChange={(e) => setHours(e.target.value)} /> ساعت
        <button className="rounded-lg bg-blue-600 text-white px-3 py-1" onClick={load}>نمایش</button>
        {w && <span className="text-slate-500">{w.from} تا {w.to}</span>}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {w && (
        <div className="grid grid-cols-3 max-[899px]:grid-cols-2 gap-3.5">
          <div className="stat"><span className="ic bg-blue-50 text-blue-600"><Users size={20} /></span><div><small>افراد</small><strong>{w.people.length.toLocaleString('fa-IR')}</strong></div></div>
          <div className="stat"><span className="ic bg-blue-50 text-blue-600"><ClipboardList size={20} /></span><div><small>وظایف باز</small><strong>{w.people.reduce((a, r) => a + r.openTasks, 0).toLocaleString('fa-IR')}</strong></div></div>
          <div className="stat"><span className="ic bg-blue-50 text-blue-600"><Clock size={20} /></span><div><small>ساعت ثبت‌شده</small><strong dir="ltr">{fmtMinutes(w.people.reduce((a, r) => a + r.loggedMinutes, 0))}</strong></div></div>
        </div>
      )}
      <ul className="card divide-y divide-slate-200 text-sm">
        {w?.people.map((r) => (
          <li key={r.user.id} className="p-3 space-y-1 flex items-center gap-4"><div className="flex-1 space-y-1">
            <div className="flex items-center gap-3"><span className="font-medium">{r.user.displayName}</span>
              <span className="text-slate-500">ثبت‌شده <b dir="ltr">{fmtMinutes(r.loggedMinutes)}</b> · باقی‌مانده برآورد <b dir="ltr">{fmtMinutes(r.remainingEstimatedMinutes)}</b> · {r.openTasks} وظیفه باز</span>
              <span className={`ms-auto font-medium ${r.utilization > 1 ? 'text-red-600' : r.utilization > 0.8 ? 'text-amber-600' : 'text-green-600'}`}>{Math.round(r.utilization * 100)}٪</span></div>
            <div className="h-2 rounded bg-slate-100 overflow-hidden"><div className={`h-full ${r.utilization > 1 ? 'bg-red-500' : r.utilization > 0.8 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, r.utilization * 100)}%` }} /></div>
          </div>
          <div className="size-14 rounded-full grid place-items-center text-xs font-bold shrink-0"
            style={{ background: `radial-gradient(closest-side, var(--surface) 70%, transparent 72% 100%), conic-gradient(${r.utilization > 1 ? '#ef4444' : r.utilization > 0.8 ? '#f59e0b' : 'var(--primary)'} ${Math.min(100, r.utilization * 100)}%, var(--line) 0)` }}>{Math.round(r.utilization * 100).toLocaleString('fa-IR')}٪</div>
          </li>
        ))}
        {w && w.people.length === 0 && <li className="p-6 text-center text-slate-400">داده‌ای نیست</li>}
      </ul>
    </div>
  );
}
