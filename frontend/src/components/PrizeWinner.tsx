import { useState } from 'react';

import type { BoardCell, Prize, Raffle } from '../lib/rifas-api';

interface PrizeWinnerProps {
  readonly raffle: Raffle;
  readonly prize: Prize;
  readonly takenCells: readonly BoardCell[];
  readonly busy: boolean;
  readonly onRecord: (prizeId: string, number: number | null) => void;
}

/**
 * The number drawn for one prize, and who was holding it.
 *
 * The holder is resolved from the board rather than stored with the prize, so
 * a boleta handed over before the draw still shows the right name.
 */
export function PrizeWinner({
  raffle,
  prize,
  takenCells,
  busy,
  onRecord,
}: PrizeWinnerProps): React.JSX.Element {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');

  const holder =
    prize.winningNumber === null
      ? undefined
      : takenCells.find((cell) => cell.number === prize.winningNumber);

  if (prize.winningNumber !== null && !editing) {
    return (
      <div className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm">
        <span className="cifra bg-loteria px-2 py-0.5 font-semibold">
          Ganó el {String(prize.winningNumber).padStart(raffle.numberDigits, '0')}
        </span>
        <span className="text-tinta-suave">
          {holder === undefined ? 'Nadie compró ese número' : holder.customerName}
        </span>
        <button
          type="button"
          className="text-xs underline underline-offset-4"
          onClick={() => {
            setValue(String(prize.winningNumber));
            setEditing(true);
          }}
        >
          Cambiar
        </button>
      </div>
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        className="mt-1 self-start text-sm underline underline-offset-4"
        onClick={() => {
          setEditing(true);
        }}
      >
        Anotar el número ganador
      </button>
    );
  }

  return (
    <div className="mt-1 flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1">
        <span className="rotulo">Número ganador</span>
        <input
          className="campo cifra w-28"
          type="number"
          inputMode="numeric"
          min={raffle.numberMin}
          max={raffle.numberMax}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
          }}
          placeholder={String(raffle.numberMax)}
          autoFocus
        />
      </label>
      <button
        type="button"
        className="boton"
        disabled={value === '' || busy}
        onClick={() => {
          onRecord(prize.id, Number(value));
          setEditing(false);
        }}
      >
        Guardar
      </button>
      <button
        type="button"
        className="min-h-11 text-sm text-tinta-suave underline underline-offset-4"
        onClick={() => {
          setEditing(false);
        }}
      >
        Cancelar
      </button>
      {prize.winningNumber === null ? null : (
        <button
          type="button"
          className="min-h-11 text-sm text-sello underline underline-offset-4"
          onClick={() => {
            onRecord(prize.id, null);
            setEditing(false);
          }}
        >
          Borrar
        </button>
      )}
    </div>
  );
}
