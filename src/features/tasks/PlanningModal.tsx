import { useCallback, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { planningApi, tasksApi } from '../../api/tasks';
import { StatusLabel, type TaskListItem, type TaskPlanning } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { Modal } from '../../ui/Modal';

// Everything between a task and "done": what it waits for, what blocks it, its acceptance criteria, many subtasks at once.
export function PlanningModal({ task, onClose, onChanged }: { task: TaskListItem; onClose: () => void; onChanged: () => void }) {
  const { can } = useAuth();
  const [p, setP] = useState<TaskPlanning | null>(null);
  const [others, setOthers] = useState<TaskListItem[]>([]);
  const [blocker, setBlocker] = useState('');
  const [criterion, setCriterion] = useState('');
  const [lines, setLines] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const apply = (next: TaskPlanning) => { setP(next); setBlocker(next.blockedReason ?? ''); onChanged(); };
  const run = useCallback(async (fn: () => Promise<TaskPlanning | unknown>) => {
    setError(''); setMsg('');
    try { const r = await fn(); if (r && typeof r === 'object' && 'criteria' in r) apply(r as TaskPlanning); else { onChanged(); } }
    catch (e) { setError((e as Error).message); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    planningApi.get(task.id).then((r) => { setP(r); setBlocker(r.blockedReason ?? ''); }).catch((e) => setError(e.message));
    tasksApi.list({ pageSize: 200 }).then((r) => setOthers(r.items.filter((t) => t.id !== task.id))).catch(() => {});
  }, [task.id]);

  const edit = can('Tasks.Edit');
  return (
    <Modal title={`برنامه‌ریزی: ${task.title}`} onClose={onClose}>
      <div className="space-y-4 text-sm max-h-[70vh] overflow-y-auto">
        {p && !p.canComplete && <p className="rounded-lg bg-amber-50 text-amber-800 px-3 py-2">این وظیفه تا برطرف شدن موارد زیر انجام‌شده نمی‌شود.</p>}

        <section className="space-y-1">
          <h3 className="font-medium">مانع</h3>
          <div className="flex gap-2">
            <input className="flex-1 border rounded-lg px-2 py-1" disabled={!edit} placeholder="مثلاً منتظر پاسخ تأمین‌کننده" value={blocker} onChange={(e) => setBlocker(e.target.value)} />
            {edit && <button className="border rounded-lg px-2" onClick={() => run(() => planningApi.setBlocker(task.id, blocker.trim() || null))}>ثبت</button>}
          </div>
        </section>

        <section className="space-y-1">
          <h3 className="font-medium">وابسته به (باید قبل از این تمام شوند)</h3>
          <ul className="space-y-1">
            {p?.blockedBy.map((b) => (
              <li key={b.id} className="flex items-center gap-2"><span className={b.isDone ? 'line-through text-slate-400' : ''}>{b.title}</span><span className="text-xs text-slate-400">{StatusLabel[b.status]}</span>
                {edit && <button className="ms-auto p-1 hover:text-red-600" onClick={() => run(() => planningApi.removeDependency(task.id, b.id))}><Trash2 size={14} /></button>}</li>
            ))}
            {p && p.blockedBy.length === 0 && <li className="text-slate-400">وابستگی ندارد</li>}
          </ul>
          {edit && (
            <select className="border rounded-lg px-2 py-1 w-full" value="" onChange={(e) => e.target.value && run(() => planningApi.addDependency(task.id, e.target.value))}>
              <option value="">افزودن وابستگی…</option>
              {others.filter((o) => !p?.blockedBy.some((b) => b.id === o.id)).map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
            </select>
          )}
          {p && p.blocking.length > 0 && <p className="text-xs text-slate-500">منتظر این وظیفه‌اند: {p.blocking.map((b) => b.title).join('، ')}</p>}
        </section>

        <section className="space-y-1">
          <h3 className="font-medium">معیارهای پذیرش</h3>
          <ul className="space-y-1">
            {p?.criteria.map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                <input type="checkbox" checked={c.isMet} disabled={!edit} onChange={(e) => run(() => planningApi.setMet(task.id, c.id, e.target.checked))} />
                <span className={c.isMet ? 'line-through text-slate-400' : ''}>{c.text}</span>
                {edit && <button className="ms-auto p-1 hover:text-red-600" onClick={() => run(() => planningApi.deleteCriterion(task.id, c.id))}><Trash2 size={14} /></button>}
              </li>
            ))}
            {p && p.criteria.length === 0 && <li className="text-slate-400">معیاری تعریف نشده</li>}
          </ul>
          {edit && (
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (criterion.trim()) { run(() => planningApi.addCriterion(task.id, criterion.trim())); setCriterion(''); } }}>
              <input className="flex-1 border rounded-lg px-2 py-1" placeholder="معیار جدید" value={criterion} onChange={(e) => setCriterion(e.target.value)} />
              <button className="border rounded-lg px-2">افزودن</button>
            </form>
          )}
        </section>

        {edit && (
          <section className="space-y-1">
            <h3 className="font-medium">زیرکار انبوه (هر خط یک زیرکار)</h3>
            <textarea className="w-full border rounded-lg px-2 py-1" rows={3} value={lines} onChange={(e) => setLines(e.target.value)} />
            <button className="border rounded-lg px-3 py-1" disabled={!lines.trim()} onClick={() => run(async () => { await planningApi.addSubTasks(task.id, lines.split('\n')); setLines(''); setMsg('زیرکارها اضافه شد'); })}>افزودن</button>
          </section>
        )}

        {can('Tasks.ManageTemplates') && (
          <button className="underline" onClick={() => { const n = prompt('نام قالب'); if (n?.trim()) run(async () => { await planningApi.saveAsTemplate(task.id, n.trim()); setMsg('قالب ذخیره شد'); }); }}>ذخیره به‌عنوان قالب</button>
        )}
        {msg && <p className="text-green-700">{msg}</p>}
        {error && <p className="text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}
