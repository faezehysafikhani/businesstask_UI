import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../api/client';
import type { Captcha, MfaChallenge } from '../api/types';
import { useAuth } from './AuthContext';

export function LoginPage() {
  const { login, completeMfa } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [captcha, setCaptcha] = useState<Captcha | null>(null);
  const [answer, setAnswer] = useState('');
  const [mfa, setMfa] = useState<MfaChallenge | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadCaptcha = () => api<Captcha>('POST', '/api/identity/auth/captcha').then(setCaptcha).catch(() => setCaptcha(null));

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      if (mfa) { await completeMfa(mfa.challengeId, code.trim()); return; }
      const waiting = await login(identifier.trim(), password, captcha ? { id: captcha.captchaId, answer: answer.trim() } : undefined);
      if (waiting) setMfa(waiting);
    } catch (x) {
      if (x instanceof ApiError && (x.code === 'unauthorized.captcha_required' || x.code === 'captcha.required' || x.code.startsWith('captcha'))) {
        // After a failed attempt the host asks for a CAPTCHA: show it, and a new one after every refusal.
        await loadCaptcha(); setAnswer('');
      } else if (captcha) { await loadCaptcha(); setAnswer(''); }
      setError(x instanceof ApiError ? x.message : 'اتصال به سرور برقرار نشد');
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-2xl shadow p-6 space-y-4">
        <h1 className="text-xl font-bold">ورود به سامانه</h1>
        {mfa ? (
          <>
            <p className="text-sm text-slate-600">کد ورود به شماره <b dir="ltr">{mfa.maskedPhone}</b> پیامک شد. تا {Math.round(mfa.expiresInSeconds / 60)} دقیقه معتبر است.</p>
            <input className="w-full border rounded-lg px-3 py-2 text-center tracking-widest" inputMode="numeric" autoFocus placeholder="کد پیامکی" value={code} onChange={(e) => setCode(e.target.value)} dir="ltr" />
            <button type="button" className="text-xs underline" onClick={() => { setMfa(null); setCode(''); setError(''); }}>بازگشت</button>
          </>
        ) : (
          <>
            <label className="block text-sm">نام کاربری یا موبایل
              <input className="mt-1 w-full border rounded-lg px-3 py-2" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoFocus dir="ltr" />
            </label>
            <label className="block text-sm">رمز عبور
              <input className="mt-1 w-full border rounded-lg px-3 py-2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" />
            </label>
            {captcha && (
              <div className="space-y-2">
                <img src={captcha.imageDataUrl} alt="captcha" className="rounded border w-full" />
                <input className="w-full border rounded-lg px-3 py-2" placeholder="عبارت تصویر را وارد کنید" value={answer} onChange={(e) => setAnswer(e.target.value)} dir="ltr" />
                <button type="button" className="text-xs underline" onClick={loadCaptcha}>تصویر جدید</button>
              </div>
            )}
          </>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={busy || (mfa ? !code.trim() : !identifier || !password || (!!captcha && !answer.trim()))} className="w-full rounded-lg bg-blue-600 text-white py-2 disabled:opacity-50">{busy ? '...' : mfa ? 'تأیید کد' : 'ورود'}</button>
      </form>
    </div>
  );
}
