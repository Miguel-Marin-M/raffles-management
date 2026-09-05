import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react';

import { refreshSession, type Session } from '../../lib/api';
import { api } from '../../lib/rifas-api';

type SessionUser = Session['user'];

interface SessionContextValue {
  readonly user: SessionUser | null;
  readonly status: 'checking' | 'ready';
  login(email: string, password: string): Promise<void>;
  register(name: string, email: string, password: string): Promise<void>;
  logout(): Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [status, setStatus] = useState<'checking' | 'ready'>('checking');

  // A reload keeps the session: the refresh cookie is exchanged for a new
  // access token before the first screen is painted.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const restored = await refreshSession();
      if (cancelled) return;
      if (restored) {
        try {
          setUser(await api.me());
        } catch {
          setUser(null);
        }
      }
      setStatus('ready');
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setUser((await api.login(email, password)).user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    setUser((await api.register(name, email, password)).user);
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, status, login, register, logout }),
    [user, status, login, register, logout],
  );

  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession(): SessionContextValue {
  const value = use(SessionContext);
  if (value === null) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
