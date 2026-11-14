import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../api/client';
import type { Captcha, MfaChallenge, PendingSignIn } from '../api/types';
import { useAuth } from './AuthContext';

export function LoginPage() {
  const { login, completeLogin, completeMfa } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [captcha, setCaptcha] = useState<Captcha | null>(null);
  const [answer, setAnswer] = useState('');
  const [mfa, setMfa] = useState<MfaChallenge | null>(null);
  const [code, setCode] = useState('');
  const [pending, setPending] = useState<PendingSignIn | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadCaptcha = () => api<Captcha>('POST', '/api/identity/auth/captcha').then(setCaptcha).catch(() => setCaptcha(null));

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      if (mfa) { await completeMfa(mfa.challengeId, code.trim()); return; }
      if (pending) {
        // The host stopped the sign-in at its session limit: the chosen sessions are closed first.
        await completeLogin(pending.ticket, chosen);
        return;
      }
      const result = await login(identifier.trim(), password, captcha ? { id: captcha.captchaId, answer: answer.trim() } : undefined);
      if (result.mfa) setMfa(result.mfa);
      if (result.pending) {
        setPending(result.pending);
        setChosen(result.pending.sessions.slice(0, result.pending.mustClose).map((s) => s.id));
      }
    } catch (x) {
      if (x instanceof ApiError && (x.code === 'unauthorized.captcha_required' || x.code === 'captcha.required' || x.code.startsWith('captcha'))) {
        // After a failed attempt the host asks for a CAPTCHA: show it, and a new one after every refusal.
        await loadCaptcha(); setAnswer('');
      } else if (captcha) { await loadCaptcha(); setAnswer(''); }
      setError(x instanceof ApiError ? x.message : 'اتصال به سرور برقرار نشد');
    } finally { setBusy(false); }
  }

  const oldest = pending ? [...pending.sessions].sort((a, b) => a.createdAtUtc.localeCompare(b.createdAtUtc)).slice(0, pending.mustClose).map((s) => s.id) : [];

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="w-full max-w-4xl grid min-[900px]:grid-cols-2 rounded-[28px] overflow-hidden bg-white shadow-[0_40px_100px_rgba(30,20,100,.25)]">
      <form onSubmit={submit} className="p-8 min-[900px]:p-11 flex flex-col justify-center gap-4">
        <h1 className="text-2xl font-bold">ورود به سامانه</h1>
        <p className="text-sm text-slate-500 -mt-2">برای ادامه وارد حساب خود شوید.</p>
        {mfa ? (
          <>
            <p className="text-sm text-slate-600">کد ورود به شماره <b dir="ltr">{mfa.maskedPhone}</b> پیامک شد. تا {Math.round(mfa.expiresInSeconds / 60)} دقیقه معتبر است.</p>
            <input className="w-full border rounded-lg px-3 py-2 text-center tracking-widest" inputMode="numeric" autoFocus placeholder="کد پیامکی" value={code} onChange={(e) => setCode(e.target.value)} dir="ltr" />
            <button type="button" className="text-xs underline" onClick={() => { setMfa(null); setCode(''); setError(''); }}>بازگشت</button>
          </>
        ) : pending ? (
          <>
            <p className="text-sm text-slate-600">
              بیش از {pending.maxConcurrent} نشست هم‌زمان باز است. برای ادامه، {pending.mustClose} نشست را ببندید:
            </p>
            <ul className="space-y-1 text-sm">
              {pending.sessions.map((s) => (
                <li key={s.id} className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1" checked={chosen.includes(s.id)}
                    onChange={(e) => setChosen(e.target.checked ? [...chosen, s.id] : chosen.filter((id) => id !== s.id))} />
                  <span>
                    <span className="block">{s.deviceLabel || 'دستگاه ناشناس'}</span>
                    <span className="text-xs text-slate-400">از {new Date(s.createdAtUtc).toLocaleString('fa-IR')}</span>
                  </span>
                </li>
              ))}
            </ul>
            <button type="button" className="text-xs underline" onClick={() => setChosen(oldest)}>بستن {pending.mustClose} نشست قدیمی‌تر</button>
            <button type="button" className="text-xs underline" onClick={() => { setPending(null); setChosen([]); setError(''); }}>بازگشت به ورود</button>
          </>
        ) : (
          <>
            <label className="block text-sm">نام کاربری یا موبایل
              <input className="mt-1 w-full border rounded-lg px-3 py-2" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoFocus autoComplete="off" dir="ltr" />
            </label>
            <label className="block text-sm">رمز عبور
              <input className="mt-1 w-full border rounded-lg px-3 py-2" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" />
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
        <button disabled={busy || (mfa ? !code.trim() : pending ? chosen.length < pending.mustClose : !identifier || !password || (!!captcha && !answer.trim()))} className="w-full rounded-2xl bg-blue-600 text-white py-3 font-bold disabled:opacity-50 shadow-[0_10px_24px_color-mix(in_srgb,var(--primary)_40%,transparent)]" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>
          {busy ? '...' : mfa ? 'تأیید کد' : pending ? 'بستن نشست‌ها و ورود' : 'ورود'}
        </button>
      </form>
      <div className="max-[899px]:hidden relative overflow-hidden text-white p-11 flex flex-col justify-center gap-5" style={{ background: 'linear-gradient(140deg, var(--primary), var(--secondary) 55%, var(--accent))' }}>
        <span className="absolute -top-20 -left-20 size-72 rounded-full bg-white/10" /><span className="absolute -bottom-14 -right-12 size-52 rounded-full bg-white/10" />
        <h2 className="relative text-3xl font-bold">مدیریت وظایف</h2>
        <ul className="relative space-y-2 text-sm">
          {['وظیفه، بورد و ثبت سریع', 'بازبینی، درخواست و اتوماسیون', 'ساعت کاری، بار کاری و SLA', 'جلسات، پروژه‌ها و ساختار سازمانی'].map((t) => <li key={t}>✓ {t}</li>)}
        </ul>
      </div>
      </div>
    </div>
  );
}
