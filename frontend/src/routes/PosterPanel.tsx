import { useMemo } from 'react';

import { formatDayMonth, formatMoney } from '../lib/format';
import type { RaffleBoard } from '../lib/raffles-api';

interface PosterProps {
  readonly board: RaffleBoard;
}

/**
 * The raffle as a poster, made to be screenshotted and sent over WhatsApp.
 *
 * It inverts the board's hierarchy on purpose: on the admin board the taken
 * numbers stand out because they are what the organizer manages, while here
 * the free ones do, because they are what is being sold. Cell borders are
 * dropped as well — on paper they were there to be marked with a pen, and at
 * the size a chat thumbnail gets they only add noise.
 */
export function Poster({ board }: PosterProps): React.JSX.Element {
  const { raffle, takenCells } = board;

  const taken = useMemo(
    () => new Set(takenCells.map((cell) => cell.number)),
    [takenCells],
  );

  const numbers = useMemo(() => {
    const values: number[] = [];
    for (let value = raffle.numberMin; value <= raffle.numberMax; value += 1) values.push(value);
    return values;
  }, [raffle.numberMin, raffle.numberMax]);

  const drawDate = formatDayMonth(raffle.drawDate);

  /**
   * Where the money goes, labelled with the bank so it reads the way people
   * write it in a chat. Either half can be missing, and a bank with no account
   * number is not something a buyer can act on.
   */
  const payTo =
    raffle.bankAccount === null
      ? null
      : { label: raffle.bankName ?? 'Cuenta', value: raffle.bankAccount };

  function winnerName(number: number): string | null {
    return takenCells.find((cell) => cell.number === number)?.customerName ?? null;
  }

  return (
    <article className="mx-auto w-full max-w-[26rem] bg-sheet px-5 py-7">
      <h2
        className="text-[2.75rem] font-extrabold leading-[0.92] tracking-tight"
        style={{ fontStretch: '125%' }}
      >
        {raffle.name}
      </h2>

      {drawDate === null ? null : (
        <p
          className="mt-4 inline-block bg-lottery px-3 py-1.5 font-display text-sm font-semibold uppercase tracking-[0.12em]"
        >
          Juega el {drawDate}
        </p>
      )}

      {raffle.prizes.length > 0 ? (
        <ol className="mt-6">
          {raffle.prizes.map((prize) => (
            <li
              key={prize.id}
              className="flex items-baseline gap-3 border-t border-rule py-2 last:border-b last:border-rule"
            >
              <span className="numeric w-5 shrink-0 text-sm text-ink-soft">{prize.position}</span>
              <div className="flex flex-1 flex-col items-start">
                <span
                  className="font-display text-lg font-semibold leading-tight"
                  style={{ fontStretch: '108%' }}
                >
                  {prize.title}
                </span>
                {prize.winningNumber === null ? null : (
                  <span className="mt-1 text-sm">
                    <span className="numeric bg-lottery px-1.5 py-0.5 font-semibold">
                      Ganó el {String(prize.winningNumber).padStart(raffle.numberDigits, '0')}
                    </span>
                    {winnerName(prize.winningNumber) === null ? null : (
                      <span className="ml-2 text-ink-soft">
                        {winnerName(prize.winningNumber)}
                      </span>
                    )}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      ) : null}

      {raffle.organizerName === null && payTo === null ? null : (
        <div className="mt-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs text-ink-soft">
          {raffle.organizerName === null ? null : (
            <p>
              <span className="font-bold">Responsable:</span> {raffle.organizerName}
            </p>
          )}
          {payTo === null ? null : (
            <p>
              <span className="font-bold">{payTo.label}:</span>{' '}
              <span className="numeric">{payTo.value}</span>
            </p>
          )}
        </div>
      )}
      <div className="mt-7 grid grid-cols-10 gap-x-1 gap-y-1.5">
        {numbers.map((value) => {
          const sold = taken.has(value);

          return (
            <span
              key={value}
              className={`text-center font-display text-[clamp(0.7rem,3vw,0.95rem)] font-semibold tabular-nums ${
                sold
                  ? 'text-ink-soft/45 line-through decoration-stamp decoration-2'
                  : 'text-ink'
              }`}
              style={{ fontStretch: '104%' }}
            >
              {String(value).padStart(raffle.numberDigits, '0')}
            </span>
          );
        })}
      </div>

      <p className="mt-2 text-xs text-ink-soft">Los números tachados ya están vendidos.</p>
      <p className="mt-2 text-xs text-blue-800">Boletas sin pagar no juegan.</p>

      <p className="numeric mt-4 inline-block bg-lottery px-3 py-2 text-2xl font-semibold">
        {formatMoney(raffle.ticketPriceMinorUnits, raffle.currency)} cada boleta
      </p>

      {raffle.lotteryReference === null ? null : (
        <p className="mt-4 text-sm text-ink-soft">
          Juega con la {raffle.lotteryReference}
        </p>
      )}
    </article>
  );
}
