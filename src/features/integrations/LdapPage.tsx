import { useEffect, useState } from 'react';
import { ldapApi, type LdapSettings, type LdapSyncReport } from '../../api/tasks';
import { useAuth } from '../../auth/AuthContext';

const ACTION: Record<string, string> = { Create: 'ساخته می‌شود', Update: 'به‌روز می‌شود', Deactivate: 'غیرفعال می‌شود', Reactivate: 'دوباره فعال می‌شود', Unchanged: 'بدون تغییر', Skipped: 'رد شد' };

// Active Directory / LDAP: the connection, and the HR sync - the directory's people become users (and leave when they leave it).
export function LdapPage() {
  const { can } = useAuth();
  const [s, setS] = useState<LdapSettings | null>(null);
  const [report, setReport] = useState<LdapSyncReport | null>(null);
  const [attr, setAttr] = useState('sAMAccountName');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { ldapApi.get().then(setS).catch((e) => setError(e.message)); }, []);
  async function act(fn: () => Promise<void>) { setError(''); setMsg(''); try { await fn(); } catch (e) { setError((e as Error).message); } }
  if (!s) return <p className="text-sm text-slate-500">{error || '...'}</p>;
  const set = <K extends keyof LdapSettings>(k: K, v: LdapSettings[K]) => setS({ ...s, [k]: v });
  const field = (label: string, k: keyof LdapSettings, type = 'text') => (
    <label className="block">{label}<input type={type} className="mt-1 w-full border rounded-lg px-2 py-1.5" dir="ltr" value={(s[k] as string | number | null | undefined) ?? ''} onChange={(e) => set(k, (type === 'number' ? Number(e.target.value) : e.target.value) as never)} /></label>
  );

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-xl font-bold">Active Directory / LDAP</h1>
      <div className="bg-white rounded-xl border p-4 space-y-3 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={s.enabled} onChange={(e) => set('enabled', e.target.checked)} /> فعال</label>
        <div className="grid grid-cols-2 gap-2">
          {field('سرور', 'host')}{field('پورت', 'port', 'number')}{field('دامنه', 'domain')}{field('Base DN', 'baseDn')}
          {field('حساب اتصال (Bind)', 'bindUsername')}
          <label className="block">رمز حساب اتصال {s.bindPasswordConfigured && <span className="text-green-600 text-xs">ثبت شده</span>}<input type="password" className="mt-1 w-full border rounded-lg px-2 py-1.5" dir="ltr" placeholder="خالی = بدون تغییر" value={s.bindPassword ?? ''} onChange={(e) => set('bindPassword', e.target.value)} /></label>
          {field('مسیر جستجوی کاربران', 'userSearchBase')}{field('فیلتر کاربران', 'userFilter')}
        </div>
        <div className="flex gap-4"><label className="flex items-center gap-1"><input type="checkbox" checked={s.useSsl} onChange={(e) => set('useSsl', e.target.checked)} /> SSL</label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={s.useStartTls} onChange={(e) => set('useStartTls', e.target.checked)} /> StartTLS</label></div>
        <div className="flex gap-2">
          {can('ldap_settings.update') && <button className="rounded-lg bg-blue-600 text-white px-4 py-1.5" onClick={() => act(async () => { setS(await ldapApi.save(s)); setMsg('ذخیره شد'); })}>ذخیره</button>}
          {can('ldap_settings.test') && <button className="border rounded-lg px-4 py-1.5" onClick={() => act(async () => { const r = await ldapApi.test(s); setMsg(r.message); })}>آزمایش اتصال</button>}
        </div>
      </div>

      {can('ldap_settings.update') && (
        <div className="bg-white rounded-xl border p-4 space-y-3 text-sm">
          <h2 className="font-medium">همگام‌سازی کاربران</h2>
          <p className="text-slate-500">نام کاربری در سامانه کد ملی ۱۰ رقمی است؛ ویژگی دایرکتوری که کد ملی را نگه می‌دارد انتخاب کنید (مثلاً <code dir="ltr">employeeID</code>). کاربرانِ همگام‌شده با رمز دایرکتوری وارد می‌شوند. سقف کاربران پلن رعایت می‌شود و کسی حذف نمی‌شود.</p>
          <div className="flex gap-2 items-center"><span>ویژگی نام کاربری:</span><input className="border rounded-lg px-2 py-1" dir="ltr" value={attr} onChange={(e) => setAttr(e.target.value)} />
            <button className="border rounded-lg px-3 py-1" onClick={() => act(async () => setReport(await ldapApi.preview({ username: attr })))}>پیش‌نمایش</button>
            <button className="rounded-lg bg-green-600 text-white px-3 py-1" onClick={() => confirm('همگام‌سازی انجام شود؟') && act(async () => { setReport(await ldapApi.sync({ username: attr })); })}>اجرا</button></div>
          {report && (
            <div className="space-y-1">
              <p>{report.applied ? 'انجام شد' : 'پیش‌نمایش'}: ساخته {report.created} · به‌روز {report.updated} · غیرفعال {report.deactivated} · فعال‌شده {report.reactivated} · بدون تغییر {report.unchanged} · رد {report.skipped}</p>
              <ul className="max-h-64 overflow-y-auto border rounded-lg divide-y text-xs">{report.rows.filter((r) => r.action !== 'Unchanged').map((r, i) => <li key={i} className="px-2 py-1 flex gap-2"><span>{r.username ?? '—'}</span><span>{r.displayName}</span><span className="ms-auto text-slate-500">{ACTION[r.action]}{r.reason ? ` — ${r.reason}` : ''}</span></li>)}</ul>
            </div>
          )}
        </div>
      )}
      {msg && <p className="text-sm text-green-700">{msg}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
