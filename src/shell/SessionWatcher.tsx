import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

interface Status { idleRemainingSeconds: number; idleWarningSeconds: number }
const S = '/api/identity/auth/sessions/current';

/** One warning shortly before the session ends from inactivity; "ادامه کار" keeps it alive. Nothing else is shown. */
export function SessionWatcher() {
  const [left, setLeft] = useState<number | null>(null); // seconds, only while the warning shows
  const warning = useRef(120);

  useEffect(() => {
    let stop = false;
    let timer: number | undefined;
    const check = async () => {
      let next = 30_000;
      try {
        // Reading the status is not activity, so it never keeps the session alive by itself.
        const s = await api<Status>('GET', S);
        warning.current = s.idleWarningSeconds || 120;
        if (s.idleRemainingSeconds <= warning.current) { setLeft(s.idleRemainingSeconds); next = 5_000; } else setLeft(null);
      } catch { /* a refused call signs out by itself */ }
      if (!stop) timer = window.setTimeout(check, next);
    };
    timer = window.setTimeout(check, 30_000);
    return () => { stop = true; clearTimeout(timer); };
  }, []);

  // count down between two checks
  useEffect(() => {
    if (left === null) return;
    const t = window.setInterval(() => setLeft((x) => (x === null ? x : Math.max(0, x - 1))), 1000);
    return () => clearInterval(t);
  }, [left === null]);

  if (left === null) return null;
  const mm = Math.floor(left / 60), ss = left % 60;
  return (
    <div className="fixed inset-0 z-[130] backdrop grid place-items-center p-4">
      <div role="alertdialog" className="bg-white rounded-[22px] w-full max-w-sm p-6 space-y-4 text-center shadow-[0_30px_80px_rgba(30,20,100,.35)]">
        <div className="text-4xl">⏳</div>
        <p className="font-bold">نشست شما رو به پایان است</p>
        <p className="text-sm text-slate-500">به‌دلیل بی‌فعالیتی، تا <b dir="ltr">{mm.toLocaleString('fa-IR')}:{String(ss).padStart(2, '0').replace(/\d/g, (d) => Number(d).toLocaleString('fa-IR'))}</b> دیگر از سامانه خارج می‌شوید.</p>
        <button autoFocus className="w-full rounded-xl bg-blue-600 text-white py-2.5 font-semibold"
          onClick={() => api('POST', `${S}/activity`).then(() => setLeft(null)).catch(() => {})}>ادامه کار</button>
      </div>
    </div>
  );
}
