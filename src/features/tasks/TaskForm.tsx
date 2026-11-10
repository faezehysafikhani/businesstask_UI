import { useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import { tasksApi } from '../../api/tasks';
import { PriorityLabel, type TaskDetail } from '../../api/types';
import { Modal } from '../../ui/Modal';

// Create (taskId undefined) or edit. Edit sends the rowVersion it read; a 409 means someone else
// saved first: we show it, reload the fresh task and the user can retry (phase 2 behaviour).
export function TaskForm({ taskId, onClose, onSaved }: { taskId?: string; onClose: () => void; onSaved: () => void }) {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [priority, setPriority] = useState(1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const fill = (t: TaskDetail) => {
    setTask(t); setTitle(t.title); setDescription(t.description ?? ''); setDueDate(t.dueDate); setPriority(t.priority);
  };
  useEffect(() => { if (taskId) tasksApi.get(taskId).then(fill).catch((e) => setError(e.message)); }, [taskId]);

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const body = { title: title.trim(), dueDate, priority, description: description || null };
      if (taskId) await tasksApi.update(taskId, { ...body, rowVersion: task?.rowVersion });
      else await tasksApi.create({ ...body, description: description || undefined });
      onSaved();
    } catch (x) {
      if (x instanceof ApiError && x.isConflict && taskId) {
        setError('این وظیفه همزمان توسط شخص دیگری تغییر کرد. آخرین نسخه بارگذاری شد؛ تغییرات خود را دوباره بررسی و ذخیره کنید.');
        tasksApi.get(taskId).then(fill).catch(() => {});
      } else setError(x instanceof ApiError ? x.message : 'خطا در ذخیره');
    } finally { setBusy(false); }
  }

  return (
    <Modal title={taskId ? 'ویرایش وظیفه' : 'وظیفه جدید'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <input className="w-full border rounded-lg px-3 py-2" placeholder="عنوان" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        <textarea className="w-full border rounded-lg px-3 py-2" placeholder="توضیحات" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="flex gap-2">
          <input type="date" className="flex-1 border rounded-lg px-3 py-2" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          <select className="border rounded-lg px-3 py-2" value={priority} onChange={(e) => setPriority(Number(e.target.value))}>
            {Object.entries(PriorityLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={busy || !title.trim()} className="w-full rounded-lg bg-blue-600 text-white py-2 disabled:opacity-50">ذخیره</button>
      </form>
    </Modal>
  );
}
