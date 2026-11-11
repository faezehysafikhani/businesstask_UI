import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { automationApi, listUsers } from '../../api/tasks';
import { ActionLabel, PriorityLabel, StatusLabel, TriggerLabel, type AutomationAction, type AutomationLog, type AutomationRule } from '../../api/types';

const PRIORITIES = ['Low', 'Medium', 'High'];
const STATUSES = ['Todo', 'InProgress', 'Paused', 'Completed'];
const prioLabel = (p: string) => PriorityLabel[PRIORITIES.indexOf(p)] ?? p;
const statusLabel = (s: string) => StatusLabel[STATUSES.indexOf(s)] ?? s;

function describe(a: AutomationAction, users: Record<string, string>) {
  switch (a.type) {
    case 'SetPriority': return `اولویت ← ${prioLabel(a.priority ?? '')}`;
    case 'SetStatus': return `وضعیت ← ${statusLabel(a.status ?? '')}`;
    case 'AssignUser': return `واگذاری به ${users[a.userId ?? ''] ?? '؟'}`;
    case 'AddTag': return `برچسب «${a.tag}»`;
    case 'StartSla': return `SLA ${a.hours} ساعت${a.businessDaysOnly ? ' (روز کاری)' : ''}`;
    case 'Notify': return `اطلاع به ${a.userId ? users[a.userId] ?? '؟' : 'سازنده'}`;
    default: return ActionLabel[a.type] ?? a.type;
  }
}

// Rules: when something happens to a task (trigger) and the conditions hold, the actions run. The log shows what ran.
export function AutomationPage() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [log, setLog] = useState<AutomationLog[]>([]);
  const [users, setUsers] = useState<{ id: string; displayName: string }[]>([]);
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState('TaskCreated');
  const [cond, setCond] = useState({ priority: '', status: '', titleContains: '' });
  const [actions, setActions] = useState<AutomationAction[]>([]);
  const [draft, setDraft] = useState<AutomationAction>({ type: 'AddTag' });
  const [error, setError] = useState('');
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.displayName]));

  const load = useCallback(() => {
    automationApi.rules().then(setRules).catch((e) => setError(e.message));
    automationApi.log().then(setLog).catch(() => {});
  }, []);
  useEffect(() => { load(); listUsers().then(setUsers).catch(() => {}); }, [load]);

  const draftOk = (a: AutomationAction) =>
    a.type === 'AssignManager' || a.type === 'Notify'
    || (a.type === 'SetPriority' && a.priority) || (a.type === 'SetStatus' && a.status) || (a.type === 'AssignUser' && a.userId)
    || (a.type === 'AddTag' && a.tag?.trim()) || (a.type === 'StartSla' && (a.hours ?? 0) > 0);

  async function act(fn: () => Promise<unknown>) { setError(''); try { await fn(); load(); } catch (e) { setError((e as Error).message); } }
  function create(e: FormEvent) {
    e.preventDefault();
    act(async () => {
      await automationApi.save(null, { name: name.trim(), trigger, conditions: { priority: cond.priority || null, status: cond.status || null, titleContains: cond.titleContains.trim() || null }, actions, isActive: true });
      setName(''); setActions([]); setCond({ priority: '', status: '', titleContains: '' });
    });
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <h1 className="text-xl font-bold">قاعده‌های خودکار و SLA</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ul className="bg-white rounded-xl border divide-y text-sm">
        {rules.map((r) => (
          <li key={r.id} className="p-3 space-y-1">
            <div className="flex items-center gap-2"><span className={`font-medium ${r.isActive ? '' : 'line-through text-slate-400'}`}>{r.name}</span>
              <span className="text-xs text-slate-500">وقتی: {TriggerLabel[r.trigger]}</span>
              <button className="ms-auto text-xs underline" onClick={() => act(() => automationApi.save(r.id, { name: r.name, trigger: r.trigger, conditions: r.conditions, actions: r.actions, sortOrder: r.sortOrder, isActive: !r.isActive }))}>{r.isActive ? 'غیرفعال' : 'فعال'}</button>
              <button title="حذف" className="p-1 hover:text-red-600" onClick={() => confirm('حذف شود؟') && act(() => automationApi.remove(r.id))}><Trash2 size={16} /></button></div>
            <div className="text-xs text-slate-500">
              {[r.conditions.priority && `اولویت ${prioLabel(r.conditions.priority)}`, r.conditions.status && `وضعیت ${statusLabel(r.conditions.status)}`, r.conditions.titleContains && `عنوان شامل «${r.conditions.titleContains}»`].filter(Boolean).join(' · ') || 'بدون شرط'}
              {' ⟵ '}{r.actions.map((a) => describe(a, userMap)).join('، ')}
            </div>
          </li>
        ))}
        {rules.length === 0 && <li className="p-6 text-center text-slate-400">قاعده‌ای تعریف نشده است</li>}
      </ul>

      <form onSubmit={create} className="bg-white rounded-xl border p-3 space-y-2 text-sm">
        <h2 className="font-medium">قاعده جدید</h2>
        <div className="flex gap-2">
          <input className="flex-1 border rounded-lg px-2 py-1" placeholder="نام قاعده" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="border rounded-lg px-2 py-1" value={trigger} onChange={(e) => setTrigger(e.target.value)}>{Object.entries(TriggerLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </div>
        <div className="flex flex-wrap gap-2 items-center"><span className="text-slate-500">شرط‌ها:</span>
          <select className="border rounded-lg px-2 py-1" value={cond.priority} onChange={(e) => setCond({ ...cond, priority: e.target.value })}><option value="">هر اولویت</option>{PRIORITIES.map((p) => <option key={p} value={p}>{prioLabel(p)}</option>)}</select>
          <select className="border rounded-lg px-2 py-1" value={cond.status} onChange={(e) => setCond({ ...cond, status: e.target.value })}><option value="">هر وضعیت</option>{STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}</select>
          <input className="border rounded-lg px-2 py-1" placeholder="عنوان شامل…" value={cond.titleContains} onChange={(e) => setCond({ ...cond, titleContains: e.target.value })} />
        </div>
        <div className="space-y-1"><span className="text-slate-500">اقدام‌ها:</span>
          {actions.map((a, i) => <div key={i} className="flex items-center gap-2"><span>• {describe(a, userMap)}</span><button type="button" className="text-red-600 text-xs" onClick={() => setActions(actions.filter((_, j) => j !== i))}>حذف</button></div>)}
          <div className="flex flex-wrap gap-2 items-center">
            <select className="border rounded-lg px-2 py-1" value={draft.type} onChange={(e) => setDraft({ type: e.target.value })}>{Object.entries(ActionLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            {draft.type === 'SetPriority' && <select className="border rounded-lg px-2 py-1" value={draft.priority ?? ''} onChange={(e) => setDraft({ ...draft, priority: e.target.value })}><option value="">…</option>{PRIORITIES.map((p) => <option key={p} value={p}>{prioLabel(p)}</option>)}</select>}
            {draft.type === 'SetStatus' && <select className="border rounded-lg px-2 py-1" value={draft.status ?? ''} onChange={(e) => setDraft({ ...draft, status: e.target.value })}><option value="">…</option>{STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}</select>}
            {(draft.type === 'AssignUser' || draft.type === 'Notify') && <select className="border rounded-lg px-2 py-1" value={draft.userId ?? ''} onChange={(e) => setDraft({ ...draft, userId: e.target.value || null })}><option value="">{draft.type === 'Notify' ? 'سازنده وظیفه' : 'کاربر…'}</option>{users.map((u) => <option key={u.id} value={u.id}>{u.displayName}</option>)}</select>}
            {draft.type === 'AddTag' && <input className="border rounded-lg px-2 py-1" placeholder="برچسب" value={draft.tag ?? ''} onChange={(e) => setDraft({ ...draft, tag: e.target.value })} />}
            {draft.type === 'StartSla' && <><input type="number" min={1} className="w-20 border rounded-lg px-2 py-1" placeholder="ساعت" value={draft.hours ?? ''} onChange={(e) => setDraft({ ...draft, hours: Number(e.target.value) })} /><label className="flex items-center gap-1"><input type="checkbox" checked={!!draft.businessDaysOnly} onChange={(e) => setDraft({ ...draft, businessDaysOnly: e.target.checked })} /> فقط روز کاری</label></>}
            <button type="button" disabled={!draftOk(draft)} className="border rounded-lg px-2 py-1 disabled:opacity-50" onClick={() => { setActions([...actions, draft]); setDraft({ type: 'AddTag' }); }}>افزودن اقدام</button>
          </div>
        </div>
        <button disabled={!name.trim() || actions.length === 0} className="rounded-lg bg-blue-600 text-white px-4 py-1.5 disabled:opacity-50">ذخیره قاعده</button>
      </form>

      <h2 className="font-medium">گزارش اجرا</h2>
      <ul className="bg-white rounded-xl border divide-y text-xs max-h-80 overflow-y-auto">
        {log.map((l) => <li key={l.id} className="px-3 py-1.5 flex gap-2"><span className={l.outcome === 'Applied' ? 'text-green-600' : 'text-red-600'}>{l.outcome === 'Applied' ? 'انجام شد' : 'ناموفق'}</span><span>{l.ruleName}</span><span className="text-slate-500">{l.detail}</span><span className="ms-auto text-slate-400">{new Date(l.atUtc).toLocaleString('fa-IR')}</span></li>)}
        {log.length === 0 && <li className="p-4 text-center text-slate-400">هنوز اجرایی نبوده است</li>}
      </ul>
    </div>
  );
}
