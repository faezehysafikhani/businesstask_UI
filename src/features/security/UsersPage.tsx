import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { formatJalaliDate } from '../../ui/format';
import { Pager } from '../../ui/table';
import { CardFilterBar, useColumnFilters } from '../../ui/filters';
import { ACTIVE_OPTS } from '../../constants/enums';
import { Copy } from 'lucide-react';
import { api, ApiError } from '../../api/client';
import type { ApiKeyInfo, Paged, ServiceAccount, User } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { askConfirm, askText } from '../../ui/dialog';
import { DateInput } from '../../ui/dates';
import { Modal } from '../../ui/Modal';
import { Segmented } from '../../ui/fields';

const KIND: Record<string, string> = { Normal: 'عادی', Guest: 'مهمان', ServiceAccount: 'حساب سرویس' };

// Users (guests and the SMS code reset) and service accounts with their API keys (a key is shown once).
const USERS_PAGE = 15;
export function UsersPage() {
  const { can, me } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [accounts, setAccounts] = useState<ServiceAccount[]>([]);
  const [name, setName] = useState('');
  const [secret, setSecret] = useState<{ label: string; value: string } | null>(null);
  const [error, setError] = useState('');
  const [expiry, setExpiry] = useState<User | null>(null);
  const [expiryDate, setExpiryDate] = useState('');
  const people = users.filter((u) => u.kind !== 'ServiceAccount');
  const cf = useColumnFilters('users', people, [
    { key: 'q', kind: 'text', get: (u) => `${u.displayName} ${u.username ?? ''} ${u.email ?? ''}` },
    { key: 'act', kind: 'select', get: (u) => String(u.isActive !== false), options: ACTIVE_OPTS },
    { key: 'kind', kind: 'select', get: (u) => u.kind ?? 'Normal', options: [{ value: 'Normal', label: 'عادی' }, { value: 'Guest', label: 'مهمان' }] },
  ]);
  const [page, setPage] = useState(1);
  const [pol, setPol] = useState({ min: '10', classes: 3 });
  const load = useCallback(() => {
    api<Paged<User>>('GET', '/api/identity/users?pageSize=200').then((p) => setUsers(p.items)).catch((e) => setError(e.message));
    api<ServiceAccount[]>('GET', '/api/identity/service-accounts').then(setAccounts).catch(() => setAccounts([]));
  }, []);
  useEffect(load, [load]);
  useEffect(() => { api<{ minLength: number; requiredClasses: number }>('GET', '/api/platform/password-policy').then((p) => setPol({ min: String(p.minLength), classes: p.requiredClasses })).catch(() => {}); }, []);

  async function act(fn: () => Promise<void>) { setError(''); try { await fn(); load(); } catch (e) { setError(e instanceof ApiError ? e.message : 'خطا'); } }
  const update = can('users.update');

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-xl font-bold">کاربران و حساب‌های سرویس</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {secret && <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm">کلید «{secret.label}» (فقط همین یک‌بار نمایش داده می‌شود): <code dir="ltr" className="select-all break-all">{secret.value}</code>
        <button className="ms-2 inline-flex items-center gap-1 underline" onClick={() => navigator.clipboard?.writeText(secret.value)}><Copy size={12} /> کپی</button> <button className="underline ms-2" onClick={() => setSecret(null)}>بستن</button></div>}

      <section className="space-y-2">
        <h2 className="font-medium">کاربران</h2>
        <CardFilterBar f={cf} total={people.length} labels={{ q: 'نام یا نام کاربری', act: 'وضعیت', kind: 'نوع' }} />
        <ul className="bg-white rounded-xl border divide-y text-sm">
          {cf.filtered.slice((Math.min(page, Math.max(1, Math.ceil(cf.filtered.length / USERS_PAGE))) - 1) * USERS_PAGE, Math.min(page, Math.max(1, Math.ceil(cf.filtered.length / USERS_PAGE))) * USERS_PAGE).map((u) => (
            <li key={u.id} className="p-3 flex items-center gap-3">
              <span className={u.isActive === false ? 'line-through text-slate-400' : 'font-medium'}>{u.displayName}</span>
              <span className="text-xs text-slate-400" dir="ltr">{u.username}</span>
              {u.kind === 'Guest' && <span className="text-xs rounded-full bg-purple-50 text-purple-700 px-2">مهمان</span>}
              {u.mfaEnabled && <span className="text-xs rounded-full bg-green-50 text-green-700 px-2">رمز دوم</span>}
              {update && <span className="ms-auto flex gap-3 text-xs">
                {u.kind !== 'ServiceAccount' && <button className="underline" onClick={() => { setExpiry(u); setExpiryDate(''); }}>پایان اعتبار</button>}
                <button className="underline" onClick={() => act(() => api('PUT', `/api/identity/users/${u.id}/kind`, { kind: u.kind === 'Guest' ? 'Normal' : 'Guest' }))}>{u.kind === 'Guest' ? 'عادی شود' : 'مهمان شود'}</button>
                {u.mfaEnabled && <button className="underline" onClick={async () => (await askConfirm('رمز دوم این کاربر خاموش شود؟')) && act(() => api('POST', `/api/identity/users/${u.id}/mfa/reset`))}>بازنشانی رمز دوم</button>}
              </span>}
            </li>
          ))}
          {cf.filtered.length === 0 && <li className="p-6 text-center text-slate-400">کاربری نیست</li>}
        </ul>
        <Pager page={page} size={USERS_PAGE} total={cf.filtered.length} onPage={setPage} />
        <p className="text-xs text-slate-400">مهمان‌ها در سقف کاربران پلن حساب نمی‌شوند؛ دسترسی‌شان فقط همان است که مدیر می‌دهد و وظایفی که به آن‌ها داده شده.</p>
      </section>

      {can('settings.update') && (
        <section className="space-y-2">
          <h2 className="font-medium">سیاست رمز عبور سازمان</h2>
          <div className="bg-white rounded-xl border p-3 space-y-2 text-sm">
            <label className="flex items-center gap-2">حداقل طول رمز (۸ تا ۶۴)
              <input type="number" min={8} max={64} className="w-20 border rounded-lg px-2 py-1" value={pol.min} onChange={(e) => setPol({ ...pol, min: e.target.value })} /></label>
            <div className="flex items-center gap-2">حداقل انواع کاراکتر
              <Segmented value={pol.classes} onChange={(classes) => setPol({ ...pol, classes })} options={[2, 3, 4].map((n) => ({ value: n, label: n.toLocaleString('fa-IR') }))} /></div>
            <p className="text-xs text-slate-400">انواع کاراکتر: حرف کوچک، حرف بزرگ، رقم، نماد. فقط برای رمزهایی که از این پس تعیین می‌شوند.</p>
            <button className="rounded-lg bg-blue-600 text-white px-4 py-1.5" onClick={() => act(async () => {
              await api('PUT', '/api/platform/settings', { tenantId: me?.user.tenantId, key: 'Security.PasswordMinLength', value: pol.min, scope: 'System' });
              await api('PUT', '/api/platform/settings', { tenantId: me?.user.tenantId, key: 'Security.PasswordRequiredClasses', value: String(pol.classes), scope: 'System' });
            })}>ذخیره</button>
          </div>
        </section>
      )}

      {expiry && (
        <Modal title={`پایان اعتبار «${expiry.displayName}»`} onClose={() => setExpiry(null)}>
          <div className="space-y-3 text-sm">
            <p className="text-slate-500">بعد از این تاریخ، ورود و نشست‌های فعلی این حساب بسته می‌شود. برای برداشتن پایان، «بدون پایان» را بزنید.</p>
            <DateInput className="border rounded-lg px-2 py-1.5" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            <div className="flex justify-end gap-2">
              <button className="rounded-lg border px-4 py-1.5" onClick={() => act(async () => { await api('PUT', `/api/identity/users/${expiry.id}/access-expiry`, { expiresAtUtc: null }); setExpiry(null); })}>بدون پایان</button>
              <button disabled={!expiryDate} className="rounded-lg bg-blue-600 text-white px-4 py-1.5 disabled:opacity-50" onClick={() => act(async () => { await api('PUT', `/api/identity/users/${expiry.id}/access-expiry`, { expiresAtUtc: new Date(`${expiryDate}T23:59:59`).toISOString() }); setExpiry(null); })}>ثبت</button>
            </div>
          </div>
        </Modal>
      )}

      <section className="space-y-2">
        <h2 className="font-medium">حساب‌های سرویس (برای سیستم‌های دیگر)</h2>
        <p className="text-xs text-slate-500">سیستم دیگر کلید را به <code dir="ltr">POST /api/identity/auth/api-key/token</code> می‌دهد و توکن می‌گیرد؛ دسترسی‌های حساب مثل هر کاربری از بخش دسترسی‌ها تعیین می‌شود.</p>
        <ul className="bg-white rounded-xl border divide-y text-sm">
          {accounts.map((a) => (
            <li key={a.id} className="p-3 space-y-1">
              <div className="flex items-center gap-2"><span className="font-medium">{a.name}</span>
                {can('users.update') && <button className="ms-auto text-xs underline" onClick={() => act(async () => { const k = await api<{ key: ApiKeyInfo; secret: string }>('POST', `/api/identity/service-accounts/${a.id}/api-keys`, { name: (await askText('نام کلید', 'کلید جدید')) || 'key' }); setSecret({ label: k.key.name, value: k.secret }); })}>کلید جدید</button>}</div>
              <ul className="text-xs text-slate-500 space-y-0.5">
                {a.keys.map((k) => <li key={k.id} className="flex gap-2"><span className={k.revoked ? 'line-through' : ''}>{k.name}</span><span>ساخته‌شده {formatJalaliDate(k.createdAtUtc)}</span>
                  <span>{k.lastUsedAtUtc ? `آخرین استفاده ${formatJalaliDate(k.lastUsedAtUtc)}` : 'استفاده نشده'}</span>
                  {!k.revoked && can('users.update') && <button className="ms-auto underline text-red-600" onClick={async () => (await askConfirm('کلید باطل شود؟')) && act(() => api('DELETE', `/api/identity/service-accounts/${a.id}/api-keys/${k.id}`))}>ابطال</button>}</li>)}
              </ul>
            </li>
          ))}
          {accounts.length === 0 && <li className="p-6 text-center text-slate-400">حساب سرویسی نیست</li>}
        </ul>
        {can('users.create') && (
          <form className="flex gap-2 text-sm" onSubmit={(e: FormEvent) => { e.preventDefault(); act(async () => { const r = await api<{ account: ServiceAccount; secret: string }>('POST', '/api/identity/service-accounts', { name: name.trim() }); setSecret({ label: r.account.name, value: r.secret }); setName(''); }); }}>
            <input className="flex-1 border rounded-lg px-3 py-1.5" aria-label="نام حساب سرویس (مثلاً ربات گزارش)" placeholder="نام حساب سرویس (مثلاً ربات گزارش)" value={name} onChange={(e) => setName(e.target.value)} />
            <button disabled={!name.trim()} className="rounded-lg bg-blue-600 text-white px-4 py-1.5 disabled:opacity-50">ساخت</button>
          </form>
        )}
      </section>
    </div>
  );
}
