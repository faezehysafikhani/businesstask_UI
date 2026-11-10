import { useCallback, useEffect, useState } from 'react';
import { Archive, ArchiveRestore, Pencil, Plus } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { tasksApi } from '../../api/tasks';
import { PriorityLabel, StatusLabel, type Paged, type TaskListItem } from '../../api/types';
import { TaskForm } from './TaskForm';

export function TasksPage() {
  const { can } = useAuth();
  const [archived, setArchived] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<TaskListItem> | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState<{ id?: string } | null>(null);

  const load = useCallback(() => {
    tasksApi.list({ pageNumber: page, pageSize: 20, search: search || undefined, archived }).then(setData).catch((e) => setError(e.message));
  }, [page, search, archived]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  async function act(fn: () => Promise<unknown>) {
    setError('');
    try { await fn(); load(); } catch (e) { setError((e as Error).message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold">وظایف</h1>
        <div className="flex rounded-lg border bg-white text-sm overflow-hidden">
          {[false, true].map((a) => (
            <button key={String(a)} onClick={() => { setArchived(a); setPage(1); }} className={`px-3 py-1.5 ${archived === a ? 'bg-blue-600 text-white' : ''}`}>{a ? 'بایگانی' : 'فعال'}</button>
          ))}
        </div>
        <input className="border rounded-lg px-3 py-1.5 text-sm" placeholder="جستجو" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        {can('Tasks.Create') && !archived && (
          <button onClick={() => setForm({})} className="ms-auto flex items-center gap-1 rounded-lg bg-blue-600 text-white px-3 py-1.5 text-sm"><Plus size={16} /> وظیفه جدید</button>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500"><tr>
            {['عنوان', 'وضعیت', 'اولویت', 'سررسید', 'مسئول', ''].map((h) => <th key={h} className="text-start px-3 py-2 font-normal">{h}</th>)}
          </tr></thead>
          <tbody>
            {data?.items.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="px-3 py-2">{t.title}</td>
                <td className="px-3 py-2">{StatusLabel[t.status]}</td>
                <td className="px-3 py-2">{PriorityLabel[t.priority]}</td>
                <td className="px-3 py-2">{new Date(t.dueDate).toLocaleDateString('fa-IR')}</td>
                <td className="px-3 py-2">{t.assignedUser?.displayName ?? '—'}</td>
                <td className="px-3 py-2 text-end whitespace-nowrap">
                  {can('Tasks.Edit') && !archived && <button title="ویرایش" onClick={() => setForm({ id: t.id })} className="p-1 hover:text-blue-600"><Pencil size={16} /></button>}
                  {can('Tasks.Edit') && (archived
                    ? <button title="بازیابی" onClick={() => act(() => tasksApi.restore(t.id))} className="p-1 hover:text-green-600"><ArchiveRestore size={16} /></button>
                    : <button title="بایگانی" onClick={() => confirm('این وظیفه بایگانی شود؟') && act(() => tasksApi.archive(t.id))} className="p-1 hover:text-amber-600"><Archive size={16} /></button>)}
                </td>
              </tr>
            ))}
            {data && data.items.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400">موردی نیست</td></tr>}
          </tbody>
        </table>
      </div>
      {data && data.totalPages > 1 && (
        <div className="flex gap-2 items-center text-sm">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="border rounded px-2 py-1 disabled:opacity-40">قبلی</button>
          <span>{page} / {data.totalPages}</span>
          <button disabled={page >= data.totalPages} onClick={() => setPage(page + 1)} className="border rounded px-2 py-1 disabled:opacity-40">بعدی</button>
        </div>
      )}
      {form && <TaskForm taskId={form.id} onClose={() => setForm(null)} onSaved={() => { setForm(null); load(); }} />}
    </div>
  );
}
