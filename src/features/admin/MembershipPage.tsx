import { useCallback, useEffect, useState } from 'react';
import { membershipApi } from '../../api/tasks';
import { MembershipStatusLabel, type Membership } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';

const mb = (b: number) => `${(b / 1024 / 1024).toFixed(1)} مگابایت`;
function Bar({ label, used, max, text }: { label: string; used: number; max?: number | null; text: string }) {
  const ratio = max ? used / max : 0;
  return (
    <div className="space-y-1"><div className="flex justify-between text-sm"><span>{label}</span><span>{text}</span></div>
      <div className="h-2 rounded bg-slate-100 overflow-hidden"><div className={`h-full ${ratio >= 1 ? 'bg-red-500' : ratio >= 0.9 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, ratio * 100)}%` }} /></div></div>
  );
}

// The plan: what is used against its limits and validity; with Membership.Manage you set them. Also how long logs are kept.
export function MembershipPage() {
  const { can } = useAuth();
  const [m, setM] = useState<Membership | null>(null);
  const [f, setF] = useState({ planName: '', maxUsers: '', maxStorageMb: '', validFrom: '', validUntil: '', notes: '' });
  const [ret, setRet] = useState({ automationLogDays: '', webhookDeliveryDays: '' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const load = useCallback(() => {
    membershipApi.get().then((x) => { setM(x); setF({ planName: x.planName ?? '', maxUsers: x.maxUsers?.toString() ?? '', maxStorageMb: x.maxStorageMb?.toString() ?? '', validFrom: x.validFrom ?? '', validUntil: x.validUntil ?? '', notes: x.notes ?? '' }); }).catch((e) => setError(e.message));
    membershipApi.retention().then((r) => setRet({ automationLogDays: r.automationLogDays?.toString() ?? '', webhookDeliveryDays: r.webhookDeliveryDays?.toString() ?? '' })).catch(() => {});
  }, []);
  useEffect(load, [load]);
  const num = (s: string) => (s.trim() ? Number(s) : null);
  async function act(fn: () => Promise<unknown>, ok: string) { setError(''); setMsg(''); try { await fn(); setMsg(ok); load(); } catch (e) { setError((e as Error).message); } }
  const manage = can('Membership.Manage');

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-bold">پلن و مصرف</h1>
      {m && <>
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <div className="flex items-center gap-3"><span className="font-medium">{m.planName ?? 'بدون پلن'}</span><span className="text-sm text-slate-500">{MembershipStatusLabel[m.status]}{m.daysLeft != null && m.daysLeft >= 0 ? ` · ${m.daysLeft} روز مانده` : ''}</span></div>
          <Bar label="کاربران فعال" used={m.usage.activeUsers} max={m.maxUsers} text={`${m.usage.activeUsers}${m.maxUsers ? ` از ${m.maxUsers}` : ''}`} />
          <Bar label="فضای فایل" used={m.usage.storageBytes} max={m.maxStorageMb ? m.maxStorageMb * 1024 * 1024 : null} text={`${mb(m.usage.storageBytes)}${m.maxStorageMb ? ` از ${m.maxStorageMb} مگابایت` : ''}`} />
          <div className="text-sm text-slate-500">وظایف: {m.usage.taskCount}</div>
          {m.warnings.map((w) => <p key={w} className="text-sm rounded-lg bg-amber-50 text-amber-800 px-3 py-1.5">{w}</p>)}
        </div>
        {manage && (
          <form className="bg-white rounded-xl border p-4 space-y-2 text-sm" onSubmit={(e) => { e.preventDefault(); act(() => membershipApi.set({ planName: f.planName.trim(), maxUsers: num(f.maxUsers), maxStorageMb: num(f.maxStorageMb), validFrom: f.validFrom || null, validUntil: f.validUntil || null, notes: f.notes || null }), 'پلن ذخیره شد'); }}>
            <h2 className="font-medium">تعیین پلن</h2>
            <div className="grid grid-cols-2 gap-2">
              <input className="border rounded-lg px-2 py-1" placeholder="نام پلن" value={f.planName} onChange={(e) => setF({ ...f, planName: e.target.value })} />
              <input className="border rounded-lg px-2 py-1" type="number" placeholder="سقف کاربر (خالی = نامحدود)" value={f.maxUsers} onChange={(e) => setF({ ...f, maxUsers: e.target.value })} />
              <input className="border rounded-lg px-2 py-1" type="number" placeholder="سقف فضا به مگابایت" value={f.maxStorageMb} onChange={(e) => setF({ ...f, maxStorageMb: e.target.value })} />
              <span />
              <label>شروع <input type="date" className="border rounded-lg px-2 py-1 w-full" value={f.validFrom} onChange={(e) => setF({ ...f, validFrom: e.target.value })} /></label>
              <label>پایان <input type="date" className="border rounded-lg px-2 py-1 w-full" value={f.validUntil} onChange={(e) => setF({ ...f, validUntil: e.target.value })} /></label>
            </div>
            <div className="flex gap-2"><button disabled={!f.planName.trim()} className="rounded-lg bg-blue-600 text-white px-4 py-1.5 disabled:opacity-50">ذخیره</button>
              <button type="button" className="border rounded-lg px-3 py-1.5" onClick={() => confirm('پلن حذف شود؟ هیچ محدودیتی نمی‌ماند.') && act(() => membershipApi.clear(), 'پلن حذف شد')}>حذف پلن</button></div>
          </form>
        )}
        {manage && (
          <form className="bg-white rounded-xl border p-4 space-y-2 text-sm" onSubmit={(e) => { e.preventDefault(); act(() => membershipApi.setRetention({ automationLogDays: num(ret.automationLogDays), webhookDeliveryDays: num(ret.webhookDeliveryDays) }), 'نگهداری ذخیره شد'); }}>
            <h2 className="font-medium">نگهداری گزارش‌ها (روز؛ خالی = برای همیشه)</h2>
            <div className="flex gap-2"><input className="border rounded-lg px-2 py-1 flex-1" type="number" min={7} placeholder="گزارش اجرای قاعده‌ها" value={ret.automationLogDays} onChange={(e) => setRet({ ...ret, automationLogDays: e.target.value })} />
              <input className="border rounded-lg px-2 py-1 flex-1" type="number" min={7} placeholder="گزارش ارسال وب‌هوک" value={ret.webhookDeliveryDays} onChange={(e) => setRet({ ...ret, webhookDeliveryDays: e.target.value })} />
              <button className="rounded-lg bg-blue-600 text-white px-4 py-1.5">ذخیره</button></div>
          </form>
        )}
      </>}
      {msg && <p className="text-sm text-green-700">{msg}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
