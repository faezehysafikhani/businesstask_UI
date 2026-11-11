import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban, Pencil, Plus } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { useAuth } from '../../auth/AuthContext';
import { listUsers } from '../../api/tasks';
import { orgApi, type OrgNode } from '../../api/org';
import {
  APPROVAL_STATUS_LABEL, PROJECT_STATUS_LABEL, PROJECT_TYPE_LABEL,
  projectsApi, type Project, type ProjectInput,
} from '../../api/projects';

const STATUSES = ['Draft', 'Active', 'OnHold', 'Completed'];
const TYPES = ['Waterfall', 'Agile'];

// The projects of the organization: the list (every project, or the portfolio of the caller), and the
// form that makes a project or changes its charter.
export function ProjectsPage() {
  const { me } = useAuth();
  const can = (p: string) => !!me?.permissions.includes(p);
  const [rows, setRows] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [view, setView] = useState<'all' | 'mine'>('all');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [users, setUsers] = useState<{ id: string; displayName: string }[]>([]);
  const [editing, setEditing] = useState<Project | 'new' | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true); setError('');
    const request = view === 'mine'
      ? projectsApi.portfolio({ search, status, type }).then((list) => { setTotal(list.length); return list; })
      : projectsApi.list({ pageSize: 100, search, status, type }).then((page) => { setTotal(page.totalCount); return page.items; });
    request.then(setRows).catch((e: Error) => { setRows([]); setError(e.message); }).finally(() => setLoading(false));
  }, [view, search, status, type]);
  useEffect(load, [load]);
  useEffect(() => { listUsers().then(setUsers).catch(() => setUsers([])); }, []);

  const nameOf = useMemo(() => new Map(users.map((u) => [u.id, u.displayName])), [users]);

  async function act(action: () => Promise<unknown>, done: string) {
    setError('');
    try {
      await action();
      load();
      return done;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا');
      return '';
    }
  }

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-xl font-bold">پروژه‌ها</h1>
          <p className="text-xs text-slate-500 mt-1">پروژه‌های سازمان: منشور پروژه، وضعیت و اعضای تیم.</p>
        </div>
        {can('Projects.Create') && (
          <button className="ms-auto inline-flex items-center gap-1 rounded-lg bg-blue-600 text-white px-4 py-1.5" onClick={() => setEditing('new')}>
            <Plus size={15} /> پروژه جدید
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3 bg-white rounded-xl border p-3 text-sm">
        <label className="block">نمایش
          <select className="mt-1 block border rounded-lg px-2 py-1.5" value={view} onChange={(e) => setView(e.target.value as 'all' | 'mine')}>
            <option value="all">همه پروژه‌ها</option>
            <option value="mine">پورتفویو من (آنچه می‌بینم)</option>
          </select>
        </label>
        <label className="block">جستجو
          <input className="mt-1 block border rounded-lg px-2 py-1.5 min-w-48" placeholder="نام یا کد پروژه" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <label className="block">وضعیت
          <select className="mt-1 block border rounded-lg px-2 py-1.5" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">همه</option>
            {STATUSES.map((s) => <option key={s} value={s}>{PROJECT_STATUS_LABEL[s]}</option>)}
          </select>
        </label>
        <label className="block">نوع
          <select className="mt-1 block border rounded-lg px-2 py-1.5" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">همه</option>
            {TYPES.map((t) => <option key={t} value={t}>{PROJECT_TYPE_LABEL[t]}</option>)}
          </select>
        </label>
        <span className="text-xs text-slate-500 self-center">{total} پروژه</span>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-slate-500">...</p>}

      {!loading && (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 bg-slate-50">
              <tr>
                <th className="text-start p-3 font-medium">پروژه</th>
                <th className="text-start p-3 font-medium">نوع</th>
                <th className="text-start p-3 font-medium">وضعیت</th>
                <th className="text-start p-3 font-medium">مدیر</th>
                <th className="text-start p-3 font-medium">زمان</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.id} className="align-top">
                  <td className="p-3">
                    <Link to={`/projects/${row.id}`} className="font-medium hover:text-blue-700">{row.name}</Link>
                    <div className="text-xs text-slate-400" dir="ltr">{row.code}</div>
                    {row.approvalStatus !== 'NotSubmitted' && (
                      <div className="text-[11px] text-slate-500">تأیید: {APPROVAL_STATUS_LABEL[row.approvalStatus]}</div>
                    )}
                  </td>
                  <td className="p-3 text-slate-600">{PROJECT_TYPE_LABEL[row.type] ?? row.type}</td>
                  <td className="p-3 text-slate-600">{PROJECT_STATUS_LABEL[row.status] ?? row.status}</td>
                  <td className="p-3 text-slate-600">{row.managerUserId ? nameOf.get(row.managerUserId) ?? '—' : '—'}</td>
                  <td className="p-3 text-xs text-slate-500">
                    {row.startDate ?? '—'} تا {row.endDate ?? '—'}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap justify-end gap-3 text-xs whitespace-nowrap">
                      <Link to={`/projects/${row.id}`} className="inline-flex items-center gap-1 underline text-slate-600"><FolderKanban size={12} /> جزئیات</Link>
                      {can('Projects.Edit') && <button className="inline-flex items-center gap-1 underline text-blue-700" onClick={() => setEditing(row)}><Pencil size={12} /> ویرایش</button>}
                      {can('Projects.Remove') && <button className="underline text-red-600" onClick={() => confirm(`پروژه «${row.name}» حذف شود؟`) && act(() => projectsApi.remove(row.id), '')}>حذف</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-slate-400">پروژه‌ای نیست.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ProjectForm
          project={editing === 'new' ? null : editing}
          users={users}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

/** The charter form: what a project is, who runs it, when, and its goal and requirements. */
function ProjectForm({ project, users, onClose, onSaved }: {
  project: Project | null; users: { id: string; displayName: string }[]; onClose: () => void; onSaved: () => void;
}) {
  const { me } = useAuth();
  const [nodes, setNodes] = useState<OrgNode[]>([]);
  const [form, setForm] = useState<ProjectInput>({
    name: project?.name ?? '', code: project?.code ?? '', type: project?.type ?? 'Waterfall',
    managerUserId: project?.managerUserId ?? null, ownerUserId: project?.ownerUserId ?? null,
    organizationUnitId: project?.organizationUnitId ?? null, startDate: project?.startDate ?? null, endDate: project?.endDate ?? null,
    cost: project?.cost ?? null, goal: project?.goal ?? '', requirements: project?.requirements ?? '',
    constraints: project?.constraints ?? '', assumptions: project?.assumptions ?? '', description: project?.description ?? '',
    charter: project?.charter ?? '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { orgApi.nodes().then(setNodes).catch(() => setNodes([])); }, []);

  async function submit() {
    setBusy(true); setError('');
    try {
      if (project) await projectsApi.update(project.id, { ...form, code: form.code ?? '' });
      else await projectsApi.create(me?.user.tenantId ?? '', form);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا');
    } finally {
      setBusy(false);
    }
  }

  const set = (patch: Partial<ProjectInput>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <Modal title={project ? `ویرایش پروژه «${project.name}»` : 'پروژه جدید'} onClose={onClose}>
      <div className="space-y-3 text-sm max-h-[70vh] overflow-auto">
        <label className="block">نام پروژه
          <input className="mt-1 w-full border rounded-lg px-2 py-1.5" value={form.name} onChange={(e) => set({ name: e.target.value })} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">کد
            <input className="mt-1 w-full border rounded-lg px-2 py-1.5" dir="ltr" placeholder={project ? '' : 'خودکار'} value={form.code ?? ''} onChange={(e) => set({ code: e.target.value })} />
          </label>
          <label className="block">نوع
            <select className="mt-1 w-full border rounded-lg px-2 py-1.5" value={form.type} onChange={(e) => set({ type: e.target.value })}>
              {TYPES.map((t) => <option key={t} value={t}>{PROJECT_TYPE_LABEL[t]}</option>)}
            </select>
          </label>
          <label className="block">مدیر
            <select className="mt-1 w-full border rounded-lg px-2 py-1.5" value={form.managerUserId ?? ''} onChange={(e) => set({ managerUserId: e.target.value || null })}>
              <option value="">ندارد</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.displayName}</option>)}
            </select>
          </label>
          <label className="block">مالک
            <select className="mt-1 w-full border rounded-lg px-2 py-1.5" value={form.ownerUserId ?? ''} onChange={(e) => set({ ownerUserId: e.target.value || null })}>
              <option value="">ندارد</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.displayName}</option>)}
            </select>
          </label>
          <label className="block">واحد سازمانی
            <select className="mt-1 w-full border rounded-lg px-2 py-1.5" value={form.organizationUnitId ?? ''} onChange={(e) => set({ organizationUnitId: e.target.value || null })}>
              <option value="">ندارد</option>
              {nodes.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
            </select>
          </label>
          <label className="block">هزینه (اختیاری)
            <input type="number" className="mt-1 w-full border rounded-lg px-2 py-1.5" dir="ltr" value={form.cost ?? ''} onChange={(e) => set({ cost: e.target.value ? Number(e.target.value) : null })} />
          </label>
          <label className="block">از تاریخ
            <input type="date" className="mt-1 w-full border rounded-lg px-2 py-1.5" dir="ltr" value={form.startDate ?? ''} onChange={(e) => set({ startDate: e.target.value || null })} />
          </label>
          <label className="block">تا تاریخ
            <input type="date" className="mt-1 w-full border rounded-lg px-2 py-1.5" dir="ltr" value={form.endDate ?? ''} onChange={(e) => set({ endDate: e.target.value || null })} />
          </label>
        </div>
        <label className="block">هدف
          <textarea className="mt-1 w-full border rounded-lg px-2 py-1.5" rows={2} value={form.goal ?? ''} onChange={(e) => set({ goal: e.target.value })} />
        </label>
        <label className="block">الزامات
          <textarea className="mt-1 w-full border rounded-lg px-2 py-1.5" rows={2} value={form.requirements ?? ''} onChange={(e) => set({ requirements: e.target.value })} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">محدودیت‌ها
            <textarea className="mt-1 w-full border rounded-lg px-2 py-1.5" rows={2} value={form.constraints ?? ''} onChange={(e) => set({ constraints: e.target.value })} />
          </label>
          <label className="block">فرضیات
            <textarea className="mt-1 w-full border rounded-lg px-2 py-1.5" rows={2} value={form.assumptions ?? ''} onChange={(e) => set({ assumptions: e.target.value })} />
          </label>
        </div>
        <label className="block">توضیح
          <textarea className="mt-1 w-full border rounded-lg px-2 py-1.5" rows={2} value={form.description ?? ''} onChange={(e) => set({ description: e.target.value })} />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button className="rounded-lg border px-4 py-1.5" onClick={onClose}>انصراف</button>
          <button className="rounded-lg bg-blue-600 text-white px-4 py-1.5 disabled:opacity-50" disabled={!form.name.trim() || busy} onClick={submit}>ذخیره</button>
        </div>
      </div>
    </Modal>
  );
}
