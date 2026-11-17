import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { CardFilterBar, useColumnFilters } from '../../ui/filters';
import { PRIORITY_OPTS, REQUEST_STATUS_OPTS } from '../../constants/enums';
import { requestsApi } from '../../api/tasks';
import { PriorityLabel, RequestStatusLabel, type RequestCategory, type TaskRequest } from '../../api/types';
import { Segmented, Select } from '../../ui/fields';

// My requests + a form to send a new one. The category decides who it is routed to; urgent (High) may go to someone else.
export function RequestsPage() {
  const [list, setList] = useState<TaskRequest[]>([]);
  const [cats, setCats] = useState<RequestCategory[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priority, setPriority] = useState(1);
  const [error, setError] = useState('');
  const cf = useColumnFilters('requests', list, [
    { key: 'q', kind: 'text', get: (r) => `${r.title} ${r.description ?? ''} ${r.decisionNote ?? ''}` },
    { key: 'st', kind: 'select', get: (r) => String(r.status), options: REQUEST_STATUS_OPTS },
    { key: 'pri', kind: 'select', get: (r) => String(r.priority), options: PRIORITY_OPTS },
    { key: 'cat', kind: 'select', get: (r) => r.categoryId ?? '', options: [{ value: '', label: 'بدون دسته' }, ...cats.map((c) => ({ value: c.id, label: c.name }))].filter((o) => o.value) },
    { key: 'd', kind: 'date', get: (r) => r.createdAtUtc },
  ]);

  const load = useCallback(() => { requestsApi.list(true).then(setList).catch((e) => setError(e.message)); }, []);
  useEffect(() => { load(); requestsApi.categories().then((c) => setCats(c.filter((x) => x.isActive))).catch(() => {}); }, [load]);

  async function submit(e: FormEvent) {
    e.preventDefault(); setError('');
    try { await requestsApi.submit({ title: title.trim(), description: description || undefined, categoryId: categoryId || undefined, priority }); setTitle(''); setDescription(''); load(); }
    catch (x) { setError((x as Error).message); }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-xl font-bold">درخواست‌های من</h1>
      <form onSubmit={submit} className="bg-white rounded-xl border p-3 space-y-2 text-sm">
        <input className="w-full border rounded-lg px-3 py-2" placeholder="عنوان درخواست" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="w-full border rounded-lg px-3 py-2" rows={2} placeholder="توضیحات" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="flex gap-2">
          <Select className="border rounded-lg px-2 py-1.5 flex-1" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">بدون دسته</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Segmented value={priority} onChange={setPriority} options={[{ value: 0, label: 'کم' }, { value: 1, label: 'متوسط' }, { value: 2, label: 'زیاد' }]} />
          <button disabled={!title.trim()} className="rounded-lg bg-blue-600 text-white px-4 py-1.5 disabled:opacity-50">ارسال</button>
        </div>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <CardFilterBar f={cf} total={list.length} labels={{ q: 'عنوان', st: 'وضعیت', pri: 'اولویت', cat: 'دسته', d: 'تاریخ' }} />
      <ul className="space-y-2">
        {cf.filtered.map((r) => (
          <li key={r.id} className="bg-white rounded-xl border p-3 text-sm space-y-1">
            <div className="flex items-center gap-2"><span className="font-medium">{r.title}</span>
              <span className={`text-xs ${r.status === 1 ? 'text-green-600' : r.status === 2 ? 'text-red-600' : 'text-amber-600'}`}>{RequestStatusLabel[r.status]}</span>
              <span className="ms-auto text-xs text-slate-400">{new Date(r.createdAtUtc).toLocaleDateString('fa-IR')}</span></div>
            <div className="text-slate-500 text-xs">{r.categoryName ?? 'بدون دسته'} · {PriorityLabel[r.priority]}{r.routedTo ? ` · ارجاع به ${r.routedTo.displayName}` : ''}</div>
            {r.decisionNote && <div className="text-xs text-slate-600">توضیح: {r.decisionNote}</div>}
          </li>
        ))}
        {cf.filtered.length === 0 && <li className="bg-white rounded-xl border px-3 py-8 text-center text-slate-400">درخواستی ثبت نشده است</li>}
      </ul>
    </div>
  );
}
