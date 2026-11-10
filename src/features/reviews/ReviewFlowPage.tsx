import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { TASK_REVIEW, workflowApi } from '../../api/tasks';

// The approval chain every "submit for review" goes through. Empty chain = no review: submitting completes the task.
const KEYS: Record<string, string> = { Owner: 'سازنده وظیفه', Manager: 'مدیر', Approver1: 'تأییدکننده ۱', Approver2: 'تأییدکننده ۲', Approver3: 'تأییدکننده ۳' };
interface Step { name: string; approverKey: string }

export function ReviewFlowPage() {
  const [steps, setSteps] = useState<Step[]>([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    workflowApi.definitions(TASK_REVIEW).then((defs) => {
      const general = defs.find((d) => d.isActive && (!d.scopeType || d.scopeType === 'General')) ?? defs[0];
      setSteps((general?.steps ?? []).map((s) => ({ name: s.name, approverKey: s.approverKey ?? 'Owner' })));
    }).catch((e) => setError(e.message));
  }, []);

  async function save() {
    setError(''); setMsg('');
    try { await workflowApi.setSteps(TASK_REVIEW, steps.map((s) => ({ name: s.name.trim() || 'بازبینی', approverKey: s.approverKey }))); setMsg('ذخیره شد'); }
    catch (e) { setError((e as Error).message); }
  }

  return (
    <div className="space-y-4 max-w-xl">
      <h1 className="text-xl font-bold">مسیر تأیید بازبینی وظیفه</h1>
      <p className="text-sm text-slate-500">اگر مسیر خالی باشد، «ارسال برای بازبینی» وظیفه را بلافاصله انجام‌شده می‌کند. فعلاً تأییدکننده بر پایه سازنده وظیفه تعیین می‌شود؛ مسیر مبتنی بر چارت سازمانی در فاز سازمان می‌آید.</p>
      <ul className="space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-2 items-center bg-white rounded-xl border p-2 text-sm">
            <span className="text-slate-400 w-5">{i + 1}</span>
            <input className="flex-1 border rounded-lg px-2 py-1" value={s.name} onChange={(e) => setSteps(steps.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="نام مرحله" />
            <select className="border rounded-lg px-2 py-1" value={s.approverKey} onChange={(e) => setSteps(steps.map((x, j) => j === i ? { ...x, approverKey: e.target.value } : x))}>
              {Object.entries(KEYS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <button title="حذف" onClick={() => setSteps(steps.filter((_, j) => j !== i))} className="p-1 hover:text-red-600"><Trash2 size={16} /></button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <button onClick={() => setSteps([...steps, { name: `مرحله ${steps.length + 1}`, approverKey: 'Owner' }])} className="flex items-center gap-1 border rounded-lg px-3 py-1.5 text-sm bg-white"><Plus size={14} /> مرحله</button>
        <button onClick={save} className="rounded-lg bg-blue-600 text-white px-4 py-1.5 text-sm">ذخیره</button>
      </div>
      {msg && <p className="text-sm text-green-700">{msg}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
