import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { reportsApi, type ReportSubscription } from '../../api/tasks';

const FREQ: Record<string, string> = { Daily: 'روزانه', Weekly: 'هفتگی', Monthly: 'ماهانه' };
const DAYS: Record<string, string> = { Saturday: 'شنبه', Sunday: 'یکشنبه', Monday: 'دوشنبه', Tuesday: 'سه‌شنبه', Wednesday: 'چهارشنبه', Thursday: 'پنجشنبه', Friday: 'جمعه' };

// A digest of my own tasks (overdue, due today, this week, in progress) sent to my mobile / email at a time I choose (Iran time).
export function MyReportsPage() {
  const [list, setList] = useState<ReportSubscription[]>([]);
  const [f, setF] = useState({ frequency: 'Daily', dayOfWeek: 'Saturday', dayOfMonth: 1, hour: 8, bySms: true, byEmail: false });
  const [error, setError] = useState('');
  const load = useCallback(() => { reportsApi.list().then(setList).catch((e) => setError(e.message)); }, []);
  useEffect(load, [load]);
  async function act(fn: () => Promise<unknown>) { setError(''); try { await fn(); load(); } catch (e) { setError((e as Error).message); } }
  const add = (e: FormEvent) => { e.preventDefault(); act(() => reportsApi.save(null, { frequency: f.frequency, dayOfWeek: f.frequency === 'Weekly' ? f.dayOfWeek : null, dayOfMonth: f.frequency === 'Monthly' ? f.dayOfMonth : null, hour: f.hour, bySms: f.bySms, byEmail: f.byEmail, isActive: true })); };

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-bold">گزارش زمان‌بندی‌شده‌ی من</h1>
      <p className="text-sm text-slate-500">خلاصه‌ی وظایف خودتان (عقب‌افتاده، امروز، ۷ روز آینده، در حال انجام) در زمان انتخابی برایتان پیامک یا ایمیل می‌شود. پیامک به شماره‌ی موبایل حساب شما می‌رود.</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ul className="bg-white rounded-xl border divide-y text-sm">
        {list.map((s) => (
          <li key={s.id} className="p-3 flex items-center gap-3">
            <span className={s.isActive ? 'font-medium' : 'line-through text-slate-400'}>{FREQ[s.frequency]}{s.dayOfWeek ? ` · ${DAYS[s.dayOfWeek]}` : ''}{s.dayOfMonth ? ` · روز ${s.dayOfMonth}` : ''} · ساعت {s.hour}</span>
            <span className="text-xs text-slate-500">{[s.bySms && 'پیامک', s.byEmail && 'ایمیل'].filter(Boolean).join(' + ')}</span>
            <span className="text-xs text-slate-400">بعدی: {new Date(s.nextRunAtUtc).toLocaleString('fa-IR')}</span>
            <button className="ms-auto text-xs underline" onClick={() => act(() => reportsApi.save(s.id, { frequency: s.frequency, dayOfWeek: s.dayOfWeek, dayOfMonth: s.dayOfMonth, hour: s.hour, bySms: s.bySms, byEmail: s.byEmail, isActive: !s.isActive }))}>{s.isActive ? 'غیرفعال' : 'فعال'}</button>
            <button title="حذف" className="p-1 hover:text-red-600" onClick={() => act(() => reportsApi.remove(s.id))}><Trash2 size={16} /></button>
          </li>
        ))}
        {list.length === 0 && <li className="p-6 text-center text-slate-400">گزارشی تنظیم نشده است</li>}
      </ul>
      <form onSubmit={add} className="bg-white rounded-xl border p-3 flex flex-wrap items-center gap-2 text-sm">
        <select className="border rounded-lg px-2 py-1" value={f.frequency} onChange={(e) => setF({ ...f, frequency: e.target.value })}>{Object.entries(FREQ).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        {f.frequency === 'Weekly' && <select className="border rounded-lg px-2 py-1" value={f.dayOfWeek} onChange={(e) => setF({ ...f, dayOfWeek: e.target.value })}>{Object.entries(DAYS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>}
        {f.frequency === 'Monthly' && <label>روز ماه <input type="number" min={1} max={28} className="w-16 border rounded px-1" value={f.dayOfMonth} onChange={(e) => setF({ ...f, dayOfMonth: Number(e.target.value) })} /></label>}
        <label>ساعت <input type="number" min={0} max={23} className="w-16 border rounded px-1" value={f.hour} onChange={(e) => setF({ ...f, hour: Number(e.target.value) })} /></label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={f.bySms} onChange={(e) => setF({ ...f, bySms: e.target.checked })} /> پیامک</label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={f.byEmail} onChange={(e) => setF({ ...f, byEmail: e.target.checked })} /> ایمیل</label>
        <button disabled={!f.bySms && !f.byEmail} className="rounded-lg bg-blue-600 text-white px-4 py-1.5 disabled:opacity-50">افزودن</button>
      </form>
    </div>
  );
}
