import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  getMe,
  logout as logoutRequest,
  refreshSession,
  staffLogin,
  staffMfaVerify,
} from '../api/identity';
import { ApiError } from '../api/errors';
import type { StaffMeDto } from '../api/dto';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: AuthStatus;
  me: StaffMeDto | null;
  login: (email: string, password: string) => Promise<{ mfaRequired: boolean; mfaToken?: string }>;
  verifyMfa: (mfaToken: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  // Wraps any authenticated API call: on a REAUTH_REQUIRED it attempts one
  // silent refresh and retries once, then gives up — never an infinite loop
  // (ARCHITECTURE.md §M2 frontend scope).
  callApi: <T>(fn: (accessToken: string) => Promise<T>) => Promise<T>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [me, setMe] = useState<StaffMeDto | null>(null);

  const establishSession = useCallback(async (token: string) => {
    const profile = await getMe(token);
    setAccessToken(token);
    setMe(profile);
    setStatus('authenticated');
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setMe(null);
    setStatus('anonymous');
  }, []);

  // On first load, try to restore a session from the httpOnly refresh
  // cookie — never from localStorage (TD-006: shared shop devices).
  useEffect(() => {
    let cancelled = false;
    refreshSession()
      .then((result) => {
        if (cancelled) return;
        return establishSession(result.accessToken);
      })
      .catch(() => {
        if (!cancelled) clearSession();
      });
    return () => {
      cancelled = true;
    };
  }, [establishSession, clearSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await staffLogin(email, password);
      if (result.mfaRequired) {
        return { mfaRequired: true, mfaToken: result.mfaToken };
      }
      await establishSession(result.accessToken!);
      return { mfaRequired: false };
    },
    [establishSession],
  );

  const verifyMfa = useCallback(
    async (mfaToken: string, code: string) => {
      const result = await staffMfaVerify(mfaToken, code);
      await establishSession(result.accessToken);
    },
    [establishSession],
  );

  const logout = useCallback(async () => {
    if (accessToken) {
      await logoutRequest(accessToken).catch(() => undefined);
    }
    clearSession();
  }, [accessToken, clearSession]);

  const hasPermission = useCallback(
    (permission: string) => me?.permissions.includes(permission) ?? false,
    [me],
  );

  const callApi = useCallback(
    async <T,>(fn: (token: string) => Promise<T>): Promise<T> => {
      if (!accessToken) {
        clearSession();
        throw new ApiError({ code: 'REAUTH_REQUIRED', message: 'Sign in to continue.' });
      }
      try {
        return await fn(accessToken);
      } catch (error) {
        if (!(error instanceof ApiError) || error.code !== 'REAUTH_REQUIRED') {
          throw error;
        }
        try {
          const refreshed = await refreshSession();
          setAccessToken(refreshed.accessToken);
          return await fn(refreshed.accessToken);
        } catch {
          clearSession();
          throw error;
        }
      }
    },
    [accessToken, clearSession],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ status, me, login, verifyMfa, logout, hasPermission, callApi }),
    [status, me, login, verifyMfa, logout, hasPermission, callApi],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return context;
}
