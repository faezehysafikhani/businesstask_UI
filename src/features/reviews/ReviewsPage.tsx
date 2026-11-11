import { useCallback, useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { TASK_REVIEW, TIMESHEET, tasksApi, timeApi, workflowApi } from '../../api/tasks';
import { fmtMinutes, type ReviewItem, type TimesheetReviewItem, type WorkflowInstance } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';

// "My reviews": the approvals waiting for me (Workflow approval center) joined with the task they are about.
export function ReviewsPage() {
  const { can } = useAuth();
  const [rows, setRows] = useState<{ instance: WorkflowInstance; task?: ReviewItem; sheet?: TimesheetReviewItem }[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const all = await workflowApi.pending();
      const pending = all.filter((i) => i.subjectType === TASK_REVIEW);
      const sheetsPending = all.filter((i) => i.subjectType === TIMESHEET);
      const tasks = pending.length ? await tasksApi.inReview(pending.map((i) => i.subjectId)) : [];
      const sheets = sheetsPending.length ? await timeApi.inReview(sheetsPending.map((i) => i.subjectId)) : [];
      setRows([
        ...pending.map((instance) => ({ instance, task: tasks.find((t) => t.id === instance.subjectId) })),
        ...sheetsPending.map((instance) => ({ instance, sheet: sheets.find((s) => s.id === instance.subjectId) })),
      ]);
    } catch (e) { setError((e as Error).message); } finally { setLoaded(true); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function decide(id: string, approve: boolean) {
    setError('');
    try { await (approve ? workflowApi.approve : workflowApi.reject)(id, notes[id]?.trim() || undefined); await load(); }
    catch (e) { setError((e as Error).message); }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-xl font-bold">بازبینی‌های من</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ul className="space-y-2">
        {rows.map(({ instance, task, sheet }) => (
          <li key={instance.id} className="bg-white rounded-xl border p-3 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">{sheet ? `ساعت کاری ${sheet.user?.displayName ?? ''}` : (task?.title ?? 'وظیفه')}</span>
              {sheet && <span className="text-slate-500">هفته از {new Date(sheet.weekStart).toLocaleDateString('fa-IR')} · <b dir="ltr">{fmtMinutes(sheet.totalMinutes)}</b></span>}
              {task?.dueDate && <span className="text-slate-400">سررسید {new Date(task.dueDate).toLocaleDateString('fa-IR')}</span>}
              <span className="ms-auto text-xs text-slate-400">مرحله {instance.currentStepOrder} از {instance.totalSteps}</span>
            </div>
            {task?.submittedBy && <div className="text-slate-500">ارسال‌کننده: {task.submittedBy.displayName}{task.comment ? ` — «${task.comment}»` : ''}</div>}
            <div className="flex gap-2 items-center">
              <input className="flex-1 border rounded-lg px-3 py-1.5" placeholder="توضیح (اختیاری)" value={notes[instance.id] ?? ''} onChange={(e) => setNotes({ ...notes, [instance.id]: e.target.value })} />
              {can('Workflow.Approve') && <button onClick={() => decide(instance.id, true)} className="flex items-center gap-1 rounded-lg bg-green-600 text-white px-3 py-1.5"><Check size={14} /> تأیید</button>}
              {can('Workflow.Reject') && <button onClick={() => decide(instance.id, false)} className="flex items-center gap-1 rounded-lg bg-red-600 text-white px-3 py-1.5"><X size={14} /> بازگشت برای بازکاری</button>}
            </div>
          </li>
        ))}
        {loaded && rows.length === 0 && <li className="bg-white rounded-xl border px-3 py-8 text-center text-slate-400">بازبینی در انتظار شما نیست</li>}
      </ul>
    </div>
  );
}
