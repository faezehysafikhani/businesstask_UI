import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { listUsers, requestsApi } from '../../api/tasks';
import { PriorityLabel, type RequestCategory } from '../../api/types';

// Request categories and their routing: who gets a request of the category, and who gets it when it is urgent (High).
export function CategoriesPage() {
  const [cats, setCats] = useState<RequestCategory[]>([]);
  const [users, setUsers] = useState<{ id: string; displayName: string }[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const load = useCallback(() => { requestsApi.categories().then(setCats).catch((e) => setError(e.message)); }, []);
  useEffect(() => { load(); listUsers().then(setUsers).catch(() => {}); }, [load]);

  async function save(c: RequestCategory, patch: Partial<RequestCategory>) {
    setError('');
    const n = { ...c, ...patch };
    try { await requestsApi.saveCategory(c.id, { name: n.name, routeToUserId: n.routeToUserId, urgentRouteToUserId: n.urgentRouteToUserId, defaultPriority: n.defaultPriority, isActive: n.isActive }); load(); }
    catch (e) { setError((e as Error).message); }
  }
  async function add(e: FormEvent) {
    e.preventDefault(); setError('');
    try { await requestsApi.saveCategory(null, { name: name.trim(), defaultPriority: 1, isActive: true }); setName(''); load(); } catch (x) { setError((x as Error).message); }
  }
  const UserSelect = ({ value, onChange }: { value?: string | null; onChange: (v: string | null) => void }) => (
    <select className="border rounded px-1 py-0.5 text-xs" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">—</option>{users.map((u) => <option key={u.id} value={u.id}>{u.displayName}</option>)}
    </select>
  );

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-xl font-bold">دسته‌بندی و ارجاع درخواست‌ها</h1>
      <form onSubmit={add} className="flex gap-2">
        <input className="flex-1 border rounded-lg px-3 py-1.5 text-sm" placeholder="نام دسته (مثلاً پشتیبانی)" value={name} onChange={(e) => setName(e.target.value)} />
        <button disabled={!name.trim()} className="rounded-lg bg-blue-600 text-white px-3 py-1.5 text-sm disabled:opacity-50">افزودن</button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ul className="bg-white rounded-xl border divide-y text-sm">
        {cats.map((c) => (
          <li key={c.id} className="p-3 flex flex-wrap items-center gap-3">
            <span className={`font-medium ${c.isActive ? '' : 'line-through text-slate-400'}`}>{c.name}</span>
            <label className="text-xs flex items-center gap-1">ارجاع به <UserSelect value={c.routeToUserId} onChange={(v) => save(c, { routeToUserId: v })} /></label>
            <label className="text-xs flex items-center gap-1">فوری به <UserSelect value={c.urgentRouteToUserId} onChange={(v) => save(c, { urgentRouteToUserId: v })} /></label>
            <select className="border rounded px-1 py-0.5 text-xs" value={c.defaultPriority} onChange={(e) => save(c, { defaultPriority: Number(e.target.value) })}>
              {Object.entries(PriorityLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <button className="ms-auto text-xs underline" onClick={() => save(c, { isActive: !c.isActive })}>{c.isActive ? 'غیرفعال' : 'فعال'}</button>
          </li>
        ))}
        {cats.length === 0 && <li className="p-6 text-center text-slate-400">دسته‌ای تعریف نشده است</li>}
      </ul>
    </div>
  );
}
