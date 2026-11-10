import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { statusesApi } from '../../api/tasks';
import { StatusLabel, type TaskStatusDef } from '../../api/types';

// Custom statuses: each counts as one of the four built-in statuses (reports and reminders keep working).
export function StatusesPage() {
  const [list, setList] = useState<TaskStatusDef[]>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState(1);
  const [color, setColor] = useState('#7c3aed');
  const [error, setError] = useState('');

  const load = useCallback(() => { statusesApi.list().then(setList).catch((e) => setError(e.message)); }, []);
  useEffect(load, [load]);

  async function act(fn: () => Promise<unknown>) {
    setError('');
    try { await fn(); load(); } catch (e) { setError((e as Error).message); }
  }
  async function add(e: FormEvent) {
    e.preventDefault();
    await act(async () => { await statusesApi.create({ name: name.trim(), category, color, sortOrder: list.length + 1 }); setName(''); });
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-bold">وضعیت‌های وظایف</h1>
      <p className="text-sm text-slate-500">هر وضعیت سفارشی در گزارش‌ها به‌عنوان یکی از چهار وضعیت پایه حساب می‌شود.</p>
      <form onSubmit={add} className="flex gap-2 items-center">
        <input className="border rounded-lg px-3 py-1.5 text-sm flex-1" placeholder="نام وضعیت (مثلاً در بازبینی)" value={name} onChange={(e) => setName(e.target.value)} />
        <select className="border rounded-lg px-2 py-1.5 text-sm" value={category} onChange={(e) => setCategory(Number(e.target.value))}>
          {Object.entries(StatusLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-8" />
        <button disabled={!name.trim()} className="rounded-lg bg-blue-600 text-white px-3 py-1.5 text-sm disabled:opacity-50">افزودن</button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ul className="bg-white rounded-xl border divide-y">
        {list.map((s) => (
          <li key={s.id} className="flex items-center gap-3 px-3 py-2 text-sm">
            <span className="size-3 rounded-full" style={{ background: s.color ?? '#94a3b8' }} />
            <span className={s.isActive ? '' : 'text-slate-400 line-through'}>{s.name}</span>
            <span className="text-slate-400">← {StatusLabel[s.category]}</span>
            <button className="ms-auto text-xs underline" onClick={() => act(() => statusesApi.update(s.id, { name: s.name, category: s.category, color: s.color, sortOrder: s.sortOrder, isActive: !s.isActive }))}>
              {s.isActive ? 'غیرفعال' : 'فعال'}
            </button>
            <button title="حذف" className="p-1 hover:text-red-600" onClick={() => confirm('حذف شود؟ وظایف این وضعیت، وضعیت پایه خود را نگه می‌دارند.') && act(() => statusesApi.remove(s.id))}><Trash2 size={16} /></button>
          </li>
        ))}
        {list.length === 0 && <li className="px-3 py-6 text-center text-slate-400">وضعیت سفارشی تعریف نشده است</li>}
      </ul>
    </div>
  );
}
