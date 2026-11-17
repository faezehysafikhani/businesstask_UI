import { useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import { listUsers, tasksApi } from '../../api/tasks';
import { useAuth } from '../../auth/AuthContext';
import { PriorityLabel, type TaskDetail } from '../../api/types';
import { Modal } from '../../ui/Modal';
import { DateInput } from '../../ui/dates';
import { Segmented, Select } from '../../ui/fields';

// Create (taskId undefined) or edit. Edit sends the rowVersion it read; a 409 means someone else
// saved first: we show it, reload the fresh task and the user can retry (phase 2 behaviour).
export function TaskForm({ taskId, onClose, onSaved }: { taskId?: string; onClose: () => void; onSaved: () => void }) {
  const { me } = useAuth();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [assignee, setAssignee] = useState(me?.user.id ?? '');
  const [users, setUsers] = useState<{ id: string; displayName: string }[]>(me ? [{ id: me.user.id, displayName: me.user.displayName }] : []);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [priority, setPriority] = useState(1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const fill = (t: TaskDetail) => {
    setTask(t); setAssignee(t.assignedUser?.id ?? t.responsibleUsers?.[0]?.id ?? me?.user.id ?? ''); setTitle(t.title); setDescription(t.description ?? ''); setDueDate(t.dueDate); setPriority(t.priority);
  };
  // Whoever may list users picks from them; everyone else gives the task to themselves.
  useEffect(() => { listUsers().then((l) => l.length && setUsers(l)).catch(() => {}); }, []);
  useEffect(() => { if (taskId) tasksApi.get(taskId).then(fill).catch((e) => setError(e.message)); }, [taskId]);

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const body = { title: title.trim(), dueDate, priority, description: description || null, assignedUserId: assignee || undefined };
      // An edit replaces the task as sent, so what the form does not show goes back as it was read.
      if (taskId && task) await tasksApi.update(taskId, {
        ...body, isProject: task.isProject, dueTime: task.dueTime, assigneeUserIds: task.assignees?.map((a) => a.id), allowAssigneeStatusUpdate: task.allowAssigneeStatusUpdate ?? true,
        charterDescription: task.charterDescription, charterProjectManager: task.charterProjectManager, charterStartDate: task.charterStartDate, charterEndDate: task.charterEndDate,
        rowVersion: task.rowVersion,
      });
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
        <input className="w-full border rounded-lg px-3 py-2" aria-label="عنوان" placeholder="عنوان" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        <textarea className="w-full border rounded-lg px-3 py-2" aria-label="توضیحات" placeholder="توضیحات" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        <label className="block text-sm">مسئول
          <Select label="مسئول" className="mt-1 w-full border rounded-lg px-3 py-2" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            {users.map((u) => <option key={u.id} value={u.id}>{u.displayName}</option>)}
          </Select>
        </label>
        <div className="flex gap-2">
          <DateInput label="سررسید" className="flex-1 border rounded-lg px-3 py-2" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          <Segmented value={priority} onChange={setPriority} options={[{ value: 0, label: 'کم' }, { value: 1, label: 'متوسط' }, { value: 2, label: 'زیاد' }]} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={busy || !title.trim() || !assignee} className="w-full rounded-lg bg-blue-600 text-white py-2 disabled:opacity-50">ذخیره</button>
      </form>
    </Modal>
  );
}
