import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Archive, ArchiveRestore, CheckCircle2, CircleDashed, ClipboardList, ListTodo, Loader, Pencil, Play, Plus, SendHorizontal } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { tasksApi, timeApi } from '../../api/tasks';
import { PriorityLabel, ReviewLabel, type Paged, type TaskListItem } from '../../api/types';
import { useStatuses, type StatusOption } from './useStatuses';
import { TaskForm } from './TaskForm';
import { PlanningModal } from './PlanningModal';
import { Avatar, PRIORITY_COLOR, SortTh, useSort } from '../../ui/table';
import { Drawer } from '../../ui/Drawer';
import { Confetti, useCountUp } from '../../ui/effects';
import { Empty } from '../../ui/Empty';

type Chip = 'all' | 'today' | 'overdue' | 'mine';
const PAGE = 20;
const ST_KIND: Record<number, string> = { 0: 'wait', 1: 'prog', 2: 'other', 3: 'done' };
const dayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
const sameDay = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

function Stat({ label, value, icon, tint }: { label: string; value: number; icon: React.ReactNode; tint: string }) {
  const n = useCountUp(value);
  return <div className="stat"><span className="ic" style={{ background: `color-mix(in srgb, ${tint} 16%, transparent)`, color: tint }}>{icon}</span><div><small>{label}</small><strong>{n.toLocaleString('fa-IR')}</strong></div></div>;
}

export function TasksPage() {
  const { can, me } = useAuth();
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
  const [chip, setChip] = useState<Chip>('all');
  const [detail, setDetail] = useState<TaskListItem | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const [confetti, setConfetti] = useState(false);

  const load = useCallback(() => {
    tasksApi.list({ pageNumber: 1, pageSize: 200, search: search || undefined, archived }).then(setData).catch((e) => setError(e.message));
  }, [search, archived]);
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

  const all = data?.items ?? [];
  const uid = me?.user.id;
  const counts = useMemo(() => ({
    all: all.length,
    today: all.filter((t) => t.status !== 3 && sameDay(t.dueDate)).length,
    overdue: all.filter((t) => t.status !== 3 && new Date(t.dueDate).getTime() < dayStart()).length,
    mine: all.filter((t) => !!uid && t.assignedUser?.id === uid).length,
  }), [all, uid]);
  const filtered = useMemo(() => all.filter((t) =>
    chip === 'today' ? t.status !== 3 && sameDay(t.dueDate)
    : chip === 'overdue' ? t.status !== 3 && new Date(t.dueDate).getTime() < dayStart()
    : chip === 'mine' ? !!uid && t.assignedUser?.id === uid : true), [all, chip, uid]);
  const { sorted, sort, toggle: toggleSort } = useSort(filtered, {
    title: (t) => t.title, status: (t) => t.status, priority: (t) => t.priority, due: (t) => t.dueDate, who: (t) => t.assignedUser?.displayName ?? '',
  });
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE));
  const shown = sorted.slice((page - 1) * PAGE, page * PAGE);
  const done = all.filter((t) => t.status === 3).length;
  const prog = all.filter((t) => t.status === 1).length;
  const waiting = all.length - done - prog;
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'صبح بخیر' : hour < 17 ? 'ظهر بخیر' : 'عصر بخیر';
  const pct = all.length ? Math.round((done / all.length) * 100) : 0;
  const prevDone = useRef(-1);
  useEffect(() => {
    if (!archived && all.length > 0 && done === all.length && prevDone.current >= 0 && prevDone.current < all.length) setConfetti(true);
    prevDone.current = done;
  }, [done, all.length, archived]);

  const StatusSelect = ({ t }: { t: TaskListItem }) => (
    <select
      disabled={archived || !can('Tasks.Edit')}
      data-st={t.customStatusId ? 'other' : ST_KIND[t.status]}
      className="border rounded-lg px-2 py-1 text-xs"
      style={{ borderColor: statuses.colorOf(t.customStatusId) ?? undefined }}
      value={statuses.keyOf(t.status, t.customStatusId)}
      onChange={(e) => { const o = statuses.options.find((x: StatusOption) => x.key === e.target.value); if (o) act(() => tasksApi.setStatus(t.id, o.payload)); }}
    >
      {statuses.options.map((o: StatusOption) => <option key={o.key} value={o.key}>{o.label}</option>)}
    </select>
  );

  const Actions = ({ t, big }: { t: TaskListItem; big?: boolean }) => {
    const cls = (c: string) => `p-1 rounded-lg ${big ? 'border border-slate-200 px-3 py-1.5 text-xs inline-flex items-center gap-1' : ''} ${c}`;
    return (
      <>
        {can('Timesheets.Log') && !archived && <button title="شروع تایمر" aria-label="شروع تایمر" onClick={() => act(async () => { await timeApi.start(t.id); window.dispatchEvent(new Event('timer-changed')); })} className={cls('hover:text-emerald-600')}><Play size={16} />{big && 'شروع تایمر'}</button>}
        {!archived && <button title="برنامه‌ریزی (وابستگی، معیار پذیرش)" aria-label="برنامه‌ریزی" onClick={() => setPlanning(t)} className={cls('hover:text-teal-600')}><ListTodo size={16} />{big && 'برنامه‌ریزی'}</button>}
        {can('Tasks.Edit') && !archived && t.status !== 3 && t.reviewStatus !== 1 && <button title="ارسال برای بازبینی" aria-label="ارسال برای بازبینی" onClick={() => { const c = prompt('توضیح برای بازبین (اختیاری)'); if (c !== null) act(() => tasksApi.submitReview(t.id, c || undefined)); }} className={cls('hover:text-purple-600')}><SendHorizontal size={16} />{big && 'بازبینی'}</button>}
        {can('Tasks.Edit') && !archived && <button title="ویرایش" aria-label="ویرایش" onClick={() => { setDetail(null); setForm({ id: t.id }); }} className={cls('hover:text-blue-600')}><Pencil size={16} />{big && 'ویرایش'}</button>}
        {can('Tasks.Edit') && (archived
          ? <button title="بازیابی" aria-label="بازیابی" onClick={() => act(() => tasksApi.restore(t.id))} className={cls('hover:text-green-600')}><ArchiveRestore size={16} />{big && 'بازیابی'}</button>
          : <button title="بایگانی" aria-label="بایگانی" onClick={() => confirm('این وظیفه بایگانی شود؟') && act(() => tasksApi.archive(t.id))} className={cls('hover:text-amber-600')}><Archive size={16} />{big && 'بایگانی'}</button>)}
      </>
    );
  };
  const newTask = can('Tasks.Create') && !archived ? () => setForm({}) : undefined;
  const slaCell = (t: TaskListItem) => (
    <>
      {t.slaBreachedAtUtc ? <span className="ms-2 text-xs text-red-600">SLA نقض شد</span> : t.slaDueAtUtc && t.status !== 3 ? <span className="ms-2 text-xs text-slate-500" title="مهلت SLA">⏳ {new Date(t.slaDueAtUtc).toLocaleString('fa-IR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span> : null}
      {!!t.reviewStatus && <span className={`ms-2 text-xs ${t.reviewStatus === 3 ? 'text-red-600' : t.reviewStatus === 1 ? 'text-amber-600' : 'text-green-600'}`}>{ReviewLabel[t.reviewStatus]}</span>}
    </>
  );
  const rowClick = (t: TaskListItem) => (e: React.MouseEvent) => { if (!(e.target as HTMLElement).closest('button,a,input,select,label')) setDetail(t); };

  return (
    <div className="space-y-4">
      {!archived && data && (
        <div className="hero">
          <div className="space-y-2 min-w-0 flex-1">
            <b>{hello}{me?.user.displayName ? `، ${me.user.displayName}` : ''}</b>
            <span>{new Intl.DateTimeFormat('fa-IR', { dateStyle: 'full' }).format(new Date())} · {waiting + prog > 0 ? `${(waiting + prog).toLocaleString('fa-IR')} وظیفه منتظر شماست` : 'همه‌ی وظیفه‌ها انجام شده‌اند'}</span>
            <div className="meter max-w-sm"><i style={{ width: `${pct}%` }} /></div>
          </div>
          <div className="text-3xl font-bold">{pct.toLocaleString('fa-IR')}٪</div>
        </div>
      )}
      {!archived && data && (
        <div className="stat-grid grid grid-cols-4 gap-3.5">
          <Stat label="کل وظیفه‌ها" value={all.length} icon={<ClipboardList size={20} />} tint="#5b4bff" />
          <Stat label="انجام‌شده" value={done} icon={<CheckCircle2 size={20} />} tint="#10b981" />
          <Stat label="در حال انجام" value={prog} icon={<Loader size={20} />} tint="#2563eb" />
          <Stat label="در انتظار" value={waiting} icon={<CircleDashed size={20} />} tint="#f59e0b" />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">وظایف</h1>
        <div className="flex rounded-2xl bg-white text-sm p-1 gap-0.5 shadow-[var(--shadow)]">
          {[false, true].map((a) => (
            <button key={String(a)} onClick={() => { setArchived(a); setPage(1); setSelected(new Set()); setChip('all'); }} className={`px-4 py-1.5 rounded-xl ${archived === a ? 'nav-active' : 'text-slate-600'}`}>{a ? 'بایگانی' : 'فعال'}</button>
          ))}
        </div>
        <div className="flex rounded-2xl bg-white text-sm p-1 gap-0.5 shadow-[var(--shadow)]">
          {[false, true].map((b) => (
            <button key={String(b)} onClick={() => setBoard(b)} className={`px-4 py-1.5 rounded-xl ${board === b ? 'nav-active' : 'text-slate-600'}`}>{b ? 'بورد' : 'لیست'}</button>
          ))}
        </div>
        <input data-search autoComplete="off" className="rounded-2xl px-4 py-2 text-sm shadow-[var(--shadow)] border border-transparent focus:border-blue-500" placeholder="جستجو ( / )" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        {newTask && (
          <button data-primary onClick={newTask} className="ms-auto flex items-center gap-1 rounded-2xl text-white px-5 py-2.5 text-sm font-semibold shadow-[0_8px_20px_color-mix(in_srgb,var(--primary)_38%,transparent)]" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}><Plus size={16} /> وظیفه جدید</button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {([['all', 'همه'], ['today', 'سررسید امروز'], ['overdue', 'عقب‌افتاده'], ['mine', 'مال من']] as [Chip, string][]).map(([k, l]) => (
          <button key={k} className="chip" data-on={chip === k} data-warn={k === 'overdue' && counts.overdue > 0} onClick={() => { setChip(k); setPage(1); }}>{l}<b>{counts[k].toLocaleString('fa-IR')}</b></button>
        ))}
      </div>
      {can('Tasks.Create') && !archived && (
        <form onSubmit={(e) => { e.preventDefault(); const t = quick.trim(); if (t) act(async () => { await tasksApi.quick(t); setQuick(''); }); }}>
          <input autoComplete="off" className="w-full rounded-2xl px-4 py-2.5 text-sm bg-white shadow-[var(--shadow)]" placeholder="ثبت سریع: عنوان را بنویس و Enter بزن" value={quick} onChange={(e) => setQuick(e.target.value)} />
        </form>
      )}
      {selected.size > 0 && can('Tasks.Edit') && (
        <div className="bulkbar">
          <span>{selected.size.toLocaleString('fa-IR')} انتخاب شده</span>
          {!archived && (
            <>
              <select value="" onChange={(e) => { const o = statuses.options.find((x: StatusOption) => x.key === e.target.value); if (o) bulk('status' in o.payload ? { action: 'Status', status: o.payload.status } : { action: 'CustomStatus', customStatusId: o.payload.customStatusId }); }}>
                <option value="">تغییر وضعیت…</option>
                {statuses.options.map((o: StatusOption) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
              <select value="" onChange={(e) => e.target.value && bulk({ action: 'Priority', priority: Number(e.target.value) })}>
                <option value="">تغییر اولویت…</option>
                {Object.entries(PriorityLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </>
          )}
          <button onClick={() => confirm(archived ? 'بازیابی شوند؟' : 'بایگانی شوند؟') && bulk({ action: archived ? 'Restore' : 'Archive' })}>{archived ? 'بازیابی' : 'بایگانی'}</button>
          <button className="ghost" aria-label="لغو انتخاب" onClick={() => setSelected(new Set())}>✕</button>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!data && !error && <div className="space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="skel h-12" />)}</div>}
      {data && (board ? (
        <div className="flex gap-3.5 overflow-x-auto pb-3">
          {statuses.options.map((o: StatusOption) => {
            const items = filtered.filter((t) => statuses.keyOf(t.status, t.customStatusId) === o.key);
            return (
              <div key={o.key} className="kcol space-y-2" style={{ ['--c' as string]: o.color ?? '#8a5cff' }} data-over={overKey === o.key}
                onDragOver={(e) => { if (dragId && !archived && can('Tasks.Edit')) { e.preventDefault(); setOverKey(o.key); } }}
                onDragLeave={() => setOverKey((k) => (k === o.key ? null : k))}
                onDrop={() => { const t = filtered.find((x) => x.id === dragId); setOverKey(null); setDragId(null); if (t && statuses.keyOf(t.status, t.customStatusId) !== o.key) act(() => tasksApi.setStatus(t.id, o.payload)); }}>
                <div className="flex items-center gap-2 text-sm font-bold px-1">
                  <span className="size-2.5 rounded-full" style={{ background: o.color ?? '#94a3b8', boxShadow: `0 0 0 4px color-mix(in srgb, ${o.color ?? '#94a3b8'} 25%, transparent)` }} />{o.label}
                  <span className="ms-auto rounded-full bg-white px-2.5 text-xs text-blue-600 shadow-sm">{items.length.toLocaleString('fa-IR')}</span>
                </div>
                {items.map((t) => (
                  <div key={t.id} draggable={!archived && can('Tasks.Edit')} onDragStart={() => setDragId(t.id)} onDragEnd={() => { setDragId(null); setOverKey(null); }} onClick={rowClick(t)}
                    className="kcard text-sm space-y-1.5" data-drag={dragId === t.id}>
                    <div>{t.title}</div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="pri-dot" style={{ ['--c' as string]: PRIORITY_COLOR[t.priority] }}>{PriorityLabel[t.priority]}</span>
                      <span>{new Date(t.dueDate).toLocaleDateString('fa-IR')}</span>
                      {t.assignedUser && <span className="ms-auto"><Avatar name={t.assignedUser.displayName} /></span>}
                    </div>
                    <StatusSelect t={t} />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
      <div className="rounded-[20px] bg-white shadow-[0_10px_40px_rgba(60,50,160,.10)]">
        <table className="cards w-full text-sm">
          <thead><tr>
            <th className="px-3 py-2 w-8 rounded-tr-[20px]"><input type="checkbox" aria-label="همه" checked={shown.length > 0 && shown.every((t) => selected.has(t.id))} onChange={(e) => setSelected(e.target.checked ? new Set(shown.map((t) => t.id)) : new Set())} /></th>
            <SortTh k="title" sort={sort} onSort={toggleSort}>عنوان</SortTh>
            <SortTh k="status" sort={sort} onSort={toggleSort}>وضعیت</SortTh>
            <SortTh k="priority" sort={sort} onSort={toggleSort}>اولویت</SortTh>
            <SortTh k="due" sort={sort} onSort={toggleSort}>سررسید</SortTh>
            <SortTh k="who" sort={sort} onSort={toggleSort}>مسئول</SortTh>
            <th className="rounded-tl-[20px]" />
          </tr></thead>
          <tbody>
            {shown.map((t) => (
              <tr key={t.id} data-done={t.status === 3} onClick={rowClick(t)} className="cursor-pointer">
                <td className="px-3"><input type="checkbox" checked={selected.has(t.id)} onChange={() => toggle(t.id)} /></td>
                <td className="px-3 ttl" data-label="عنوان">{t.title}</td>
                <td className="px-3" data-label="وضعیت"><span><StatusSelect t={t} />{slaCell(t)}</span></td>
                <td className="px-3" data-label="اولویت"><span className="pri-dot" style={{ ['--c' as string]: PRIORITY_COLOR[t.priority] }}>{PriorityLabel[t.priority]}</span></td>
                <td className="px-3" data-label="سررسید">{new Date(t.dueDate).toLocaleDateString('fa-IR')}</td>
                <td className="px-3" data-label="مسئول">{t.assignedUser ? <span><Avatar name={t.assignedUser.displayName} />{t.assignedUser.displayName}</span> : '—'}</td>
                <td className="px-3 text-end row-act"><Actions t={t} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && (
          <Empty icon="🗂️" text={chip === 'all' ? (archived ? 'وظیفه‌ی بایگانی‌شده‌ای نیست.' : 'هنوز وظیفه‌ای نیست.') : 'وظیفه‌ای با این فیلتر نیست.'}
            actionLabel={chip === 'all' && newTask ? 'اولین وظیفه را بساز' : undefined} onAction={newTask} />
        )}
      </div>
      ))}
      {!board && data && pages > 1 && (
        <div className="flex gap-2 items-center text-sm">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-xl bg-white shadow-[var(--shadow)] px-3 py-1.5 disabled:opacity-40">قبلی</button>
          <span>{page.toLocaleString('fa-IR')} / {pages.toLocaleString('fa-IR')}</span>
          <button disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded-xl bg-white shadow-[var(--shadow)] px-3 py-1.5 disabled:opacity-40">بعدی</button>
        </div>
      )}
      {detail && (
        <Drawer title={detail.title} onClose={() => setDetail(null)}>
          <dl className="text-sm">
            {([['وضعیت', statuses.options.find((o: StatusOption) => o.key === statuses.keyOf(detail.status, detail.customStatusId))?.label ?? '—'],
              ['اولویت', PriorityLabel[detail.priority]], ['سررسید', new Date(detail.dueDate).toLocaleDateString('fa-IR')],
              ['مسئول', detail.assignedUser?.displayName ?? '—'], ['زیروظیفه', `${detail.completedSubTaskCount.toLocaleString('fa-IR')} از ${detail.subTaskCount.toLocaleString('fa-IR')}`]] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between py-2.5 border-b border-slate-200"><dt className="text-slate-500">{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-2 mt-5"><Actions t={detail} big /></div>
        </Drawer>
      )}
      {confetti && <Confetti onDone={() => setConfetti(false)} />}
      {planning && <PlanningModal task={planning} onClose={() => setPlanning(null)} onChanged={load} />}
      {form && <TaskForm taskId={form.id} onClose={() => setForm(null)} onSaved={() => { setForm(null); load(); }} />}
    </div>
  );
}
