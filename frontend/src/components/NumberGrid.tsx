import { useMemo } from 'react';

import type { BoardCell, Raffle } from '../lib/raffles-api';
import { NumberCell, type CellState } from './NumberCell';

interface NumberGridProps {
  readonly raffle: Raffle;
  readonly takenCells: readonly BoardCell[];
  readonly selected: ReadonlySet<number>;
  readonly onToggle: (value: number) => void;
}

function padded(value: number, digits: number): string {
  return String(value).padStart(digits, '0');
}

/**
 * Type sizing per row of ten. Cells are a tenth of the viewport whatever the
 * screen, so the numeral has to shrink as the label gets longer.
 */
const TYPE_BY_DIGITS: Record<number, { size: string; stretch: string }> = {
  2: { size: 'clamp(0.68rem, 3.1vw, 1.25rem)', stretch: '108%' },
  3: { size: 'clamp(0.55rem, 2.4vw, 1rem)', stretch: '86%' },
};

/**
 * The full board, rendered from the raffle range rather than from the server
 * payload: only taken numbers travel over the wire, so a 1000-number raffle
 * stays a small response.
 *
 * Always ten numbers per row, on every screen, because that is the layout of
 * the printed poster the organizer already reads: the first row is 00 to 09,
 * the second 10 to 19, and the tens are a column. On a phone the grid takes
 * the full width to keep the cells as large as that constraint allows.
 */
export function NumberGrid({
  raffle,
  takenCells,
  selected,
  onToggle,
}: NumberGridProps): React.JSX.Element {
  const byNumber = useMemo(
    () => new Map(takenCells.map((cell) => [cell.number, cell])),
    [takenCells],
  );

  const numbers = useMemo(() => {
    const values: number[] = [];
    for (let value = raffle.numberMin; value <= raffle.numberMax; value += 1) values.push(value);
    return values;
  }, [raffle.numberMin, raffle.numberMax]);

  const type = TYPE_BY_DIGITS[raffle.numberDigits] ?? TYPE_BY_DIGITS[3];

  return (
    <div
      className="-mx-4 grid grid-cols-10 gap-[3px] px-2 sm:mx-0 sm:gap-1.5 sm:px-0"
      role="group"
      aria-label={`Tablero de ${raffle.name}`}
      style={
        {
          '--cell-font-size': type?.size,
          '--cell-font-stretch': type?.stretch,
        } as React.CSSProperties
      }
    >
      {numbers.map((value) => {
        const cell = byNumber.get(value);
        const state: CellState =
          cell === undefined ? 'free' : cell.status === 'paid' ? 'paid' : 'reserved';

        return (
          <NumberCell
            key={value}
            label={padded(value, raffle.numberDigits)}
            state={state}
            selected={selected.has(value)}
            customerName={cell?.customerName}
            onSelect={() => {
              onToggle(value);
            }}
          />
        );
      })}
    </div>
  );
}
