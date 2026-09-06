import { Outlet } from '@tanstack/react-router';

import { useSession } from '../../features/auth/use-session';
import { AccessScreen } from '../AccessScreen';

/**
 * Gate for the whole app: until the session is restored nothing is rendered,
 * and without one the access screen replaces the matched route so the URL the
 * organizer opened is still there after signing in.
 */
export function RootLayout(): React.JSX.Element {
  const { user, status } = useSession();

  if (status === 'checking') {
    return <p className="px-4 py-10 text-ink-soft">Abriendo tu talonario…</p>;
  }

  return user === null ? <AccessScreen /> : <Outlet />;
}
