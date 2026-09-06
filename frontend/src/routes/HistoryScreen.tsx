import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import { ConfirmDialog } from '../components/ConfirmDialog';
import { describeError } from '../lib/errors';
import { formatDate, formatMoney } from '../lib/format';
import { api, type Raffle } from '../lib/rifas-api';

/**
 * Raffles that have already been drawn.
 *
 * They stay readable as a record of what was sold and who won, and this is the
 * only place where a raffle can be deleted for good.
 */
export function HistoryScreen(): React.JSX.Element {
  const queryClient = useQueryClient();
  const [pendingDeletion, setPendingDeletion] = useState<Raffle | null>(null);

  const raffles = useQuery({ queryKey: ['raffles'], queryFn: api.listRaffles });
  const closed = (raffles.data ?? []).filter((raffle) => raffle.status === 'closed');

  const remove = useMutation({
    mutationFn: (raffleId: string) => api.deleteRaffle(raffleId),
    onSuccess: async () => {
      setPendingDeletion(null);
      await queryClient.invalidateQueries({ queryKey: ['raffles'] });
    },
  });

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-16 pt-6">
      <Link to="/raffles" className="eyebrow mb-4 inline-flex min-h-11 items-center">
        ← Tus rifas
      </Link>

      <h1 className="text-3xl" style={{ fontStretch: '116%' }}>
        Historial
      </h1>
      <p className="mt-1 text-ink-soft">Rifas cerradas. Su tablero queda como registro.</p>

      {raffles.isPending ? <p className="mt-8 text-ink-soft">Cargando…</p> : null}

      {remove.error !== null ? (
        <p role="alert" className="mt-4 border-l-2 border-stamp pl-3 text-sm text-stamp">
          {describeError(remove.error)}
        </p>
      ) : null}

      {!raffles.isPending && closed.length === 0 ? (
        <div className="mt-10 border border-dashed border-rule px-5 py-10 text-center">
          <p className="font-display text-lg">Todavía no has cerrado ninguna rifa.</p>
          <p className="mt-1 text-ink-soft">
            Cuando termines una, ciérrala desde su resumen y quedará guardada aquí.
          </p>
        </div>
      ) : null}

      <ul className="mt-6 flex flex-col gap-3">
        {closed.map((raffle) => {
          const winners = raffle.prizes.filter((prize) => prize.winningNumber !== null);

          return (
            <li key={raffle.id} className="border border-rule bg-sheet px-4 py-4">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-xl leading-tight">{raffle.name}</h2>
                <span className="eyebrow shrink-0">{formatDate(raffle.drawDate) ?? 'sin fecha'}</span>
              </div>

              <p className="numeric mt-2 text-sm text-ink-soft">
                {formatMoney(raffle.ticketPriceMinorUnits, raffle.currency)} la boleta ·{' '}
                {raffle.ticketCount} números
              </p>

              {winners.length > 0 ? (
                <ul className="mt-2 flex flex-col gap-1 text-sm">
                  {winners.map((prize) => (
                    <li key={prize.id}>
                      <span className="numeric bg-lottery px-1.5 py-0.5 font-semibold">
                        {String(prize.winningNumber).padStart(raffle.numberDigits, '0')}
                      </span>{' '}
                      {prize.title}
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <Link
                  to="/raffles/$raffleId/summary"
                  params={{ raffleId: raffle.id }}
                  className="underline underline-offset-4"
                >
                  Ver la rifa
                </Link>
                <button
                  type="button"
                  className="text-stamp underline underline-offset-4"
                  disabled={remove.isPending}
                  onClick={() => {
                    setPendingDeletion(raffle);
                  }}
                >
                  Borrar del historial
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={pendingDeletion !== null}
        title={`Borrar ${pendingDeletion?.name ?? 'la rifa'}`}
        confirmLabel="Sí, borrarla"
        busy={remove.isPending}
        onCancel={() => {
          setPendingDeletion(null);
        }}
        onConfirm={() => {
          if (pendingDeletion !== null) remove.mutate(pendingDeletion.id);
        }}
      >
        <p>
          Se borra el tablero completo: quiénes compraron, qué pagaron y el número ganador.
        </p>
        <p className="mt-2 text-ink-soft">
          Tus clientes se quedan, pero esta rifa desaparece y no se puede recuperar.
        </p>
      </ConfirmDialog>
    </main>
  );
}
