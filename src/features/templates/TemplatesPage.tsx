import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { templatesApi } from '../../api/tasks';
import { PriorityLabel, type TaskTemplate } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';

const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

// Task and project templates: make a task from one, or define a new one.
export function TemplatesPage() {
  const { can } = useAuth();
  const [list, setList] = useState<TaskTemplate[]>([]);
  const [f, setF] = useState({ name: '', title: '', description: '', priority: 1, isProject: false, dueInDays: 7, subTasks: '', criteria: '', tags: '' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const load = useCallback(() => { templatesApi.list().then(setList).catch((e) => setError(e.message)); }, []);
  useEffect(load, [load]);

  async function act(fn: () => Promise<unknown>, ok?: string) { setError(''); setMsg(''); try { await fn(); if (ok) setMsg(ok); load(); } catch (e) { setError((e as Error).message); } }
  function create(e: FormEvent) {
    e.preventDefault();
    act(async () => {
      await templatesApi.create(f.name.trim(), { title: f.title.trim() || f.name.trim(), description: f.description || null, priority: f.priority, isProject: f.isProject, dueInDays: f.dueInDays, subTasks: lines(f.subTasks), criteria: lines(f.criteria), tags: f.tags.split(/[,،]/).map((t) => t.trim()).filter(Boolean) });
      setF({ ...f, name: '', title: '', description: '', subTasks: '', criteria: '', tags: '' });
    });
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-xl font-bold">قالب‌های وظیفه و پروژه</h1>
      {msg && <p className="text-sm text-green-700">{msg}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ul className="bg-white rounded-xl border divide-y text-sm">
        {list.map((t) => (
          <li key={t.id} className="p-3 flex items-center gap-3">
            <div><div className="font-medium">{t.name}{t.isProject && <span className="ms-2 text-xs text-purple-600">پروژه</span>}</div>
              <div className="text-xs text-slate-500">{t.body.title} · {PriorityLabel[t.body.priority]} · {t.body.subTasks.length} زیرکار · {t.body.criteria.length} معیار</div></div>
            {can('Tasks.Create') && <button className="ms-auto rounded-lg bg-blue-600 text-white px-3 py-1" onClick={() => act(() => templatesApi.instantiate(t.id, {}), 'ساخته شد؛ در لیست وظایف است')}>ساخت از قالب</button>}
            {can('Tasks.ManageTemplates') && <button title="حذف" className="p-1 hover:text-red-600" onClick={() => confirm('حذف شود؟') && act(() => templatesApi.remove(t.id))}><Trash2 size={16} /></button>}
          </li>
        ))}
        {list.length === 0 && <li className="p-6 text-center text-slate-400">قالبی نیست</li>}
      </ul>
      {can('Tasks.ManageTemplates') && (
        <form onSubmit={create} className="bg-white rounded-xl border p-3 space-y-2 text-sm">
          <h2 className="font-medium">قالب جدید</h2>
          <div className="flex gap-2">
            <input className="flex-1 border rounded-lg px-2 py-1" placeholder="نام قالب" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <input className="flex-1 border rounded-lg px-2 py-1" placeholder="عنوان وظیفه" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          </div>
          <textarea className="w-full border rounded-lg px-2 py-1" rows={2} placeholder="توضیحات" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          <div className="flex gap-2 items-center">
            <select className="border rounded-lg px-2 py-1" value={f.priority} onChange={(e) => setF({ ...f, priority: Number(e.target.value) })}>{Object.entries(PriorityLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            <label className="flex items-center gap-1">سررسید بعد از <input type="number" min={0} className="w-16 border rounded px-1" value={f.dueInDays} onChange={(e) => setF({ ...f, dueInDays: Number(e.target.value) })} /> روز</label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={f.isProject} onChange={(e) => setF({ ...f, isProject: e.target.checked })} /> پروژه</label>
          </div>
          <textarea className="w-full border rounded-lg px-2 py-1" rows={3} placeholder="زیرکارها (هر خط یکی)" value={f.subTasks} onChange={(e) => setF({ ...f, subTasks: e.target.value })} />
          <textarea className="w-full border rounded-lg px-2 py-1" rows={2} placeholder="معیارهای پذیرش (هر خط یکی)" value={f.criteria} onChange={(e) => setF({ ...f, criteria: e.target.value })} />
          <input className="w-full border rounded-lg px-2 py-1" placeholder="برچسب‌ها (با ویرگول)" value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} />
          <button disabled={!f.name.trim()} className="rounded-lg bg-blue-600 text-white px-4 py-1.5 disabled:opacity-50">ذخیره قالب</button>
        </form>
      )}
    </div>
  );
}
