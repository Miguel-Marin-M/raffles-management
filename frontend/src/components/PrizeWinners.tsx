import { useState } from 'react';

import type { BoardCell, Prize, Raffle } from '../lib/raffles-api';

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
 * Every field stays folded away until it is asked for. The draw happens once,
 * so this list is read far more often than it is filled in, and a column of
 * empty inputs would be noise on every other visit.
 *
 * Many raffles hand every prize to the same number, so that case gets its own
 * shortcut instead of the same digits typed once per prize.
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
  const [sameForAllOpen, setSameForAllOpen] = useState(false);
  const [sameForAll, setSameForAll] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  function holderOf(number: number | null): string | null {
    if (number === null) return null;
    return takenCells.find((cell) => cell.number === number)?.customerName ?? null;
  }

  function openPrize(prize: Prize): void {
    setEditing(prize.id);
    setDraft(prize.winningNumber === null ? '' : String(prize.winningNumber));
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
        <div className="mt-3">
          {sameForAllOpen ? (
            <div className="flex flex-wrap items-end gap-2 border border-rule bg-sheet px-3 py-3">
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
                  placeholder="El número"
                  autoFocus
                />
              </label>
              <button
                type="button"
                className="btn"
                disabled={sameForAll === '' || busy}
                onClick={() => {
                  onRecord(
                    raffle.prizes.map((prize) => ({
                      prizeId: prize.id,
                      number: Number(sameForAll),
                    })),
                  );
                  setSameForAll('');
                  setSameForAllOpen(false);
                  setEditing(null);
                }}
              >
                Aplicar a los {raffle.prizes.length} premios
              </button>
              <button
                type="button"
                className="min-h-11 text-sm text-ink-soft underline underline-offset-4"
                onClick={() => {
                  setSameForAllOpen(false);
                }}
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="text-sm underline underline-offset-4"
              onClick={() => {
                setSameForAllOpen(true);
              }}
            >
              Usar el mismo número para todos los premios
            </button>
          )}
        </div>
      ) : null}

      <ol className="mt-3 flex flex-col">
        {raffle.prizes.map((prize) => {
          const holder = holderOf(prize.winningNumber);
          const isEditing = editing === prize.id && !readOnly;

          return (
            <li key={prize.id} className="border-b border-rule py-3 last:border-b-0">
              <div className="flex items-baseline gap-3">
                <span className="numeric w-5 shrink-0 text-sm text-lottery">{prize.position}</span>
                <span className="flex-1">{prize.title}</span>
              </div>

              <div className="mt-1 pl-8">
                {isEditing ? (
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="flex flex-col gap-1">
                      <span className="eyebrow">Número ganador</span>
                      <input
                        className="field numeric w-32"
                        type="number"
                        inputMode="numeric"
                        min={raffle.numberMin}
                        max={raffle.numberMax}
                        value={draft}
                        onChange={(event) => {
                          setDraft(event.target.value);
                        }}
                        placeholder="El número"
                        autoFocus
                      />
                    </label>
                    <button
                      type="button"
                      className="btn"
                      disabled={busy || draft === ''}
                      onClick={() => {
                        onRecord([{ prizeId: prize.id, number: Number(draft) }]);
                        setEditing(null);
                      }}
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      className="min-h-11 text-sm text-ink-soft underline underline-offset-4"
                      onClick={() => {
                        setEditing(null);
                      }}
                    >
                      Cancelar
                    </button>
                    {prize.winningNumber === null ? null : (
                      <button
                        type="button"
                        className="min-h-11 text-sm text-stamp underline underline-offset-4"
                        disabled={busy}
                        onClick={() => {
                          onRecord([{ prizeId: prize.id, number: null }]);
                          setEditing(null);
                        }}
                      >
                        Borrar
                      </button>
                    )}
                  </div>
                ) : prize.winningNumber === null ? (
                  readOnly ? (
                    <p className="text-sm text-ink-soft">Sin número ganador</p>
                  ) : (
                    <button
                      type="button"
                      className="text-sm underline underline-offset-4"
                      onClick={() => {
                        openPrize(prize);
                      }}
                    >
                      Registrar número ganador
                    </button>
                  )
                ) : (
                  <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                    <span className="numeric bg-lottery px-2 py-0.5 font-semibold">
                      Ganó el {String(prize.winningNumber).padStart(raffle.numberDigits, '0')}
                    </span>
                    <span className="text-ink-soft">{holder ?? 'Nadie compró ese número'}</span>
                    {readOnly ? null : (
                      <button
                        type="button"
                        className="text-xs underline underline-offset-4"
                        onClick={() => {
                          openPrize(prize);
                        }}
                      >
                        Cambiar
                      </button>
                    )}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
