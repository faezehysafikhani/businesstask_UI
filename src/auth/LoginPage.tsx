import { useState, type FormEvent } from 'react';
import { ApiError } from '../api/client';
import { useAuth } from './AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try { await login(identifier.trim(), password); }
    catch (x) {
      // The host asks for a CAPTCHA after failed attempts; the CAPTCHA step arrives with a later phase.
      setError(x instanceof ApiError ? (x.code === 'unauthorized.captcha_required' ? 'کپچا لازم است (به‌زودی)' : x.message) : 'اتصال به سرور برقرار نشد');
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-2xl shadow p-6 space-y-4">
        <h1 className="text-xl font-bold">ورود به سامانه</h1>
        <label className="block text-sm">نام کاربری یا موبایل
          <input className="mt-1 w-full border rounded-lg px-3 py-2" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoFocus dir="ltr" />
        </label>
        <label className="block text-sm">رمز عبور
          <input className="mt-1 w-full border rounded-lg px-3 py-2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={busy || !identifier || !password} className="w-full rounded-lg bg-blue-600 text-white py-2 disabled:opacity-50">{busy ? '...' : 'ورود'}</button>
      </form>
    </div>
  );
}
