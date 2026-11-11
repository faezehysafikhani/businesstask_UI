import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, sessionStore, setSignedOutHandler } from '../api/client';
import type { AuthResponse, MfaChallenge, Me } from '../api/types';

interface AuthState {
  me: Me | null; loading: boolean;
  can: (permission: string) => boolean;
  /** Resolves with the SMS-code challenge when the account needs a second step; otherwise signs in. */
  login: (identifier: string, password: string, captcha?: { id: string; answer: string }) => Promise<MfaChallenge | null>;
  completeMfa: (challengeId: string, code: string) => Promise<void>;
  reloadMe: () => Promise<void>;
  logout: () => Promise<void>;
}
const Ctx = createContext<AuthState | null>(null);
export const useAuth = () => { const c = useContext(Ctx); if (!c) throw new Error('AuthProvider missing'); return c; };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(!!sessionStore.get());

  const loadMe = useCallback(async () => { setMe(await api<Me>('GET', '/api/identity/auth/me')); }, []);

  useEffect(() => {
    setSignedOutHandler(() => setMe(null));
    if (sessionStore.get()) loadMe().catch(() => setMe(null)).finally(() => setLoading(false));
  }, [loadMe]);

  const value = useMemo<AuthState>(() => ({
    me, loading,
    can: (p) => !!me?.permissions.includes(p),
    async login(identifier, password, captcha) {
      const r = await api<AuthResponse>('POST', '/api/identity/auth/login', { identifier, password, captchaId: captcha?.id, captchaAnswer: captcha?.answer });
      if (r.mfa) return r.mfa;
      sessionStore.set({ accessToken: r.accessToken, refreshToken: r.refreshToken });
      await loadMe();
      return null;
    },
    async completeMfa(challengeId, code) {
      const r = await api<AuthResponse>('POST', '/api/identity/auth/login/mfa', { challengeId, code });
      sessionStore.set({ accessToken: r.accessToken, refreshToken: r.refreshToken });
      await loadMe();
    },
    reloadMe: loadMe,
    async logout() {
      try { await api('POST', '/api/identity/auth/logout'); } catch { /* ignore */ }
      sessionStore.set(null); setMe(null);
    },
  }), [me, loading, loadMe]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
