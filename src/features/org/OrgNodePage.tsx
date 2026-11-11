import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, CalendarClock } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { useAuth } from '../../auth/AuthContext';
import {
  dayOf, faDate, isoDay, isoStart, orgApi,
  type Appointment, type NodePathItem, type OrgNode, type OrgNodeType, type OrgPosition, type UnitPosition, type UserAssignment,
} from '../../api/org';

// One node (unit) of the chart: its name and type, when it exists (validity dates), its manager and
// place, and its posts - who holds each, appointing someone, ending an appointment and its history.
export function OrgNodePage() {
  const { id = '' } = useParams();
  const { me } = useAuth();
  const has = (...permissions: string[]) => permissions.some((p) => me?.permissions.includes(p));
  const canEdit = has('org_structure.node.update', 'organization_units.update');
  const canMove = has('org_structure.node.move', 'org_structure.manage_companies');
  const canDeactivate = has('org_structure.node.deactivate', 'organization_units.delete');
  const canAppoint = has('org_structure.manage_assignments');
  const canManagePosts = has('org_structure.manage_positions');
  const canAssign = has('org_structure.node.assign', 'organization_units.update');

  const [node, setNode] = useState<OrgNode | null>(null);
  const [types, setTypes] = useState<OrgNodeType[]>([]);
  const [ancestors, setAncestors] = useState<NodePathItem[]>([]);
  const [companyNodes, setCompanyNodes] = useState<OrgNode[]>([]);
  const [people, setPeople] = useState<UserAssignment[]>([]);
  const [posts, setPosts] = useState<UnitPosition[]>([]);
  const [positions, setPositions] = useState<OrgPosition[]>([]);
  const [form, setForm] = useState({ name: '', nodeTypeId: '', managerUserId: '', parentNodeId: '', validFrom: '', validTo: '' });
  const [newPost, setNewPost] = useState({ positionId: '', code: '' });
  const [appointTo, setAppointTo] = useState<UnitPosition | null>(null);
  const [historyOf, setHistoryOf] = useState<UnitPosition | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const n = await orgApi.node(id);
      setNode(n);
      setForm({
        name: n.name, nodeTypeId: n.nodeTypeId ?? '', managerUserId: n.managerUserId ?? '', parentNodeId: n.parentNodeId ?? '',
        validFrom: dayOf(n.validFrom), validTo: dayOf(n.validTo),
      });
      const [path, nodes, assignments, postList, positionList, typeList] = await Promise.all([
        orgApi.ancestors(id), orgApi.nodes(n.companyId), orgApi.assignments(n.companyId), orgApi.posts(id), orgApi.positions(), orgApi.nodeTypes(),
      ]);
      setAncestors(path);
      setCompanyNodes(nodes.filter((other) => other.id !== id));
      setPeople(assignments.filter((a) => a.isUserActive && (!n.companyId || a.companyId === n.companyId)));
      setPosts(postList);
      setPositions(positionList.filter((p) => p.isActive && (!n.companyId || !p.companyIds || p.companyIds.includes(n.companyId))));
      setTypes(typeList);
    } catch (e) {
      setError((e as Error)?.message ?? String(e));
    }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  async function act(action: () => Promise<unknown>, done: string) {
    setError(''); setMsg('');
    try {
      await action();
      setMsg(done);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!node) return <p className="text-sm text-slate-500">{error || '...'}</p>;
  const manager = people.find((p) => p.userId === node.managerUserId);
  const inNode = people.filter((p) => p.unitId === node.id);
  const type = types.find((t) => t.id === node.nodeTypeId);

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link to="/organization" className="inline-flex items-center gap-1 text-slate-500 hover:text-blue-700"><ArrowRight size={15} /> چارت سازمانی</Link>
        {ancestors.map((a) => (
          <span key={a.id} className="flex items-center gap-2">
            <span className="text-slate-300">/</span>
            <Link to={`/organization/nodes/${a.id}`} className="hover:text-blue-700">{a.name}</Link>
          </span>
        ))}
        <span className="text-slate-300">/</span>
        <span className="font-medium">{node.name}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold">{node.name}</h1>
        {type && <span className="text-xs rounded-full px-2 py-0.5" style={{ color: type.color, background: `${type.color}1a` }}>{type.name}</span>}
        {!node.isActive && <span className="text-xs rounded-full bg-slate-100 text-slate-500 px-2">غیرفعال</span>}
        {node.code && <span className="text-xs text-slate-400">کد: <span dir="ltr">{node.code}</span></span>}
        {node.managerUserId && <span className="text-xs text-slate-500">مدیر گره: {manager?.displayName ?? '—'}</span>}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {msg && <p className="text-sm text-green-700">{msg}</p>}

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr] items-start">
        <div className="space-y-4">
          <section className="bg-white rounded-xl border p-4 space-y-3 text-sm">
            <h2 className="font-medium">نام و نوع گره</h2>
            <label className="block">نام
              <input className="mt-1 w-full border rounded-lg px-2 py-1.5" value={form.name} disabled={!canEdit} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="block">جزء چارت
              <select className="mt-1 w-full border rounded-lg px-2 py-1.5" value={form.nodeTypeId} disabled={!canEdit} onChange={(e) => setForm({ ...form, nodeTypeId: e.target.value })}>
                <option value="">بدون نوع (واحد ساده)</option>
                {types.map((t) => <option key={t.id} value={t.id}>{t.name}{t.isActive ? '' : ' (غیرفعال)'}</option>)}
              </select>
            </label>
            {canEdit && (
              <button className="rounded-lg bg-blue-600 text-white px-4 py-1.5 disabled:opacity-50" disabled={!form.name.trim()}
                onClick={() => act(() => orgApi.update(node.id, { name: form.name.trim(), nodeTypeId: form.nodeTypeId || null, rowVersion: node.rowVersion }), 'نام و نوع ذخیره شد')}>ذخیره</button>
            )}
          </section>

          <section className="bg-white rounded-xl border p-4 space-y-3 text-sm">
            <h2 className="font-medium inline-flex items-center gap-1"><CalendarClock size={15} /> تاریخ اعتبار</h2>
            <p className="text-xs text-slate-500">از چه روزی تا چه روزی این گره وجود دارد؛ خالی یعنی بدون محدودیت. این تاریخ‌ها فقط نمودار همان روز را محدود می‌کنند.</p>
            <div className="grid grid-cols-2 gap-2">
              <label>از تاریخ<input type="date" className="mt-1 w-full border rounded-lg px-2 py-1.5" dir="ltr" value={form.validFrom} disabled={!canEdit} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} /></label>
              <label>تا تاریخ<input type="date" className="mt-1 w-full border rounded-lg px-2 py-1.5" dir="ltr" value={form.validTo} disabled={!canEdit} onChange={(e) => setForm({ ...form, validTo: e.target.value })} /></label>
            </div>
            <div className="text-xs text-slate-500">
              ذخیره‌شده: از {faDate(node.validFrom)} تا {faDate(node.validTo)}
            </div>
            {canEdit && (
              <button className="rounded-lg bg-blue-600 text-white px-4 py-1.5"
                onClick={() => act(() => orgApi.setValidity(node.id, { validFrom: isoDay(form.validFrom), validTo: isoDay(form.validTo), rowVersion: node.rowVersion }), 'تاریخ اعتبار ذخیره شد')}>ذخیره تاریخ‌ها</button>
            )}
          </section>

          <section className="bg-white rounded-xl border p-4 space-y-2 text-sm">
            <h2 className="font-medium">پست‌های این گره</h2>
            <p className="text-xs text-slate-500">هر پست یک متصدی دارد (یا خالی است). انتصاب از یک روز (امروز یا بعد) ثبت می‌شود و تاریخ گذشته بازنویسی نمی‌شود.</p>
            <ul className="divide-y">
              {posts.map((post) => (
                <li key={post.id} className="py-2 flex flex-wrap items-center gap-2">
                  <div className="min-w-0">
                    <div className="font-medium">{post.title}{post.code ? <span className="text-xs text-slate-400"> ({post.code})</span> : ''}</div>
                    <div className="text-xs text-slate-500">
                      {post.holders.length > 0 ? post.holders.map((h) => h.displayName).join('، ') : 'بدون متصدی'}
                      {post.isPositionActive ? '' : ' · سمت غیرفعال'}
                    </div>
                  </div>
                  <span className="ms-auto flex gap-3 text-xs">
                    <button className="underline text-slate-600" onClick={() => setHistoryOf(post)}>سابقه</button>
                    {canAppoint && <button className="underline text-blue-700" onClick={() => setAppointTo(post)}>انتصاب</button>}
                    {canAppoint && post.holders.length > 0 && (
                      <button className="underline text-red-600" onClick={() => confirm(`انتصاب ${post.holders.map((h) => h.displayName).join('، ')} روی «${post.title}» امروز تمام شود؟`) && act(() => orgApi.endAppointment(post.id), 'انتصاب تمام شد')}>پایان انتصاب</button>
                    )}
                    {canManagePosts && <button className="underline text-red-600" onClick={() => confirm(`پست «${post.title}» حذف شود؟`) && act(() => orgApi.removePost(post.id), 'پست حذف شد')}>حذف پست</button>}
                  </span>
                </li>
              ))}
              {posts.length === 0 && <li className="py-4 text-center text-slate-400">پستی برای این گره ثبت نشده است.</li>}
            </ul>

            {canManagePosts && (
              <div className="flex flex-wrap items-end gap-2 pt-2 border-t">
                <label className="flex-1 min-w-48">سمت
                  <select className="mt-1 w-full border rounded-lg px-2 py-1.5" value={newPost.positionId} onChange={(e) => setNewPost({ ...newPost, positionId: e.target.value })}>
                    <option value="">انتخاب سمت…</option>
                    {positions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </label>
                <label className="w-32">کد پست
                  <input className="mt-1 w-full border rounded-lg px-2 py-1.5" dir="ltr" placeholder="خودکار" value={newPost.code} onChange={(e) => setNewPost({ ...newPost, code: e.target.value })} />
                </label>
                <button className="rounded-lg border px-4 py-1.5 disabled:opacity-50" disabled={!newPost.positionId}
                  onClick={() => act(async () => { await orgApi.addPost(node.id, { positionId: newPost.positionId, code: newPost.code || null }); setNewPost({ positionId: '', code: '' }); }, 'پست ساخته شد')}>افزودن پست</button>
              </div>
            )}
            {canManagePosts && positions.length === 0 && <p className="text-xs text-amber-700">سمتی برای این شرکت تعریف نشده؛ اول از صفحه سمت‌های سازمانی یک سمت بسازید.</p>}
          </section>
        </div>

        <div className="space-y-4">
          <section className="bg-white rounded-xl border p-4 space-y-2 text-sm">
            <h2 className="font-medium">مدیر گره</h2>
            <select className="w-full border rounded-lg px-2 py-1.5" value={form.managerUserId} disabled={!canAssign} onChange={(e) => setForm({ ...form, managerUserId: e.target.value })}>
              <option value="">بدون مدیر</option>
              {people.map((p) => <option key={p.userId} value={p.userId}>{p.displayName} — {p.unitName || p.companyName}</option>)}
            </select>
            {canAssign && (
              <button className="rounded-lg border px-3 py-1.5" onClick={() => act(() => orgApi.setManager(node.id, { managerUserId: form.managerUserId || null, rowVersion: node.rowVersion }), 'مدیر گره ذخیره شد')}>ذخیره مدیر</button>
            )}
            {inNode.length > 0 && <p className="text-xs text-slate-500">افراد این گره: {inNode.map((p) => p.displayName).join('، ')}</p>}
          </section>

          <section className="bg-white rounded-xl border p-4 space-y-2 text-sm">
            <h2 className="font-medium">جای گره در چارت</h2>
            <select className="w-full border rounded-lg px-2 py-1.5" value={form.parentNodeId} disabled={!canMove} onChange={(e) => setForm({ ...form, parentNodeId: e.target.value })}>
              <option value="">سطح اول شرکت</option>
              {companyNodes.map((n) => <option key={n.id} value={n.id}>{n.name}{n.nodeTypeName ? ` (${n.nodeTypeName})` : ''}</option>)}
            </select>
            {canMove && (
              <button className="rounded-lg border px-3 py-1.5" onClick={() => act(() => orgApi.move(node.id, { parentNodeId: form.parentNodeId || null, rowVersion: node.rowVersion }), 'جای گره ذخیره شد')}>جابه‌جایی</button>
            )}
            <p className="text-xs text-slate-500">جابه‌جایی زیر خود گره یا زیرمجموعه‌اش، یا به شرکتی که پست و نفر دارد، پذیرفته نمی‌شود.</p>
          </section>

          <section className="bg-white rounded-xl border p-4 space-y-2 text-sm">
            <h2 className="font-medium">وضعیت</h2>
            <p className="text-xs text-slate-500">{node.isActive ? 'گره فعال است و در چارت دیده می‌شود.' : 'گره غیرفعال است و در چارت امروز دیده نمی‌شود.'}</p>
            {canDeactivate && (
              <button className="rounded-lg border px-3 py-1.5 disabled:opacity-50" disabled={node.childCount > 0}
                onClick={() => {
                  if (node.isActive && !confirm(`«${node.name}» غیرفعال شود؟`)) return;
                  act(() => orgApi.setActive(node.id, !node.isActive, node.rowVersion), node.isActive ? 'گره غیرفعال شد' : 'گره فعال شد');
                }}>{node.isActive ? 'غیرفعال کردن' : 'فعال کردن'}</button>
            )}
            {node.isActive && node.childCount > 0 && <p className="text-xs text-slate-500">برای غیرفعال کردن، اول گره‌های زیر آن را جابه‌جا کنید.</p>}
          </section>
        </div>
      </div>

      {appointTo && <AppointDialog post={appointTo} people={people} onClose={() => setAppointTo(null)} onDone={async () => { setAppointTo(null); await act(async () => {}, 'انتصاب ثبت شد'); }} />}
      {historyOf && <PostHistoryDialog post={historyOf} onClose={() => setHistoryOf(null)} onChange={() => act(async () => {}, 'انتصاب آینده لغو شد')} />}
    </div>
  );
}

function AppointDialog({ post, people, onClose, onDone }: { post: UnitPosition; people: UserAssignment[]; onClose: () => void; onDone: () => Promise<void> }) {
  const [userId, setUserId] = useState(people[0]?.userId ?? '');
  const [startDate, setStartDate] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true); setError('');
    try {
      await orgApi.appoint(post.id, { userId, startDate: isoStart(startDate) });
      await onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`انتصاب روی «${post.title}»${post.code ? ` (${post.code})` : ''}`} onClose={onClose}>
      <div className="space-y-3 text-sm">
        <label className="block">فرد
          <select className="mt-1 w-full border rounded-lg px-2 py-1.5" value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">انتخاب فرد…</option>
            {people.map((p) => <option key={p.userId} value={p.userId}>{p.displayName} — {p.unitName || p.companyName}</option>)}
          </select>
        </label>
        <label className="block">از تاریخ (خالی = همین حالا)
          <input type="date" className="mt-1 w-full border rounded-lg px-2 py-1.5" dir="ltr" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        {people.length === 0 && <p className="text-xs text-amber-700">فردی در این شرکت جایگاه ندارد؛ اول جایگاه افراد را ثبت کنید.</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button className="rounded-lg border px-4 py-1.5" onClick={onClose}>انصراف</button>
          <button className="rounded-lg bg-blue-600 text-white px-4 py-1.5 disabled:opacity-50" disabled={!userId || busy} onClick={submit}>ثبت انتصاب</button>
        </div>
      </div>
    </Modal>
  );
}

function PostHistoryDialog({ post, onClose, onChange }: { post: UnitPosition; onClose: () => void; onChange: () => Promise<void> }) {
  const [rows, setRows] = useState<Appointment[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    orgApi.postHistory(post.id).then(setRows).catch((e: Error) => setError(e.message));
  }, [post.id]);
  useEffect(load, [load]);

  const now = Date.now();
  const upcoming = rows?.find((r) => r.startDate && new Date(r.startDate).getTime() > now);

  return (
    <Modal title={`سابقه «${post.title}»`} onClose={onClose}>
      <div className="space-y-3 text-sm">
        {error && <p className="text-red-600">{error}</p>}
        {!rows && !error && <p className="text-slate-500">...</p>}
        <ul className="divide-y max-h-72 overflow-auto">
          {(rows ?? []).map((r) => (
            <li key={r.id} className="py-2 flex flex-wrap items-center gap-2">
              <span className="font-medium">{r.person.displayName}</span>
              <span className={r.isActive ? 'text-xs rounded-full bg-green-50 text-green-700 px-2' : 'text-xs rounded-full bg-slate-100 text-slate-500 px-2'}>{r.isActive ? 'اکنون' : 'پیشین'}</span>
              <span className="ms-auto text-xs text-slate-500">از {faDate(r.startDate)} تا {r.endDate ? faDate(r.endDate) : 'بدون پایان'}</span>
            </li>
          ))}
          {rows?.length === 0 && <li className="py-4 text-center text-slate-400">سابقه‌ای نیست.</li>}
        </ul>
        {upcoming && (
          <button className="rounded-lg border border-amber-300 text-amber-800 px-3 py-1.5 text-xs"
            onClick={async () => {
              if (!confirm(`انتصاب آینده ${upcoming.person.displayName} لغو شود؟`)) return;
              try {
                await orgApi.cancelUpcoming(post.id);
                await onChange();
                load();
              } catch (e) {
                setError((e as Error).message);
              }
            }}>لغو انتصاب آینده ({upcoming.person.displayName})</button>
        )}
        <div className="flex justify-end"><button className="rounded-lg border px-4 py-1.5" onClick={onClose}>بستن</button></div>
      </div>
    </Modal>
  );
}
