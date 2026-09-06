import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import { Sheet } from '../components/Sheet';
import { useSession } from '../features/auth/use-session';
import { formatMoney } from '../lib/format';
import { api, type Raffle } from '../lib/raffles-api';
import { RaffleForm } from './RaffleForm';

const STATUS_COPY: Record<Raffle['status'], string> = {
  draft: 'borrador',
  active: 'en venta',
  closed: 'cerrada',
};

/** Home of the app: every raffle the organizer runs, newest first. */
export function RafflesScreen(): React.JSX.Element {
  const { user, logout } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);

  const raffles = useQuery({ queryKey: ['raffles'], queryFn: api.listRaffles });
  // Closed raffles live in the history so this list stays about what is on sale.
  const live = (raffles.data ?? []).filter((raffle) => raffle.status !== 'closed');
  const closedCount = (raffles.data ?? []).length - live.length;

  const createRaffle = useMutation({
    mutationFn: api.createRaffle,
    onSuccess: async (raffle) => {
      setCreating(false);
      await queryClient.invalidateQueries({ queryKey: ['raffles'] });
      void navigate({ to: '/raffles/$raffleId/board', params: { raffleId: raffle.id } });
    },
  });

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-28 pt-6">
      <header className="flex items-baseline justify-between">
        <div>
          <p className="eyebrow">Rifas de {user?.name ?? 'tu cuenta'}</p>
          <h1 className="text-3xl" style={{ fontStretch: '116%' }}>
            Tus rifas
          </h1>
        </div>
        <button
          type="button"
          className="text-sm text-ink-soft underline underline-offset-4"
          onClick={() => void logout()}
        >
          Salir
        </button>
      </header>

      {raffles.isPending ? <p className="mt-8 text-ink-soft">Cargando…</p> : null}

      {!raffles.isPending && live.length === 0 ? (
        <div className="mt-10 border border-dashed border-rule px-5 py-10 text-center">
          <p className="font-display text-lg">Todavía no tienes rifas.</p>
          <p className="mt-1 text-ink-soft">
            Crea la primera, define el valor de la boleta y empieza a apartar números.
          </p>
        </div>
      ) : null}

      <ul className="mt-6 flex flex-col gap-3">
        {live.map((raffle) => (
          <li key={raffle.id}>
            <Link
              to="/raffles/$raffleId/board"
              params={{ raffleId: raffle.id }}
              className="block w-full border border-rule bg-sheet px-4 py-4 text-left transition-colors hover:border-ink"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-xl leading-tight">{raffle.name}</h2>
                <span className="eyebrow shrink-0">{STATUS_COPY[raffle.status]}</span>
              </div>
              <p className="numeric mt-2 text-sm text-ink-soft">
                {formatMoney(raffle.ticketPriceMinorUnits, raffle.currency)} la boleta ·{' '}
                {raffle.ticketCount} números
              </p>
              {raffle.prizes.length > 0 ? (
                <p className="mt-1 truncate text-sm">
                  <span aria-hidden="true">🏆 </span>
                  {raffle.prizes.map((prize) => prize.title).join(' · ')}
                </p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>

      {closedCount > 0 ? (
        <Link to="/raffles/history" className="mt-6 inline-block underline underline-offset-4">
          Ver el historial ({closedCount} {closedCount === 1 ? 'rifa cerrada' : 'rifas cerradas'})
        </Link>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 border-t border-rule bg-paper/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <button
            type="button"
            className="btn w-full"
            onClick={() => {
              setCreating(true);
            }}
          >
            Crear rifa
          </button>
        </div>
      </div>

      <Sheet
        open={creating}
        title="Nueva rifa"
        onClose={() => {
          setCreating(false);
        }}
      >
        <RaffleForm
          busy={createRaffle.isPending}
          error={createRaffle.error}
          onSubmit={(input) => {
            createRaffle.mutate(input);
          }}
        />
      </Sheet>
    </main>
  );
}
