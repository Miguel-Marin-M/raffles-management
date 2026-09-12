import { useEffect, useState } from 'react';
import { Outlet } from '@tanstack/react-router';

import { useSession } from '../../features/auth/use-session';
import { AccessScreen } from '../AccessScreen';

/** How long the wait has to run before it is worth explaining. */
const EXPLAIN_AFTER_MS = 3500;

/**
 * Gate for the whole app: until the session is restored nothing is rendered,
 * and without one the access screen replaces the matched route so the URL the
 * organizer opened is still there after signing in.
 */
export function RootLayout(): React.JSX.Element {
  const { user, status } = useSession();

  if (status === 'checking') return <OpeningScreen />;

  return user === null ? <AccessScreen /> : <Outlet />;
}

/**
 * The free API server shuts down when nobody uses it and takes up to a minute
 * to come back, which reads as a frozen screen. A silent wait invites a reload
 * that only starts the wait over, so after a few seconds the screen says what
 * is happening.
 */
function OpeningScreen(): React.JSX.Element {
  const [waitingLong, setWaitingLong] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setWaitingLong(true);
    }, EXPLAIN_AFTER_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className="px-4 py-10">
      <p className="text-ink-soft">Abriendo tu talonario…</p>
      {waitingLong ? (
        <p className="mt-3 max-w-xs text-xs text-ink-soft">
          El servidor se apaga cuando nadie lo usa. Está encendiéndose: la primera
          visita del día tarda hasta un minuto. No recargues la página, eso reinicia
          la espera.
        </p>
      ) : null}
    </div>
  );
}
