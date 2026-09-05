import { useMemo } from 'react';

import type { BoardCell, Raffle } from '../lib/rifas-api';
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
 * The full board, rendered from the raffle range rather than from the server
 * payload: only taken numbers travel over the wire, so a 1000-number raffle
 * stays a small response.
 *
 * Five columns on a phone, ten from the small breakpoint up, which is the
 * layout of the printed poster.
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

  return (
    <div
      className="grid grid-cols-5 gap-1.5 sm:grid-cols-10"
      role="group"
      aria-label={`Tablero de ${raffle.name}`}
    >
      {numbers.map((value) => {
        const cell = byNumber.get(value);
        const state: CellState = cell === undefined ? 'free' : cell.status === 'paid' ? 'paid' : 'reserved';

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
