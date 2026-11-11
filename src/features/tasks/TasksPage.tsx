import { useCallback, useEffect, useState } from 'react';
import { Archive, ArchiveRestore, ListTodo, Pencil, Plus, SendHorizontal } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { tasksApi } from '../../api/tasks';
import { PriorityLabel, ReviewLabel, type Paged, type TaskListItem } from '../../api/types';
import { useStatuses, type StatusOption } from './useStatuses';
import { TaskForm } from './TaskForm';
import { PlanningModal } from './PlanningModal';

export function TasksPage() {
  const { can } = useAuth();
  const statuses = useStatuses();
  const [board, setBoard] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [quick, setQuick] = useState('');
  const [planning, setPlanning] = useState<TaskListItem | null>(null);
  const [archived, setArchived] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<TaskListItem> | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState<{ id?: string } | null>(null);

  const load = useCallback(() => {
    tasksApi.list({ pageNumber: page, pageSize: board ? 200 : 20, search: search || undefined, archived }).then(setData).catch((e) => setError(e.message));
  }, [page, search, archived, board]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  async function bulk(b: Omit<Parameters<typeof tasksApi.bulk>[0], 'ids'>) {
    setError('');
    try {
      const r = await tasksApi.bulk({ ids: [...selected], ...b });
      if (r.failed.length) setError(`${r.failed.length} مورد انجام نشد: ${r.failed[0].message}`);
      setSelected(new Set()); load();
    } catch (e) { setError((e as Error).message); }
  }
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  async function act(fn: () => Promise<unknown>) {
    setError('');
    try { await fn(); load(); } catch (e) { setError((e as Error).message); }
  }

  const StatusSelect = ({ t }: { t: TaskListItem }) => (
    <select
      disabled={archived || !can('Tasks.Edit')}
      className="border rounded px-1 py-0.5 text-xs bg-white"
      style={{ borderColor: statuses.colorOf(t.customStatusId) ?? undefined }}
      value={statuses.keyOf(t.status, t.customStatusId)}
      onChange={(e) => { const o = statuses.options.find((x: StatusOption) => x.key === e.target.value); if (o) act(() => tasksApi.setStatus(t.id, o.payload)); }}
    >
      {statuses.options.map((o: StatusOption) => <option key={o.key} value={o.key}>{o.label}</option>)}
    </select>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold">وظایف</h1>
        <div className="flex rounded-lg border bg-white text-sm overflow-hidden">
          {[false, true].map((a) => (
            <button key={String(a)} onClick={() => { setArchived(a); setPage(1); setSelected(new Set()); }} className={`px-3 py-1.5 ${archived === a ? 'bg-blue-600 text-white' : ''}`}>{a ? 'بایگانی' : 'فعال'}</button>
          ))}
        </div>
        <div className="flex rounded-lg border bg-white text-sm overflow-hidden">
          {[false, true].map((b) => (
            <button key={String(b)} onClick={() => setBoard(b)} className={`px-3 py-1.5 ${board === b ? 'bg-slate-800 text-white' : ''}`}>{b ? 'بورد' : 'لیست'}</button>
          ))}
        </div>
        <input className="border rounded-lg px-3 py-1.5 text-sm" placeholder="جستجو" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        {can('Tasks.Create') && !archived && (
          <button onClick={() => setForm({})} className="ms-auto flex items-center gap-1 rounded-lg bg-blue-600 text-white px-3 py-1.5 text-sm"><Plus size={16} /> وظیفه جدید</button>
        )}
      </div>
      {can('Tasks.Create') && !archived && (
        <form onSubmit={(e) => { e.preventDefault(); const t = quick.trim(); if (t) act(async () => { await tasksApi.quick(t); setQuick(''); }); }}>
          <input className="w-full border rounded-lg px-3 py-2 text-sm bg-white" placeholder="ثبت سریع: عنوان را بنویس و Enter بزن" value={quick} onChange={(e) => setQuick(e.target.value)} />
        </form>
      )}
      {selected.size > 0 && can('Tasks.Edit') && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-sm">
          <span>{selected.size} انتخاب شده</span>
          {!archived && (
            <>
              <select className="border rounded px-1 py-0.5 bg-white" value="" onChange={(e) => { const o = statuses.options.find((x: StatusOption) => x.key === e.target.value); if (o) bulk('status' in o.payload ? { action: 'Status', status: o.payload.status } : { action: 'CustomStatus', customStatusId: o.payload.customStatusId }); }}>
                <option value="">تغییر وضعیت…</option>
                {statuses.options.map((o: StatusOption) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
              <select className="border rounded px-1 py-0.5 bg-white" value="" onChange={(e) => e.target.value && bulk({ action: 'Priority', priority: Number(e.target.value) })}>
                <option value="">تغییر اولویت…</option>
                {Object.entries(PriorityLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </>
          )}
          <button className="underline" onClick={() => confirm(archived ? 'بازیابی شوند؟' : 'بایگانی شوند؟') && bulk({ action: archived ? 'Restore' : 'Archive' })}>{archived ? 'بازیابی' : 'بایگانی'}</button>
          <button className="ms-auto underline text-slate-500" onClick={() => setSelected(new Set())}>لغو انتخاب</button>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {board ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {statuses.options.map((o: StatusOption) => {
            const items = data?.items.filter((t) => statuses.keyOf(t.status, t.customStatusId) === o.key) ?? [];
            return (
              <div key={o.key} className="w-64 shrink-0 bg-slate-100 rounded-xl p-2 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium px-1">
                  <span className="size-2.5 rounded-full" style={{ background: o.color ?? '#94a3b8' }} />{o.label}<span className="text-slate-400 ms-auto">{items.length}</span>
                </div>
                {items.map((t) => (
                  <div key={t.id} className="bg-white rounded-lg border p-2 text-sm space-y-1">
                    <div>{t.title}</div>
                    <div className="flex items-center gap-2 text-xs text-slate-500"><span>{PriorityLabel[t.priority]}</span><span>{new Date(t.dueDate).toLocaleDateString('fa-IR')}</span></div>
                    <StatusSelect t={t} />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500"><tr>
            <th className="px-3 py-2 w-8"><input type="checkbox" aria-label="همه" checked={!!data?.items.length && data.items.every((t) => selected.has(t.id))} onChange={(e) => setSelected(e.target.checked ? new Set(data?.items.map((t) => t.id)) : new Set())} /></th>
            {['عنوان', 'وضعیت', 'اولویت', 'سررسید', 'مسئول', ''].map((h) => <th key={h} className="text-start px-3 py-2 font-normal">{h}</th>)}
          </tr></thead>
          <tbody>
            {data?.items.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="px-3 py-2"><input type="checkbox" checked={selected.has(t.id)} onChange={() => toggle(t.id)} /></td>
                <td className="px-3 py-2">{t.title}</td>
                <td className="px-3 py-2"><StatusSelect t={t} />{!!t.reviewStatus && <span className={`ms-2 text-xs ${t.reviewStatus === 3 ? 'text-red-600' : t.reviewStatus === 1 ? 'text-amber-600' : 'text-green-600'}`}>{ReviewLabel[t.reviewStatus]}</span>}</td>
                <td className="px-3 py-2">{PriorityLabel[t.priority]}</td>
                <td className="px-3 py-2">{new Date(t.dueDate).toLocaleDateString('fa-IR')}</td>
                <td className="px-3 py-2">{t.assignedUser?.displayName ?? '—'}</td>
                <td className="px-3 py-2 text-end whitespace-nowrap">
                  {!archived && <button title="برنامه‌ریزی (وابستگی، معیار پذیرش)" onClick={() => setPlanning(t)} className="p-1 hover:text-teal-600"><ListTodo size={16} /></button>}
                  {can('Tasks.Edit') && !archived && t.status !== 3 && t.reviewStatus !== 1 && <button title="ارسال برای بازبینی" onClick={() => { const c = prompt('توضیح برای بازبین (اختیاری)'); if (c !== null) act(() => tasksApi.submitReview(t.id, c || undefined)); }} className="p-1 hover:text-purple-600"><SendHorizontal size={16} /></button>}
                  {can('Tasks.Edit') && !archived && <button title="ویرایش" onClick={() => setForm({ id: t.id })} className="p-1 hover:text-blue-600"><Pencil size={16} /></button>}
                  {can('Tasks.Edit') && (archived
                    ? <button title="بازیابی" onClick={() => act(() => tasksApi.restore(t.id))} className="p-1 hover:text-green-600"><ArchiveRestore size={16} /></button>
                    : <button title="بایگانی" onClick={() => confirm('این وظیفه بایگانی شود؟') && act(() => tasksApi.archive(t.id))} className="p-1 hover:text-amber-600"><Archive size={16} /></button>)}
                </td>
              </tr>
            ))}
            {data && data.items.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-400">موردی نیست</td></tr>}
          </tbody>
        </table>
      </div>
      )}
      {!board && data && data.totalPages > 1 && (
        <div className="flex gap-2 items-center text-sm">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="border rounded px-2 py-1 disabled:opacity-40">قبلی</button>
          <span>{page} / {data.totalPages}</span>
          <button disabled={page >= data.totalPages} onClick={() => setPage(page + 1)} className="border rounded px-2 py-1 disabled:opacity-40">بعدی</button>
        </div>
      )}
      {planning && <PlanningModal task={planning} onClose={() => setPlanning(null)} onChanged={load} />}
      {form && <TaskForm taskId={form.id} onClose={() => setForm(null)} onSaved={() => { setForm(null); load(); }} />}
    </div>
  );
}
