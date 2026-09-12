import { useCallback, useEffect, useMemo, useState } from 'react';

import { refreshSession } from '../../lib/api';
import { api } from '../../lib/raffles-api';
import { SessionContext, type SessionUser } from './session-context';

export function SessionProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [status, setStatus] = useState<'checking' | 'ready'>('checking');

  // A reload keeps the session: the refresh cookie is exchanged for a new
  // access token before the first screen is painted. That single call also
  // names the organizer, so nothing else has to be fetched to start.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const restored = await refreshSession();
      if (cancelled) return;
      setUser(restored);
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
