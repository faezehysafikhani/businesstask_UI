import { useCallback, useEffect, useState } from 'react';
import { requestsApi } from '../../api/tasks';
import { PriorityLabel, RequestStatusLabel, type TaskRequest } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';

// For request handlers: every request; convert a new one into a task or reject it with a note.
export function InboxPage() {
  const { me } = useAuth();
  const [list, setList] = useState<TaskRequest[]>([]);
  const [onlyNew, setOnlyNew] = useState(true);
  const [mineOnly, setMineOnly] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(() => { requestsApi.list(false).then(setList).catch((e) => setError(e.message)); }, []);
  useEffect(() => { load(); }, [load]);

  async function act(fn: () => Promise<unknown>) { setError(''); try { await fn(); load(); } catch (e) { setError((e as Error).message); } }
  const shown = list.filter((r) => (!onlyNew || r.status === 0) && (!mineOnly || r.routedTo?.id === me?.user.id));

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold">صندوق درخواست‌ها</h1>
        <label className="text-sm flex items-center gap-1"><input type="checkbox" checked={onlyNew} onChange={(e) => setOnlyNew(e.target.checked)} /> فقط در انتظار</label>
        <label className="text-sm flex items-center gap-1"><input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} /> ارجاع‌شده به من</label>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ul className="space-y-2">
        {shown.map((r) => (
          <li key={r.id} className="bg-white rounded-xl border p-3 text-sm space-y-2">
            <div className="flex items-center gap-2"><span className="font-medium">{r.title}</span><span className="text-xs text-slate-500">{RequestStatusLabel[r.status]}</span>
              <span className="ms-auto text-xs text-slate-400">{r.requester?.displayName}</span></div>
            {r.description && <p className="text-slate-600">{r.description}</p>}
            <div className="text-xs text-slate-500">{r.categoryName ?? 'بدون دسته'} · {PriorityLabel[r.priority]}{r.routedTo ? ` · ارجاع به ${r.routedTo.displayName}` : ''}{r.neededBy ? ` · تا ${new Date(r.neededBy).toLocaleDateString('fa-IR')}` : ''}</div>
            {r.status === 0 && (
              <div className="flex gap-2">
                <button className="rounded-lg bg-green-600 text-white px-3 py-1" onClick={() => act(() => requestsApi.convert(r.id, {}))}>تبدیل به وظیفه</button>
                <button className="rounded-lg bg-red-600 text-white px-3 py-1" onClick={() => { const n = prompt('دلیل رد (اختیاری)'); if (n !== null) act(() => requestsApi.reject(r.id, n || undefined)); }}>رد</button>
              </div>
            )}
          </li>
        ))}
        {shown.length === 0 && <li className="bg-white rounded-xl border px-3 py-8 text-center text-slate-400">درخواستی نیست</li>}
      </ul>
    </div>
  );
}
