import { useState } from 'react';

import { useSession } from './features/auth/session';
import { AccessScreen } from './routes/AccessScreen';
import { BoardScreen } from './routes/BoardScreen';
import { RafflesScreen } from './routes/RafflesScreen';

/**
 * Two screens deep, so navigation is a single piece of state kept in sync with
 * the URL: the organizer can share or bookmark a board, and the back button
 * behaves as expected.
 */
function raffleIdFromLocation(): string | null {
  const match = /^\/rifas\/([^/]+)$/.exec(window.location.pathname);
  return match?.[1] ?? null;
}

export function App(): React.JSX.Element {
  const { user, status } = useSession();
  const [raffleId, setRaffleId] = useState<string | null>(raffleIdFromLocation);

  if (status === 'checking') {
    return <p className="px-4 py-10 text-tinta-suave">Abriendo tu talonario…</p>;
  }

  if (user === null) return <AccessScreen />;

  if (raffleId !== null) {
    return (
      <BoardScreen
        raffleId={raffleId}
        onBack={() => {
          window.history.pushState(null, '', '/');
          setRaffleId(null);
        }}
      />
    );
  }

  return (
    <RafflesScreen
      onOpen={(id) => {
        window.history.pushState(null, '', `/rifas/${id}`);
        setRaffleId(id);
      }}
    />
  );
}
