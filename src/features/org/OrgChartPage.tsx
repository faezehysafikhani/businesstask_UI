import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, CalendarRange, Users } from 'lucide-react';
import { faDate, orgApi, type OrgChartCompany, type OrgChartUnit, type OrgCompany } from '../../api/org';

// The organization chart: companies, their units (nodes) and each node's posts and people, as it is
// today or on a chosen day (a node with validity dates exists only in that range).
export function OrgChartPage() {
  const [companies, setCompanies] = useState<OrgCompany[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [asOf, setAsOf] = useState('');
  const [chart, setChart] = useState<OrgChartCompany | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    orgApi.companies().then((list) => {
      setCompanies(list);
      setCompanyId((current) => current || list[0]?.id || '');
    }).catch((e: Error) => setError(e.message));
  }, []);

  const load = useCallback(() => {
    if (!companyId) return;
    setLoading(true);
    setError('');
    const asOfIso = asOf ? new Date(`${asOf}T12:00:00`).toISOString() : null;
    orgApi.chart(companyId, asOfIso)
      .then((list) => setChart(list.find((company) => company.companyId === companyId) ?? list[0] ?? null))
      .catch((e: Error) => { setChart(null); setError(e.message); })
      .finally(() => setLoading(false));
  }, [companyId, asOf]);
  useEffect(load, [load]);

  const company = companies.find((c) => c.id === companyId);

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-xl font-bold">ساختار سازمانی</h1>
          <p className="text-xs text-slate-500 mt-1">شرکت‌ها، گره‌های چارت، پست‌ها و افرادی که آن‌ها را دارند. برای ویرایش روی هر گره بزنید.</p>
        </div>
        <Link to="/organization/people" className="ms-auto inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50"><Users size={15} /> جایگاه افراد</Link>
      </div>

      <div className="flex flex-wrap items-end gap-3 bg-white rounded-xl border p-3 text-sm">
        <label className="block">شرکت
          <select className="mt-1 block border rounded-lg px-2 py-1.5 min-w-52" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
          </select>
        </label>
        <label className="block">نمودار در تاریخ
          <input type="date" className="mt-1 block border rounded-lg px-2 py-1.5" dir="ltr" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
        </label>
        {asOf && <button className="inline-flex items-center gap-1 text-xs underline self-center" onClick={() => setAsOf('')}><CalendarRange size={13} /> امروز</button>}
        {asOf && <span className="text-xs text-slate-500 self-center">فقط گره‌هایی که در این روز وجود دارند.</span>}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {companies.length === 0 && !error && <p className="text-sm text-slate-500">شرکتی ثبت نشده است.</p>}
      {loading && <p className="text-sm text-slate-500">...</p>}

      {chart && !loading && (
        <section className="orgtree bg-white rounded-xl border p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Building2 size={18} className="text-slate-400" />
            <h2 className="font-bold">{chart.name}</h2>
            <span className="text-xs text-slate-400" dir="ltr">{chart.code}</span>
            {!chart.isActive && <span className="text-xs rounded-full bg-slate-100 text-slate-500 px-2">غیرفعال</span>}
            <span className="text-xs text-slate-500">{chart.peopleCount} نفر</span>
            {chart.manager && <span className="text-xs text-slate-500">· {chart.headTitle || 'رئیس کل'}: <span className="font-medium text-slate-700">{chart.manager.displayName}</span></span>}
          </div>

          {chart.units.length === 0 && <p className="text-sm text-slate-500">برای این شرکت هنوز گره‌ای در چارت ساخته نشده است.</p>}
          {chart.units.length > 0 && <ul className="roots space-y-0.5">{chart.units.map((unit) => <UnitRow key={unit.unitId} unit={unit} />)}</ul>}

          {chart.members.length > 0 && (
            <div className="pt-2 border-t text-xs text-slate-500">
              بدون گره: {chart.members.map((m) => m.displayName).join('، ')}
            </div>
          )}
          {chart.positions && chart.positions.length > 0 && (
            <div className="pt-2 border-t text-xs text-slate-500 space-y-1">
              {chart.positions.map((p) => (
                <div key={p.unitPositionId}>{p.title}{p.code ? ` (${p.code})` : ''}: {p.holders.length ? p.holders.map((h) => h.displayName).join('، ') : 'بدون متصدی'}</div>
              ))}
            </div>
          )}
        </section>
      )}

      {company && !chart && !loading && !error && <p className="text-sm text-slate-500">نموداری برای «{company.name}» نیست.</p>}
      {asOf && <p className="text-xs text-slate-400">نمودار {faDate(new Date(`${asOf}T12:00:00`).toISOString())}</p>}
    </div>
  );
}

function UnitRow({ unit }: { unit: OrgChartUnit }) {
  const posts = unit.positions ?? [];
  return (
    <li>
      <details open>
        <summary className="flex flex-wrap items-center gap-2 cursor-pointer list-none py-1.5">
          <span className="size-2 rounded-full shrink-0" style={{ background: unit.nodeType?.color ?? '#94a3b8' }} />
          <Link to={`/organization/nodes/${unit.unitId}`} className="font-medium hover:text-blue-700">{unit.name}</Link>
          {unit.nodeType && <span className="text-[11px] rounded-full px-2" style={{ color: unit.nodeType.color, background: `${unit.nodeType.color}1a` }}>{unit.nodeType.name}</span>}
          {!unit.isActive && <span className="text-[11px] rounded-full bg-slate-100 text-slate-500 px-2">غیرفعال</span>}
          {unit.manager && <span className="text-xs text-slate-500">مدیر: {unit.manager.displayName}</span>}
          <span className="ms-auto text-xs text-slate-400">{unit.peopleCount} نفر · {posts.length} پست</span>
        </summary>

        {posts.length > 0 && (
          <ul className="ms-2 mb-1 space-y-0.5 text-xs text-slate-600">
            {posts.map((post) => (
              <li key={post.unitPositionId}>
                <span className="text-slate-500">{post.title}{post.code ? ` (${post.code})` : ''}:</span>{' '}
                {post.holders.length > 0 ? post.holders.map((h) => h.displayName).join('، ') : <span className="text-slate-400">بدون متصدی</span>}
              </li>
            ))}
          </ul>
        )}

        {unit.children.length > 0 && <ul className="space-y-0.5">{unit.children.map((child) => <UnitRow key={child.unitId} unit={child} />)}</ul>}
      </details>
    </li>
  );
}
