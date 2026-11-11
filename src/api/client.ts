// One fetch wrapper: bearer token, one silent refresh on 401, errors as ApiError (code = problem title).
const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';
const KEY = 'tm.session';

export interface Session { accessToken: string; refreshToken: string }

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
  get isConflict() { return this.status === 409; }
}

export const sessionStore = {
  get(): Session | null { try { return JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch { return null; } },
  set(s: Session | null) { try { s ? localStorage.setItem(KEY, JSON.stringify(s)) : localStorage.removeItem(KEY); } catch { /* ignore */ } },
};

let onSignedOut: () => void = () => {};
export const setSignedOutHandler = (fn: () => void) => { onSignedOut = fn; };

let refreshing: Promise<boolean> | null = null;
async function refresh(): Promise<boolean> {
  const s = sessionStore.get();
  if (!s?.refreshToken) return false;
  refreshing ??= (async () => {
    try {
      const r = await fetch(`${BASE}/api/identity/auth/refresh`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: s.refreshToken }),
      });
      if (!r.ok) return false;
      const d = await r.json();
      sessionStore.set({ accessToken: d.accessToken, refreshToken: d.refreshToken || s.refreshToken });
      return true;
    } catch { return false; } finally { setTimeout(() => { refreshing = null; }, 0); }
  })();
  return refreshing;
}

async function toError(r: Response): Promise<ApiError> {
  let code = 'error', msg = `خطا (${r.status})`;
  try { const p = await r.json(); code = p.title ?? code; msg = p.detail ?? p.title ?? msg; } catch { /* no body */ }
  return new ApiError(r.status, code, msg);
}

export async function api<T = void>(method: string, path: string, body?: unknown, retry = true): Promise<T> {
  const s = sessionStore.get();
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(s ? { Authorization: `Bearer ${s.accessToken}` } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (r.status === 401 && retry && s && await refresh()) return api<T>(method, path, body, false);
  if (r.status === 401 && s) { sessionStore.set(null); onSignedOut(); }
  if (!r.ok) throw await toError(r);
  if (r.status === 204) return undefined as T;
  // An answer of "nothing" (for example no running timer) has an empty body.
  const text = await r.text();
  return (text ? JSON.parse(text) : null) as T;
}
