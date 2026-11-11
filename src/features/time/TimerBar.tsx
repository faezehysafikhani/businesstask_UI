import { useCallback, useEffect, useState } from 'react';
import { Square } from 'lucide-react';
import { timeApi } from '../../api/tasks';
import { fmtMinutes, type RunningTimer } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';

// The running timer, shown on every page; the start button is on each task row. Stopping logs the elapsed time.
export function TimerBar() {
  const { can } = useAuth();
  const [timer, setTimer] = useState<RunningTimer | null>(null);
  const [now, setNow] = useState(Date.now());
  const load = useCallback(() => { timeApi.timer().then(setTimer).catch(() => setTimer(null)); }, []);
  useEffect(() => {
    if (!can('Timesheets.Log')) return;
    load();
    const poll = setInterval(load, 30000);
    const tick = setInterval(() => setNow(Date.now()), 15000);
    window.addEventListener('timer-changed', load);
    return () => { clearInterval(poll); clearInterval(tick); window.removeEventListener('timer-changed', load); };
  }, [can, load]);
  if (!timer) return null;
  const minutes = Math.max(0, Math.floor((now - new Date(timer.startedAtUtc).getTime()) / 60000));
  return (
    <div className="flex items-center gap-3 bg-emerald-50 border-b border-emerald-200 px-4 py-1.5 text-sm">
      <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
      <span>تایمر روشن: <b>{timer.taskTitle ?? 'وظیفه'}</b></span>
      <span dir="ltr">{fmtMinutes(minutes)}</span>
      <button className="ms-auto flex items-center gap-1 rounded-lg bg-emerald-600 text-white px-3 py-0.5" onClick={() => timeApi.stop().then(() => { setTimer(null); window.dispatchEvent(new Event('timer-changed')); }).catch(() => load())}><Square size={12} /> توقف و ثبت</button>
    </div>
  );
}
