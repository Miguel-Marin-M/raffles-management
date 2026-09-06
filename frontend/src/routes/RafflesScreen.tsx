import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Sheet } from '../components/Sheet';
import { useSession } from '../features/auth/use-session';
import { formatMoney } from '../lib/format';
import { api, type Raffle } from '../lib/rifas-api';
import { RaffleForm } from './RaffleForm';

interface RafflesScreenProps {
  readonly onOpen: (raffleId: string) => void;
}

const STATUS_COPY: Record<Raffle['status'], string> = {
  draft: 'borrador',
  active: 'en venta',
  closed: 'cerrada',
};

/** Home of the app: every raffle the organizer runs, newest first. */
export function RafflesScreen({ onOpen }: RafflesScreenProps): React.JSX.Element {
  const { user, logout } = useSession();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);

  const raffles = useQuery({ queryKey: ['raffles'], queryFn: api.listRaffles });

  const createRaffle = useMutation({
    mutationFn: api.createRaffle,
    onSuccess: async (raffle) => {
      setCreating(false);
      await queryClient.invalidateQueries({ queryKey: ['raffles'] });
      onOpen(raffle.id);
    },
  });

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-28 pt-6">
      <header className="flex items-baseline justify-between">
        <div>
          <p className="rotulo">Rifas de {user?.name ?? 'tu cuenta'}</p>
          <h1 className="text-3xl" style={{ fontStretch: '116%' }}>
            Tus rifas
          </h1>
        </div>
        <button
          type="button"
          className="text-sm text-tinta-suave underline underline-offset-4"
          onClick={() => void logout()}
        >
          Salir
        </button>
      </header>

      {raffles.isPending ? <p className="mt-8 text-tinta-suave">Cargando…</p> : null}

      {raffles.data?.length === 0 ? (
        <div className="mt-10 border border-dashed border-linea px-5 py-10 text-center">
          <p className="font-display text-lg">Todavía no tienes rifas.</p>
          <p className="mt-1 text-tinta-suave">
            Crea la primera, define el valor de la boleta y empieza a apartar números.
          </p>
        </div>
      ) : null}

      <ul className="mt-6 flex flex-col gap-3">
        {raffles.data?.map((raffle) => (
          <li key={raffle.id}>
            <button
              type="button"
              onClick={() => {
                onOpen(raffle.id);
              }}
              className="w-full border border-linea bg-papel-alto px-4 py-4 text-left transition-colors hover:border-tinta"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-xl leading-tight">{raffle.name}</h2>
                <span className="rotulo shrink-0">{STATUS_COPY[raffle.status]}</span>
              </div>
              <p className="cifra mt-2 text-sm text-tinta-suave">
                {formatMoney(raffle.ticketPriceMinorUnits, raffle.currency)} la boleta ·{' '}
                {raffle.ticketCount} números
              </p>
              {raffle.prizes.length > 0 ? (
                <p className="mt-1 truncate text-sm">
                  <span aria-hidden="true">🏆 </span>
                  {raffle.prizes.map((prize) => prize.title).join(' · ')}
                </p>
              ) : null}
            </button>
          </li>
        ))}
      </ul>

      <div className="fixed inset-x-0 bottom-0 border-t border-linea bg-papel/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <button
            type="button"
            className="boton w-full"
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
