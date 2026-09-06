import { createContext } from 'react';

import type { Session } from '../../lib/api';

export type SessionUser = Session['user'];

export interface SessionContextValue {
  readonly user: SessionUser | null;
  readonly status: 'checking' | 'ready';
  login(email: string, password: string): Promise<void>;
  register(name: string, email: string, password: string): Promise<void>;
  logout(): Promise<void>;
}

export const SessionContext = createContext<SessionContextValue | null>(null);
