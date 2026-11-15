import { notify } from '../ui/toast';
import { faMessage, statusMessage } from './messages';

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

// The host keeps the refresh token in an HttpOnly cookie (Identity:Session), not in the body.
// A request that relies on that cookie asks for it with X-Nexus-Session: cookie and proves it is
// not a cross-site form with X-Requested-With; without both headers the host refuses the cookie.
const AUTH_PREFIX = '/api/identity/auth/';
const COOKIE_SESSION_HEADERS = { 'X-Nexus-Session': 'cookie', 'X-Requested-With': 'XMLHttpRequest' };

let refreshing: Promise<boolean> | null = null;
async function refresh(): Promise<boolean> {
  const s = sessionStore.get();
  if (!s) return false;
  refreshing ??= (async () => {
    try {
      const r = await fetch(`${BASE}/api/identity/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...COOKIE_SESSION_HEADERS },
        // Older hosts take the token from the body; the current one only reads the cookie.
        body: JSON.stringify(s.refreshToken ? { refreshToken: s.refreshToken } : {}),
      });
      if (!r.ok) return false;
      const d = await r.json();
      sessionStore.set({ accessToken: d.accessToken, refreshToken: d.refreshToken || s.refreshToken });
      return true;
    } catch { return false; } finally { setTimeout(() => { refreshing = null; }, 0); }
  })();
  return refreshing;
}

// The host answers with enums as names ("InProgress"); the screens work with numbers. The tables
// below turn the names back into numbers for the task-management and workflow answers only (the
// project modules keep names, as their screens expect).
const T = { Todo: 0, InProgress: 1, Paused: 2, Completed: 3 };
const PRI = { Low: 0, Medium: 1, High: 2 };
const APPROVAL = { NotSubmitted: 0, PendingApproval: 1, Approved: 2, Rejected: 3 };
const REQUEST = { New: 0, Converted: 1, Rejected: 2 };
const SOURCE = { Manual: 0, Timer: 1 };
const WORKFLOW = { InProgress: 0, Approved: 1, Rejected: 2 };
type Table = Record<string, number>;
const RULES: [RegExp, Record<string, Table>][] = [
  [/^\/api\/task-management\/tasks/, { status: T, priority: PRI, reviewStatus: APPROVAL }],
  [/^\/api\/task-management\/templates/, { priority: PRI }],
  [/^\/api\/task-management\/requests/, { status: REQUEST, priority: PRI, defaultPriority: PRI }],
  [/^\/api\/task-management\/timesheets/, { status: APPROVAL, source: SOURCE }],
  [/^\/api\/workflow\//, { status: WORKFLOW }],
];
function numberEnums(v: unknown, tables: Record<string, Table>): unknown {
  if (Array.isArray(v)) return v.map((x) => numberEnums(x, tables));
  if (v && typeof v === 'object') {
    const o: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) {
      const t = tables[k];
      o[k] = typeof x === 'string' && t && x in t ? t[x] : numberEnums(x, tables);
    }
    return o;
  }
  return v;
}

async function toError(r: Response): Promise<ApiError> {
  let code = 'error', msg = '';
  try {
    const p = await r.json();
    code = p.title ?? code;
    // A validation answer lists the fields' messages; those say more than its title.
    const fields = p.errors && typeof p.errors === 'object' ? Object.values(p.errors).flat().map(String) : [];
    msg = fields.length ? fields.map((x) => faMessage(x, r.status)).join(' ') : faMessage(p.detail ?? p.title ?? '', r.status);
  } catch { /* no body */ }
  return new ApiError(r.status, code, msg || statusMessage(r.status));
}

export async function api<T = void>(method: string, path: string, body?: unknown, retry = true): Promise<T> {
  const s = sessionStore.get();
  const auth = path.startsWith(AUTH_PREFIX);
  let r: Response;
  try {
    r = await fetch(`${BASE}${path}`, {
      method,
      // The refresh cookie travels with the auth calls (the same origin in development through the
      // proxy; a cross-origin deployment must also allow credentials in its CORS policy).
      credentials: auth ? 'include' : 'same-origin',
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(s ? { Authorization: `Bearer ${s.accessToken}` } : {}),
        ...(auth ? COOKIE_SESSION_HEADERS : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    // No answer at all: the network or the server is down.
    if (method !== 'GET') notify('error', statusMessage(0));
    throw new ApiError(0, 'network', statusMessage(0));
  }
  if (r.status === 401 && retry && s && await refresh()) return api<T>(method, path, body, false);
  if (r.status === 401 && s) { sessionStore.set(null); notify('error', 'نشست شما به پایان رسید؛ دوباره وارد شوید.'); onSignedOut(); }
  const change = method !== 'GET' && !auth;
  if (!r.ok) {
    const err = await toError(r);
    if (change && r.status !== 401) notify('error', err.message);
    throw err;
  }
  // Reads that use POST (preview, check, analysis) are not changes: no "saved" message for them.
  if (change && !/(preview|check|analy[sz]e|progress|for-projects|in-review|matrix|sessions\/current)/.test(path)) {
    notify('success', method === 'DELETE' ? 'حذف شد' : method === 'PUT' ? 'ذخیره شد' : 'انجام شد');
  }
  if (r.status === 204) return undefined as T;
  // An answer of "nothing" (for example no running timer) has an empty body.
  const text = await r.text();
  let data: unknown;
  try { data = text ? JSON.parse(text) : null; } catch { throw new ApiError(r.status, 'bad_response', 'پاسخ سرور قابل خواندن نیست؛ کمی بعد دوباره تلاش کنید.'); }
  const rule = RULES.find(([re]) => re.test(path));
  return (rule ? numberEnums(data, rule[1]) : data) as T;
}
