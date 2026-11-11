import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Pencil, Plus, UserPlus } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { useAuth } from '../../auth/AuthContext';
import { listUsers } from '../../api/tasks';
import {
  APPROVAL_STATUS_LABEL, INTEREST_LABEL, POWER_LABEL, PROJECT_STATUS_LABEL, PROJECT_TYPE_LABEL,
  QUADRANT_LABEL, projectsApi, type Project, type ProjectMember, type Stakeholder,
} from '../../api/projects';
import { StakeholderMatrix } from './StakeholderMatrix';

const STATUSES = ['Draft', 'Active', 'OnHold', 'Completed'];
const LEVELS = ['Low', 'Medium', 'High'];

// One project: its charter, the team that runs it, and its stakeholders (with the power/interest matrix).
export function ProjectPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { me } = useAuth();
  const can = (p: string) => !!me?.permissions.includes(p);

  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [users, setUsers] = useState<{ id: string; displayName: string }[]>([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [addMember, setAddMember] = useState(false);
  const [editStakeholder, setEditStakeholder] = useState<Stakeholder | 'new' | null>(null);
  const [version, setVersion] = useState(0);

  const load = useCallback(async () => {
    setError('');
    try {
      const p = await projectsApi.get(id);
      setProject(p);
      const [team, people] = await Promise.all([projectsApi.members(id), projectsApi.stakeholders(id)]);
      setMembers(team);
      setStakeholders(people);
      setVersion((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا');
    }
  }, [id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { listUsers().then(setUsers).catch(() => setUsers([])); }, []);

  const nameOf = new Map(users.map((u) => [u.id, u.displayName]));

  async function act(action: () => Promise<unknown>, done: string) {
    setError(''); setMsg('');
    try {
      await action();
      setMsg(done);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا');
    }
  }

  if (!project) return <p className="text-sm text-slate-500">{error || '...'}</p>;

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link to="/projects" className="inline-flex items-center gap-1 text-slate-500 hover:text-blue-700"><ArrowRight size={15} /> پروژه‌ها</Link>
        <span className="text-slate-300">/</span>
        <span className="font-medium">{project.name}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold">{project.name}</h1>
        <span className="text-xs text-slate-400" dir="ltr">{project.code}</span>
        <span className="text-xs rounded-full bg-slate-100 text-slate-600 px-2">{PROJECT_TYPE_LABEL[project.type] ?? project.type}</span>
        <span className="text-xs rounded-full bg-blue-50 text-blue-700 px-2">{PROJECT_STATUS_LABEL[project.status] ?? project.status}</span>
        {project.approvalStatus !== 'NotSubmitted' && (
          <span className="text-xs rounded-full bg-amber-50 text-amber-700 px-2">تأیید: {APPROVAL_STATUS_LABEL[project.approvalStatus]}</span>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {msg && <p className="text-sm text-green-700">{msg}</p>}

      <div className="flex flex-wrap gap-2">
        {can('Projects.Edit') && STATUSES.filter((s) => s !== project.status).map((s) => (
          <button key={s} className="rounded-lg border px-3 py-1.5 text-xs" onClick={() => act(() => projectsApi.setStatus(project.id, s), `وضعیت: ${PROJECT_STATUS_LABEL[s]}`)}>
            {PROJECT_STATUS_LABEL[s]}
          </button>
        ))}
        {can('Projects.Edit') && project.status !== 'Archived' && (
          <button className="rounded-lg border px-3 py-1.5 text-xs" onClick={() => confirm('پروژه بایگانی شود؟') && act(() => projectsApi.archive(project.id), 'پروژه بایگانی شد')}>بایگانی</button>
        )}
        {can('Projects.Remove') && (
          <button className="rounded-lg border border-red-200 text-red-600 px-3 py-1.5 text-xs"
            onClick={() => {
              if (!confirm(`پروژه «${project.name}» حذف شود؟`)) return;
              projectsApi.remove(project.id).then(() => navigate('/projects')).catch((e: Error) => setError(e.message));
            }}>حذف پروژه</button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2 items-start">
        <div className="space-y-4">
          <section className="bg-white rounded-xl border p-4 space-y-2 text-sm">
            <h2 className="font-medium">منشور پروژه</h2>
            <dl className="grid grid-cols-2 gap-y-1 text-xs">
              <dt className="text-slate-500">مدیر</dt><dd>{project.managerUserId ? nameOf.get(project.managerUserId) ?? '—' : '—'}</dd>
              <dt className="text-slate-500">مالک</dt><dd>{project.ownerUserId ? nameOf.get(project.ownerUserId) ?? '—' : '—'}</dd>
              <dt className="text-slate-500">از تاریخ</dt><dd dir="ltr">{project.startDate ?? '—'}</dd>
              <dt className="text-slate-500">تا تاریخ</dt><dd dir="ltr">{project.endDate ?? '—'}</dd>
              <dt className="text-slate-500">هزینه</dt><dd dir="ltr">{project.cost ?? '—'}</dd>
            </dl>
            {project.goal && <div><div className="text-xs text-slate-500">هدف</div><p className="text-sm">{project.goal}</p></div>}
            {project.requirements && <div><div className="text-xs text-slate-500">الزامات</div><p className="text-sm whitespace-pre-wrap">{project.requirements}</p></div>}
            {project.constraints && <div><div className="text-xs text-slate-500">محدودیت‌ها</div><p className="text-sm whitespace-pre-wrap">{project.constraints}</p></div>}
            {project.assumptions && <div><div className="text-xs text-slate-500">فرضیات</div><p className="text-sm whitespace-pre-wrap">{project.assumptions}</p></div>}
            {project.description && <div><div className="text-xs text-slate-500">توضیح</div><p className="text-sm whitespace-pre-wrap">{project.description}</p></div>}
          </section>

          <section className="bg-white rounded-xl border p-4 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <h2 className="font-medium">تیم پروژه</h2>
              {can('ProjectTeam.ManageMembers') && (
                <button className="ms-auto inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs" onClick={() => setAddMember(true)}><UserPlus size={13} /> افزودن عضو</button>
              )}
            </div>
            <ul className="divide-y text-sm">
              {members.map((m) => (
                <li key={m.id} className="py-2 flex items-center gap-2">
                  <span>{nameOf.get(m.userId) ?? m.userId}</span>
                  {m.roleTitle && <span className="text-xs text-slate-500">{m.roleTitle}</span>}
                  {can('ProjectTeam.ManageMembers') && (
                    <span className="ms-auto flex gap-3 text-xs">
                      <button className="underline" onClick={() => {
                        const title = prompt('عنوان نقش (خالی = بدون نقش)', m.roleTitle ?? '');
                        if (title === null) return;
                        act(() => projectsApi.updateMember(m.id, title || null), 'نقش ذخیره شد');
                      }}>نقش</button>
                      <button className="underline text-red-600" onClick={() => confirm('عضو از تیم حذف شود؟') && act(() => projectsApi.removeMember(m.id), 'عضو حذف شد')}>حذف</button>
                    </span>
                  )}
                </li>
              ))}
              {members.length === 0 && <li className="py-3 text-center text-slate-400">عضوی برای پروژه ثبت نشده است.</li>}
            </ul>
          </section>

          <section className="bg-white rounded-xl border p-4 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <h2 className="font-medium">ذی‌نفعان</h2>
              {can('Stakeholders.Create') && (
                <button className="ms-auto inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs" onClick={() => setEditStakeholder('new')}><Plus size={13} /> ذی‌نفع</button>
              )}
            </div>
            <ul className="divide-y text-sm">
              {stakeholders.map((s) => (
                <li key={s.id} className="py-2 flex flex-wrap items-center gap-2">
                  <div>
                    <div>{s.name} {!s.isInternal && <span className="text-xs text-slate-400">(بیرونی)</span>}</div>
                    <div className="text-xs text-slate-500">
                      قدرت {POWER_LABEL[s.power]} · اینترست {INTEREST_LABEL[s.interest]} · {QUADRANT_LABEL[s.quadrant]}
                      {s.engagementStrategy ? ` · ${s.engagementStrategy}` : ''}
                    </div>
                  </div>
                  {can('Stakeholders.Edit') && (
                    <span className="ms-auto flex gap-3 text-xs">
                      <button className="inline-flex items-center gap-1 underline text-blue-700" onClick={() => setEditStakeholder(s)}><Pencil size={12} /> ویرایش</button>
                      <button className="underline text-red-600" onClick={() => confirm(`«${s.name}» حذف شود؟`) && act(() => projectsApi.removeStakeholder(s.id), 'ذی‌نفع حذف شد')}>حذف</button>
                    </span>
                  )}
                </li>
              ))}
              {stakeholders.length === 0 && <li className="py-3 text-center text-slate-400">ذی‌نفعی ثبت نشده است.</li>}
            </ul>
          </section>
        </div>

        <StakeholderMatrix projectId={project.id} canEdit={can('Stakeholders.Edit')} version={version} />
      </div>

      {addMember && (
        <AddMemberDialog projectId={project.id} users={users} onClose={() => setAddMember(false)} onSaved={() => { setAddMember(false); load(); }} />
      )}
      {editStakeholder && (
        <StakeholderDialog project={project} stakeholder={editStakeholder === 'new' ? null : editStakeholder}
          onClose={() => setEditStakeholder(null)} onSaved={() => { setEditStakeholder(null); load(); }} />
      )}
    </div>
  );
}

function AddMemberDialog({ projectId, users, onClose, onSaved }: {
  projectId: string; users: { id: string; displayName: string }[]; onClose: () => void; onSaved: () => void;
}) {
  const { me } = useAuth();
  const [available, setAvailable] = useState<{ id: string; displayName: string }[]>([]);
  const [userId, setUserId] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    projectsApi.availableUsers(projectId).then(setAvailable).catch((e: Error) => setError(e.message));
  }, [projectId]);

  async function submit() {
    setError('');
    try {
      await projectsApi.addMember(me?.user.tenantId ?? '', projectId, userId, roleTitle || null);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا');
    }
  }

  return (
    <Modal title="افزودن عضو به تیم پروژه" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <label className="block">فرد
          <select className="mt-1 w-full border rounded-lg px-2 py-1.5" value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">انتخاب فرد…</option>
            {available.map((u) => <option key={u.id} value={u.id}>{u.displayName}</option>)}
          </select>
        </label>
        <label className="block">عنوان نقش (اختیاری)
          <input className="mt-1 w-full border rounded-lg px-2 py-1.5" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} />
        </label>
        {available.length === 0 && !error && <p className="text-xs text-slate-500">همه‌ی افراد سازمان عضو این پروژه‌اند.</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button className="rounded-lg border px-4 py-1.5" onClick={onClose}>انصراف</button>
          <button className="rounded-lg bg-blue-600 text-white px-4 py-1.5 disabled:opacity-50" disabled={!userId} onClick={submit}>افزودن</button>
        </div>
      </div>
    </Modal>
  );
}

function StakeholderDialog({ project, stakeholder, onClose, onSaved }: {
  project: Project; stakeholder: Stakeholder | null; onClose: () => void; onSaved: () => void;
}) {
  const { me } = useAuth();
  const [form, setForm] = useState({
    name: stakeholder?.name ?? '', isInternal: stakeholder?.isInternal ?? true, power: stakeholder?.power ?? 'Medium',
    interest: stakeholder?.interest ?? 'Medium', engagementStrategy: stakeholder?.engagementStrategy ?? '',
    expectations: stakeholder?.expectations ?? '', notes: stakeholder?.notes ?? '',
  });
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    try {
      if (stakeholder) await projectsApi.updateStakeholder(stakeholder.id, form);
      else await projectsApi.addStakeholder(me?.user.tenantId ?? '', project.id, form);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا');
    }
  }

  return (
    <Modal title={stakeholder ? `ویرایش ذی‌نفع «${stakeholder.name}»` : 'ذی‌نفع جدید'} onClose={onClose}>
      <div className="space-y-3 text-sm">
        <label className="block">نام
          <input className="mt-1 w-full border rounded-lg px-2 py-1.5" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.isInternal} onChange={(e) => setForm({ ...form, isInternal: e.target.checked })} /> داخل سازمان است</label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">قدرت
            <select className="mt-1 w-full border rounded-lg px-2 py-1.5" value={form.power} onChange={(e) => setForm({ ...form, power: e.target.value })}>
              {LEVELS.map((l) => <option key={l} value={l}>{POWER_LABEL[l]}</option>)}
            </select>
          </label>
          <label className="block">اینترست
            <select className="mt-1 w-full border rounded-lg px-2 py-1.5" value={form.interest} onChange={(e) => setForm({ ...form, interest: e.target.value })}>
              {LEVELS.map((l) => <option key={l} value={l}>{INTEREST_LABEL[l]}</option>)}
            </select>
          </label>
        </div>
        <label className="block">راهبرد تعامل
          <input className="mt-1 w-full border rounded-lg px-2 py-1.5" value={form.engagementStrategy} onChange={(e) => setForm({ ...form, engagementStrategy: e.target.value })} />
        </label>
        <label className="block">انتظارات
          <textarea className="mt-1 w-full border rounded-lg px-2 py-1.5" rows={2} value={form.expectations} onChange={(e) => setForm({ ...form, expectations: e.target.value })} />
        </label>
        <label className="block">یادداشت
          <textarea className="mt-1 w-full border rounded-lg px-2 py-1.5" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button className="rounded-lg border px-4 py-1.5" onClick={onClose}>انصراف</button>
          <button className="rounded-lg bg-blue-600 text-white px-4 py-1.5 disabled:opacity-50" disabled={!form.name.trim()} onClick={submit}>ذخیره</button>
        </div>
      </div>
    </Modal>
  );
}
