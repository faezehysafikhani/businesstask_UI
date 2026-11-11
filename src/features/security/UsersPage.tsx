import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Copy } from 'lucide-react';
import { api, ApiError } from '../../api/client';
import type { ApiKeyInfo, Paged, ServiceAccount, User } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';

const KIND: Record<string, string> = { Normal: 'عادی', Guest: 'مهمان', ServiceAccount: 'حساب سرویس' };

// Users (guests and the SMS code reset) and service accounts with their API keys (a key is shown once).
export function UsersPage() {
  const { can } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [accounts, setAccounts] = useState<ServiceAccount[]>([]);
  const [name, setName] = useState('');
  const [secret, setSecret] = useState<{ label: string; value: string } | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => {
    api<Paged<User>>('GET', '/api/identity/users?pageSize=200').then((p) => setUsers(p.items)).catch((e) => setError(e.message));
    api<ServiceAccount[]>('GET', '/api/identity/service-accounts').then(setAccounts).catch(() => setAccounts([]));
  }, []);
  useEffect(load, [load]);

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
        <ul className="bg-white rounded-xl border divide-y text-sm">
          {users.filter((u) => u.kind !== 'ServiceAccount').map((u) => (
            <li key={u.id} className="p-3 flex items-center gap-3">
              <span className={u.isActive === false ? 'line-through text-slate-400' : 'font-medium'}>{u.displayName}</span>
              <span className="text-xs text-slate-400" dir="ltr">{u.username}</span>
              {u.kind === 'Guest' && <span className="text-xs rounded-full bg-purple-50 text-purple-700 px-2">مهمان</span>}
              {u.mfaEnabled && <span className="text-xs rounded-full bg-green-50 text-green-700 px-2">رمز دوم</span>}
              {update && <span className="ms-auto flex gap-3 text-xs">
                <button className="underline" onClick={() => act(() => api('PUT', `/api/identity/users/${u.id}/kind`, { kind: u.kind === 'Guest' ? 'Normal' : 'Guest' }))}>{u.kind === 'Guest' ? 'عادی شود' : 'مهمان شود'}</button>
                {u.mfaEnabled && <button className="underline" onClick={() => confirm('رمز دوم این کاربر خاموش شود؟') && act(() => api('POST', `/api/identity/users/${u.id}/mfa/reset`))}>بازنشانی رمز دوم</button>}
              </span>}
            </li>
          ))}
          {users.length === 0 && <li className="p-6 text-center text-slate-400">کاربری نیست</li>}
        </ul>
        <p className="text-xs text-slate-400">مهمان‌ها در سقف کاربران پلن حساب نمی‌شوند؛ دسترسی‌شان فقط همان است که مدیر می‌دهد و وظایفی که به آن‌ها داده شده.</p>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">حساب‌های سرویس (برای سیستم‌های دیگر)</h2>
        <p className="text-xs text-slate-500">سیستم دیگر کلید را به <code dir="ltr">POST /api/identity/auth/api-key/token</code> می‌دهد و توکن می‌گیرد؛ دسترسی‌های حساب مثل هر کاربری از بخش دسترسی‌ها تعیین می‌شود.</p>
        <ul className="bg-white rounded-xl border divide-y text-sm">
          {accounts.map((a) => (
            <li key={a.id} className="p-3 space-y-1">
              <div className="flex items-center gap-2"><span className="font-medium">{a.name}</span>
                {can('users.update') && <button className="ms-auto text-xs underline" onClick={() => act(async () => { const k = await api<{ key: ApiKeyInfo; secret: string }>('POST', `/api/identity/service-accounts/${a.id}/api-keys`, { name: prompt('نام کلید', 'کلید جدید') || 'key' }); setSecret({ label: k.key.name, value: k.secret }); })}>کلید جدید</button>}</div>
              <ul className="text-xs text-slate-500 space-y-0.5">
                {a.keys.map((k) => <li key={k.id} className="flex gap-2"><span className={k.revoked ? 'line-through' : ''}>{k.name}</span><span>ساخته‌شده {new Date(k.createdAtUtc).toLocaleDateString('fa-IR')}</span>
                  <span>{k.lastUsedAtUtc ? `آخرین استفاده ${new Date(k.lastUsedAtUtc).toLocaleDateString('fa-IR')}` : 'استفاده نشده'}</span>
                  {!k.revoked && can('users.update') && <button className="ms-auto underline text-red-600" onClick={() => confirm('کلید باطل شود؟') && act(() => api('DELETE', `/api/identity/service-accounts/${a.id}/api-keys/${k.id}`))}>ابطال</button>}</li>)}
              </ul>
            </li>
          ))}
          {accounts.length === 0 && <li className="p-6 text-center text-slate-400">حساب سرویسی نیست</li>}
        </ul>
        {can('users.create') && (
          <form className="flex gap-2 text-sm" onSubmit={(e: FormEvent) => { e.preventDefault(); act(async () => { const r = await api<{ account: ServiceAccount; secret: string }>('POST', '/api/identity/service-accounts', { name: name.trim() }); setSecret({ label: r.account.name, value: r.secret }); setName(''); }); }}>
            <input className="flex-1 border rounded-lg px-3 py-1.5" placeholder="نام حساب سرویس (مثلاً ربات گزارش)" value={name} onChange={(e) => setName(e.target.value)} />
            <button disabled={!name.trim()} className="rounded-lg bg-blue-600 text-white px-4 py-1.5 disabled:opacity-50">ساخت</button>
          </form>
        )}
      </section>
    </div>
  );
}
