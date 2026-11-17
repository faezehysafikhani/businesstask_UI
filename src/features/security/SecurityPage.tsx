import { useEffect, useState } from 'react';
import { api, ApiError } from '../../api/client';
import type { MfaChallenge } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';

// My account's security: the SMS code at sign-in. Turning it on first sends a code to your own mobile number, to prove it works.
export function SecurityPage() {
  const { me, reloadMe } = useAuth();
  const enabled = !!me?.user.mfaEnabled;
  const [policy, setPolicy] = useState('');
  useEffect(() => { api<{ message: string }>('GET', '/api/platform/password-policy').then((p) => setPolicy(p.message)).catch(() => {}); }, []);
  const [challenge, setChallenge] = useState<MfaChallenge | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [pw, setPw] = useState({ current: '', next: '', again: '' });
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');
  const [error, setError] = useState('');

  async function act(fn: () => Promise<void>) { setError(''); setMsg(''); try { await fn(); } catch (e) { setError(e instanceof ApiError ? e.message : 'خطا'); } }

  return (
    <div className="space-y-4 max-w-lg">
      <h1 className="text-xl font-bold">امنیت حساب</h1>
      <div className="bg-white rounded-xl border p-4 space-y-3 text-sm">
        <div className="flex items-center gap-2"><span className="font-medium">ورود دومرحله‌ای (کد پیامکی)</span>
          <span className={enabled ? 'text-green-600' : 'text-slate-400'}>{enabled ? 'روشن' : 'خاموش'}</span></div>
        {!enabled && !challenge && (
          <button className="rounded-lg bg-blue-600 text-white px-4 py-1.5" onClick={() => act(async () => setChallenge(await api<MfaChallenge>('POST', '/api/identity/auth/me/mfa/request-enable')))}>روشن کردن</button>
        )}
        {!enabled && challenge && (
          <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); act(async () => { await api('POST', '/api/identity/auth/me/mfa/confirm-enable', { challengeId: challenge.challengeId, code: code.trim() }); setChallenge(null); setCode(''); setMsg('ورود دومرحله‌ای روشن شد'); await reloadMe(); }); }}>
            <p>کد به <b dir="ltr">{challenge.maskedPhone}</b> پیامک شد.</p>
            <input className="border rounded-lg px-3 py-1.5 tracking-widest" dir="ltr" inputMode="numeric" aria-label="کد" placeholder="کد" value={code} onChange={(e) => setCode(e.target.value)} />
            <button disabled={!code.trim()} className="ms-2 rounded-lg bg-green-600 text-white px-4 py-1.5 disabled:opacity-50">تأیید</button>
          </form>
        )}
        {enabled && (
          <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); act(async () => { await api('POST', '/api/identity/auth/me/mfa/disable', { password }); setPassword(''); setMsg('ورود دومرحله‌ای خاموش شد'); await reloadMe(); }); }}>
            <p className="text-slate-500">برای خاموش کردن، رمز عبور را وارد کنید.</p>
            <input type="password" className="border rounded-lg px-3 py-1.5" dir="ltr" aria-label="رمز عبور" placeholder="رمز عبور" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button disabled={!password} className="ms-2 rounded-lg border px-4 py-1.5 disabled:opacity-50">خاموش کردن</button>
          </form>
        )}
        {msg && <p className="text-green-700">{msg}</p>}
        {error && <p className="text-red-600">{error}</p>}
        <p className="text-xs text-slate-400">اگر گوشی‌تان را گم کردید، مدیر سامانه می‌تواند این گزینه را برایتان بازنشانی کند.</p>
      </div>
      <form className="bg-white rounded-xl border p-4 space-y-2 text-sm" onSubmit={async (e) => {
        e.preventDefault(); setPwMsg(''); setPwError('');
        if (pw.next !== pw.again) { setPwError('رمز جدید و تکرار آن یکی نیستند.'); return; }
        try { await api('PUT', '/api/identity/auth/me/password', { currentPassword: pw.current, newPassword: pw.next }); setPw({ current: '', next: '', again: '' }); setPwMsg('رمز عبور تغییر کرد.'); }
        catch (x) { setPwError(x instanceof ApiError ? x.message : 'خطا'); }
      }}>
        <h2 className="font-medium">تغییر رمز عبور</h2>
        {policy && <p className="text-xs text-slate-500">{policy}</p>}
        {(['current', 'next', 'again'] as const).map((k) => (
          <input key={k} type="password" autoComplete="new-password" dir="ltr" className="block w-full border rounded-lg px-3 py-1.5" value={pw[k]} onChange={(e) => setPw({ ...pw, [k]: e.target.value })}
            placeholder={k === 'current' ? 'رمز فعلی' : k === 'next' ? 'رمز جدید' : 'تکرار رمز جدید'} />
        ))}
        {pwMsg && <p className="text-green-700">{pwMsg}</p>}
        {pwError && <p className="text-red-600">{pwError}</p>}
        <button disabled={!pw.current || !pw.next || !pw.again} className="rounded-lg bg-blue-600 text-white px-4 py-1.5 disabled:opacity-50">تغییر رمز</button>
      </form>
    </div>
  );
}
