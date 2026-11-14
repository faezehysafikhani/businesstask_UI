import { useCallback, useEffect, useMemo, useState } from 'react';
import { SortTh, useSort } from '../../ui/table';
import { Empty } from '../../ui/Empty';
import { Link } from 'react-router-dom';
import { ArrowRight, UserRoundX, ArrowLeftRight } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { useAuth } from '../../auth/AuthContext';
import {
  faDate, isoStart, orgApi,
  type Appointment, type OffboardResult, type OrgCompany, type TransferResult, type UserAssignment,
} from '../../api/org';

// The people's places: each person's company, unit, position, manager and every post they hold -
// with leaving the organization (posts freed or handed to a successor) and moving posts to someone.
export function OrgPeoplePage() {
  const { me } = useAuth();
  const canManage = !!me?.permissions.includes('org_structure.manage_assignments');

  const [companies, setCompanies] = useState<OrgCompany[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [rows, setRows] = useState<UserAssignment[]>([]);
  const [query, setQuery] = useState('');
  const [dialog, setDialog] = useState<{ kind: 'offboard' | 'transfer' | 'history'; person: UserAssignment } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    orgApi.companies().then(setCompanies).catch((e: Error) => setError(e.message));
  }, []);

  const load = useCallback(() => {
    setLoading(true); setError('');
    orgApi.assignments(companyId || null)
      .then(setRows)
      .catch((e: Error) => { setRows([]); setError(e.message); })
      .finally(() => setLoading(false));
  }, [companyId]);
  useEffect(load, [load]);

  const shown = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return rows;
    return rows.filter((r) => [r.displayName, r.companyName, r.unitName, r.positionTitle, ...(r.positions ?? []).map((p) => `${p.title} ${p.unitName}`)]
      .some((value) => value?.toLowerCase().includes(text)));
  }, [rows, query]);
  const { sorted: sortedRows, sort, toggle } = useSort(shown, {
    who: (r) => r.displayName, company: (r) => `${r.companyName} ${r.unitName ?? ''}`, post: (r) => r.positionTitle ?? '', manager: (r) => r.manager?.displayName ?? '',
  });

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-2xl font-bold">جایگاه افراد</h1>
          <p className="text-xs text-slate-500 mt-1">شرکت، واحد، سمت و مدیر هر فرد و همه‌ی پست‌هایی که دارد؛ خروج از سازمان و انتقال پست‌ها از همین‌جا.</p>
        </div>
        <Link to="/organization" className="ms-auto inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50"><ArrowRight size={15} /> چارت سازمانی</Link>
      </div>

      <div className="flex flex-wrap items-end gap-3 bg-white rounded-xl border p-3 text-sm">
        <label className="block">شرکت
          <select className="mt-1 block border rounded-lg px-2 py-1.5 min-w-52" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
            <option value="">همه‌ی شرکت‌ها</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="block flex-1 min-w-48">جستجو
          <input data-search autoComplete="off" className="mt-1 block w-full border rounded-lg px-2 py-1.5" placeholder="نام، واحد یا سمت" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <span className="text-xs text-slate-500 self-center">{shown.length} نفر</span>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-slate-500">...</p>}

      {!loading && (
        <div className="rounded-[20px] bg-white shadow-[0_10px_40px_rgba(60,50,160,.10)]">
          <table className="cards w-full text-sm">
            <thead className="text-xs text-slate-500">
              <tr>
                <SortTh k="who" sort={sort} onSort={toggle}>فرد</SortTh>
                <SortTh k="company" sort={sort} onSort={toggle}>شرکت / واحد</SortTh>
                <SortTh k="post" sort={sort} onSort={toggle}>سمت و پست‌ها</SortTh>
                <SortTh k="manager" sort={sort} onSort={toggle}>مدیر</SortTh>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr key={row.userId} className="align-top">
                  <td className="p-3" data-label="فرد">
                    <div className={row.isUserActive ? 'font-medium' : 'font-medium line-through text-slate-400'}>{row.displayName}</div>
                    {!row.isUserActive && <span className="text-[11px] text-slate-400">حساب غیرفعال</span>}
                  </td>
                  <td className="p-3 text-slate-600" data-label="شرکت / واحد">
                    <div>{row.companyName}</div>
                    {row.unitName && <div className="text-xs text-slate-500">{row.unitName}</div>}
                  </td>
                  <td className="p-3 text-slate-600" data-label="سمت">
                    <div>{row.positionTitle ?? '—'}</div>
                    {row.positions && row.positions.length > 1 && (
                      <div className="text-xs text-slate-500">{row.positions.map((p) => `${p.title} (${p.unitName})`).join(' · ')}</div>
                    )}
                  </td>
                  <td className="p-3 text-slate-600" data-label="مدیر">{row.manager?.displayName ?? '—'}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap justify-end gap-3 text-xs whitespace-nowrap">
                      <button className="underline text-slate-600" onClick={() => setDialog({ kind: 'history', person: row })}>سابقه</button>
                      {canManage && <button className="inline-flex items-center gap-1 underline text-blue-700" onClick={() => setDialog({ kind: 'transfer', person: row })}><ArrowLeftRight size={12} /> انتقال</button>}
                      {canManage && <button className="inline-flex items-center gap-1 underline text-red-600" onClick={() => setDialog({ kind: 'offboard', person: row })}><UserRoundX size={12} /> خروج</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length === 0 && <Empty icon="👥" text="کسی با این مشخصات نیست." />}
        </div>
      )}

      {dialog?.kind === 'offboard' && (
        <OffboardDialog person={dialog.person} people={rows} companies={companies}
          onClose={() => setDialog(null)} onDone={() => { setDialog(null); load(); }} />
      )}
      {dialog?.kind === 'transfer' && (
        <TransferDialog person={dialog.person} people={rows}
          onClose={() => setDialog(null)} onDone={() => { setDialog(null); load(); }} />
      )}
      {dialog?.kind === 'history' && <PersonHistoryDialog person={dialog.person} onClose={() => setDialog(null)} />}
    </div>
  );
}

function OffboardDialog({ person, people, companies, onClose, onDone }: {
  person: UserAssignment; people: UserAssignment[]; companies: OrgCompany[]; onClose: () => void; onDone: () => void;
}) {
  const posts = person.positions ?? [];
  const others = people.filter((p) => p.userId !== person.userId && p.isUserActive && p.companyId === person.companyId);
  const [successor, setSuccessor] = useState('');
  const [checked, setChecked] = useState<string[]>(posts.map((p) => p.unitPositionId));
  const [result, setResult] = useState<OffboardResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true); setError('');
    try {
      setResult(await orgApi.offboard(person.userId, { successorUserId: successor || null, postIds: successor ? checked : null }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`خروج «${person.displayName}» از سازمان`} onClose={onClose}>
      <div className="space-y-3 text-sm">
        <p className="text-xs text-slate-500">همه‌ی پست‌های فعلی از همین حالا آزاد می‌شوند. اگر جانشین انتخاب کنید، پست‌های تیک‌خورده همین حالا به او می‌رسند؛ انتصاب‌هایی که هنوز شروع نشده‌اند لغو می‌شوند.</p>

        {result ? (
          <div className="space-y-1">
            <p className="text-green-700">خروج ثبت شد.</p>
            <p>{result.ended.length} پست آزاد شد، {result.transferred.length} پست به جانشین رسید، {result.cancelled.length} انتصاب آینده لغو شد.</p>
            {result.headlessCompanyIds.length > 0 && (
              <p className="text-amber-700">این شرکت‌ها بدون رئیس ماندند: {result.headlessCompanyIds.map((id) => companies.find((c) => c.id === id)?.name ?? id).join('، ')}. رئیس تازه را از چارت تعیین کنید.</p>
            )}
            <div className="flex justify-end pt-2"><button className="rounded-lg bg-blue-600 text-white px-4 py-1.5" onClick={onDone}>بستن</button></div>
          </div>
        ) : (
          <>
            <label className="block">جانشین (اختیاری)
              <select className="mt-1 w-full border rounded-lg px-2 py-1.5" value={successor} onChange={(e) => setSuccessor(e.target.value)}>
                <option value="">بدون جانشین — همه آزاد شوند</option>
                {others.map((p) => <option key={p.userId} value={p.userId}>{p.displayName} — {p.unitName || p.companyName}</option>)}
              </select>
            </label>

            <div className="space-y-1">
              <div className="text-xs text-slate-500">{successor ? 'پست‌هایی که به جانشین می‌رسند:' : 'پست‌های فعلی:'}</div>
              {posts.map((post) => (
                <label key={post.unitPositionId} className="flex items-center gap-2">
                  <input type="checkbox" disabled={!successor} checked={successor ? checked.includes(post.unitPositionId) : false}
                    onChange={(e) => setChecked(e.target.checked ? [...checked, post.unitPositionId] : checked.filter((id) => id !== post.unitPositionId))} />
                  <span>{post.title}</span><span className="text-xs text-slate-400">{post.unitName}</span>
                </label>
              ))}
              {posts.length === 0 && <p className="text-xs text-amber-700">برای این فرد پستی ثبت نشده است؛ اگر انتصاب فعالی هم نداشته باشد، خروج ثبت نمی‌شود.</p>}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button className="rounded-lg border px-4 py-1.5" onClick={onClose}>انصراف</button>
              <button className="rounded-lg bg-red-600 text-white px-4 py-1.5 disabled:opacity-50" disabled={busy} onClick={submit}>ثبت خروج</button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function TransferDialog({ person, people, onClose, onDone }: { person: UserAssignment; people: UserAssignment[]; onClose: () => void; onDone: () => void }) {
  const posts = person.positions ?? [];
  const others = people.filter((p) => p.userId !== person.userId && p.isUserActive && p.companyId === person.companyId);
  const [toUser, setToUser] = useState('');
  const [date, setDate] = useState('');
  const [checked, setChecked] = useState<string[]>(posts.map((p) => p.unitPositionId));
  const [result, setResult] = useState<TransferResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true); setError('');
    try {
      const all = checked.length === posts.length;
      setResult(await orgApi.transfer(person.userId, { toUserId: toUser, effectiveDate: isoStart(date), postIds: all ? null : checked }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`انتقال پست‌های «${person.displayName}»`} onClose={onClose}>
      <div className="space-y-3 text-sm">
        <p className="text-xs text-slate-500">پست‌های انتخابی از امروز (یا روزی که انتخاب می‌کنید) به فرد دیگر می‌رسند و انتصاب قبلی همان روز تمام می‌شود. اگر روز آینده باشد، تا آن روز تغییر فعلی نمی‌شود.</p>

        {result ? (
          <div className="space-y-1">
            <p className="text-green-700">{result.transferred.length} پست از {faDate(result.effectiveDate)} منتقل شد.</p>
            <ul className="text-xs text-slate-600">{result.transferred.map((a) => <li key={a.id}>{a.postTitle}{a.postCode ? ` (${a.postCode})` : ''} — {a.place}</li>)}</ul>
            <div className="flex justify-end pt-2"><button className="rounded-lg bg-blue-600 text-white px-4 py-1.5" onClick={onDone}>بستن</button></div>
          </div>
        ) : (
          <>
            <label className="block">به فرد
              <select className="mt-1 w-full border rounded-lg px-2 py-1.5" value={toUser} onChange={(e) => setToUser(e.target.value)}>
                <option value="">انتخاب فرد…</option>
                {others.map((p) => <option key={p.userId} value={p.userId}>{p.displayName} — {p.unitName || p.companyName}</option>)}
              </select>
            </label>
            <label className="block">از تاریخ (خالی = همین حالا)
              <input type="date" className="mt-1 w-full border rounded-lg px-2 py-1.5" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>

            <div className="space-y-1">
              <div className="text-xs text-slate-500">پست‌ها:</div>
              {posts.map((post) => (
                <label key={post.unitPositionId} className="flex items-center gap-2">
                  <input type="checkbox" checked={checked.includes(post.unitPositionId)}
                    onChange={(e) => setChecked(e.target.checked ? [...checked, post.unitPositionId] : checked.filter((id) => id !== post.unitPositionId))} />
                  <span>{post.title}</span><span className="text-xs text-slate-400">{post.unitName}</span>
                </label>
              ))}
              {posts.length === 0 && <p className="text-xs text-amber-700">این فرد پست فعالی برای انتقال ندارد.</p>}
            </div>

            {others.length === 0 && <p className="text-xs text-amber-700">فرد فعال دیگری در این شرکت جایگاه ندارد.</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button className="rounded-lg border px-4 py-1.5" onClick={onClose}>انصراف</button>
              <button className="rounded-lg bg-blue-600 text-white px-4 py-1.5 disabled:opacity-50" disabled={!toUser || checked.length === 0 || busy} onClick={submit}>انتقال</button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function PersonHistoryDialog({ person, onClose }: { person: UserAssignment; onClose: () => void }) {
  const [rows, setRows] = useState<Appointment[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    orgApi.userHistory(person.userId).then(setRows).catch((e: Error) => setError(e.message));
  }, [person.userId]);

  return (
    <Modal title={`سابقه انتصاب‌های ${person.displayName}`} onClose={onClose}>
      <div className="space-y-3 text-sm">
        <p className="text-xs text-slate-500">{person.companyName} · {person.unitName ?? 'بدون واحد'}</p>
        {error && <p className="text-red-600">{error}</p>}
        {!rows && !error && <p className="text-slate-500">...</p>}
        <ul className="divide-y max-h-72 overflow-auto">
          {(rows ?? []).map((a) => (
            <li key={a.id} className="py-2 flex flex-wrap items-center gap-2">
              <span className="font-medium">{a.postTitle ?? '—'}{a.postCode ? ` (${a.postCode})` : ''}</span>
              <span className="text-xs text-slate-500">{a.place}</span>
              <span className={a.isActive ? 'text-[11px] rounded-full bg-green-50 text-green-700 px-2' : 'text-[11px] rounded-full bg-slate-100 text-slate-500 px-2'}>{a.isActive ? 'اکنون' : 'پیشین'}</span>
              <span className="ms-auto text-xs text-slate-500">از {faDate(a.startDate)} تا {a.endDate ? faDate(a.endDate) : 'بدون پایان'}</span>
            </li>
          ))}
          {rows?.length === 0 && <li className="py-4 text-center text-slate-400">انتصابی ثبت نشده است.</li>}
        </ul>
        <div className="flex justify-end"><button className="rounded-lg border px-4 py-1.5" onClick={onClose}>بستن</button></div>
      </div>
    </Modal>
  );
}
