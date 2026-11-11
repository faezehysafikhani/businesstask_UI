import { useEffect, useState } from 'react';
import { smsApi, type SmsChannel } from '../../api/tasks';

// The SMS panel: which gateway sends the messages (sign-in codes, task reminders, digests). Keys are write-only: leave a field empty to keep the saved one.
export function SmsSettingsPage() {
  const [providers, setProviders] = useState<{ key: string; displayName: string; defaultBaseUrl: string }[]>([]);
  const [s, setS] = useState<SmsChannel | null>(null);
  const [f, setF] = useState({ apiUrl: '', apiKey: '', lineNumber: '', username: '', password: '' });
  const [testPhone, setTestPhone] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    smsApi.providers().then(setProviders).catch(() => {});
    smsApi.get().then((r) => { setS(r.sms); setF((x) => ({ ...x, apiUrl: r.sms.apiUrl ?? '', lineNumber: r.sms.lineNumber ?? '' })); }).catch((e) => setError(e.message));
  }, []);
  async function act(fn: () => Promise<void>) { setError(''); setMsg(''); try { await fn(); } catch (e) { setError((e as Error).message); } }
  if (!s) return <p className="text-sm text-slate-500">{error || '...'}</p>;
  const provider = providers.find((p) => p.key === s.provider);

  return (
    <div className="space-y-4 max-w-xl">
      <h1 className="text-xl font-bold">پنل پیامک</h1>
      <div className="bg-white rounded-xl border p-4 space-y-3 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={s.enabled} onChange={(e) => setS({ ...s, enabled: e.target.checked })} /> ارسال پیامک فعال باشد</label>
        <label className="block">سرویس‌دهنده
          <select className="mt-1 w-full border rounded-lg px-2 py-1.5" value={s.provider} onChange={(e) => setS({ ...s, provider: e.target.value })}>{providers.map((p) => <option key={p.key} value={p.key}>{p.displayName}</option>)}</select></label>
        <label className="block">آدرس سرویس (خالی = آدرس رسمی{provider ? `: ${provider.defaultBaseUrl}` : ''})
          <input className="mt-1 w-full border rounded-lg px-2 py-1.5" dir="ltr" value={f.apiUrl} onChange={(e) => setF({ ...f, apiUrl: e.target.value })} /></label>
        <div className="grid grid-cols-2 gap-2">
          <label>کلید API {s.apiKeyConfigured && <span className="text-green-600 text-xs">ثبت شده</span>}<input type="password" className="mt-1 w-full border rounded-lg px-2 py-1.5" dir="ltr" placeholder="خالی = بدون تغییر" value={f.apiKey} onChange={(e) => setF({ ...f, apiKey: e.target.value })} /></label>
          <label>شماره خط<input className="mt-1 w-full border rounded-lg px-2 py-1.5" dir="ltr" value={f.lineNumber} onChange={(e) => setF({ ...f, lineNumber: e.target.value })} /></label>
          <label>نام کاربری (ملی‌پیامک) {s.usernameConfigured && <span className="text-green-600 text-xs">ثبت شده</span>}<input className="mt-1 w-full border rounded-lg px-2 py-1.5" dir="ltr" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} /></label>
          <label>رمز عبور پنل {s.passwordConfigured && <span className="text-green-600 text-xs">ثبت شده</span>}<input type="password" className="mt-1 w-full border rounded-lg px-2 py-1.5" dir="ltr" placeholder="خالی = بدون تغییر" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>
        </div>
        <button className="rounded-lg bg-blue-600 text-white px-4 py-1.5" onClick={() => act(async () => { await smsApi.save({ enabled: s.enabled, provider: s.provider, apiUrl: f.apiUrl || null, apiKey: f.apiKey || null, lineNumber: f.lineNumber || null, username: f.username || null, password: f.password || null }); setMsg('ذخیره شد'); setF({ ...f, apiKey: '', password: '' }); })}>ذخیره</button>
      </div>
      <div className="bg-white rounded-xl border p-4 space-y-2 text-sm">
        <h2 className="font-medium">پیامک آزمایشی</h2>
        <div className="flex gap-2"><input className="flex-1 border rounded-lg px-2 py-1.5" dir="ltr" placeholder="09…" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} />
          <button disabled={!testPhone} className="border rounded-lg px-4 py-1.5 disabled:opacity-50" onClick={() => act(async () => { const r = await smsApi.test(testPhone); setMsg(r.message); })}>ارسال</button></div>
      </div>
      {msg && <p className="text-sm text-green-700">{msg}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
