import { useState } from 'react';

import type { BoardCell, Prize, Raffle } from '../lib/rifas-api';

interface PrizeWinnersProps {
  readonly raffle: Raffle;
  readonly takenCells: readonly BoardCell[];
  readonly busy: boolean;
  readonly readOnly: boolean;
  readonly onRecord: (winners: readonly { prizeId: string; number: number | null }[]) => void;
}

/**
 * The result of the draw: which number won each prize, and who held it.
 *
 * Many raffles hand every prize to the same number, so that case is one field
 * instead of the same digits typed once per prize; a raffle where each prize
 * has its own number keeps the per-prize fields.
 *
 * Holders are resolved from the board rather than stored with the prize, so a
 * boleta handed over before the draw still shows the right name.
 */
export function PrizeWinners({
  raffle,
  takenCells,
  busy,
  readOnly,
  onRecord,
}: PrizeWinnersProps): React.JSX.Element {
  const [sameForAll, setSameForAll] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  function holderOf(number: number | null): string | null {
    if (number === null) return null;
    return takenCells.find((cell) => cell.number === number)?.customerName ?? null;
  }

  function draftOf(prize: Prize): string {
    return drafts[prize.id] ?? (prize.winningNumber === null ? '' : String(prize.winningNumber));
  }

  const pending = raffle.prizes.filter((prize) => prize.winningNumber === null);

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="eyebrow">Números ganadores</h3>
        {pending.length > 0 && !readOnly ? (
          <span className="text-xs text-stamp">
            {pending.length === 1 ? 'falta 1 premio' : `faltan ${pending.length} premios`}
          </span>
        ) : null}
      </div>

      {raffle.prizes.length === 0 ? (
        <p className="mt-2 text-ink-soft">Esta rifa no tiene premios cargados.</p>
      ) : null}

      {raffle.prizes.length > 1 && !readOnly ? (
        <div className="mt-3 flex flex-wrap items-end gap-2 border border-rule bg-sheet px-3 py-3">
          <label className="flex flex-col gap-1">
            <span className="eyebrow">El mismo número para todos</span>
            <input
              className="field numeric w-32"
              type="number"
              inputMode="numeric"
              min={raffle.numberMin}
              max={raffle.numberMax}
              value={sameForAll}
              onChange={(event) => {
                setSameForAll(event.target.value);
              }}
              placeholder={String(raffle.numberMax)}
            />
          </label>
          <button
            type="button"
            className="btn"
            disabled={sameForAll === '' || busy}
            onClick={() => {
              onRecord(
                raffle.prizes.map((prize) => ({ prizeId: prize.id, number: Number(sameForAll) })),
              );
              setSameForAll('');
              setDrafts({});
            }}
          >
            Aplicar a los {raffle.prizes.length} premios
          </button>
        </div>
      ) : null}

      <ol className="mt-3 flex flex-col">
        {raffle.prizes.map((prize) => {
          const holder = holderOf(prize.winningNumber);

          return (
            <li key={prize.id} className="border-b border-rule py-3 last:border-b-0">
              <div className="flex items-baseline gap-3">
                <span className="numeric w-5 shrink-0 text-sm text-lottery">{prize.position}</span>
                <span className="flex-1">{prize.title}</span>
              </div>

              {readOnly ? (
                <p className="mt-1 pl-8 text-sm">
                  {prize.winningNumber === null ? (
                    <span className="text-ink-soft">Sin número ganador</span>
                  ) : (
                    <>
                      <span className="numeric bg-lottery px-2 py-0.5 font-semibold">
                        {String(prize.winningNumber).padStart(raffle.numberDigits, '0')}
                      </span>
                      <span className="ml-2 text-ink-soft">
                        {holder ?? 'Nadie compró ese número'}
                      </span>
                    </>
                  )}
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap items-end gap-2 pl-8">
                  <label className="flex flex-col gap-1">
                    <span className="eyebrow">Ganador</span>
                    <input
                      className="field numeric w-28"
                      type="number"
                      inputMode="numeric"
                      min={raffle.numberMin}
                      max={raffle.numberMax}
                      value={draftOf(prize)}
                      onChange={(event) => {
                        setDrafts({ ...drafts, [prize.id]: event.target.value });
                      }}
                      placeholder="—"
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={busy || draftOf(prize) === ''}
                    onClick={() => {
                      onRecord([{ prizeId: prize.id, number: Number(draftOf(prize)) }]);
                    }}
                  >
                    Guardar
                  </button>
                  {prize.winningNumber === null ? null : (
                    <button
                      type="button"
                      className="min-h-11 text-sm text-stamp underline underline-offset-4"
                      disabled={busy}
                      onClick={() => {
                        setDrafts({ ...drafts, [prize.id]: '' });
                        onRecord([{ prizeId: prize.id, number: null }]);
                      }}
                    >
                      Borrar
                    </button>
                  )}
                  {holder === null ? null : (
                    <span className="min-h-11 content-center text-sm text-ink-soft">{holder}</span>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
