import { useMemo } from 'react';

import { formatMoney } from '../lib/format';
import type { BoardCell, Raffle } from '../lib/rifas-api';

interface CustomersPanelProps {
  readonly raffle: Raffle;
  readonly takenCells: readonly BoardCell[];
  readonly onOpenCell: (cell: BoardCell) => void;
}

interface CustomerRow {
  readonly id: string;
  readonly name: string;
  readonly phone: string | null;
  readonly cells: BoardCell[];
  readonly paid: number;
  readonly owed: number;
}

/**
 * The collection round: who took which numbers and who still owes.
 *
 * Built from the board that is already loaded, so opening this panel costs no
 * extra request. Debtors come first, because that is the list the organizer
 * works through.
 */
export function CustomersPanel({
  raffle,
  takenCells,
  onOpenCell,
}: CustomersPanelProps): React.JSX.Element {
  const rows = useMemo(() => {
    const grouped = new Map<string, CustomerRow>();

    for (const cell of takenCells) {
      const row = grouped.get(cell.customerId) ?? {
        id: cell.customerId,
        name: cell.customerName,
        phone: cell.customerPhone,
        cells: [],
        paid: 0,
        owed: 0,
      };

      grouped.set(cell.customerId, {
        ...row,
        cells: [...row.cells, cell],
        paid: row.paid + cell.amountPaidMinorUnits,
        owed: row.owed + cell.outstandingMinorUnits,
      });
    }

    return [...grouped.values()].sort(
      (a, b) => b.owed - a.owed || a.name.localeCompare(b.name, 'es'),
    );
  }, [takenCells]);

  if (rows.length === 0) {
    return (
      <div className="border border-dashed border-linea px-5 py-10 text-center">
        <p className="font-display text-lg">Nadie ha apartado todavía.</p>
        <p className="mt-1 text-tinta-suave">
          Ve al tablero, toca los números libres y apártalos a nombre de tu cliente.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <li key={row.id} className="border border-linea bg-papel-alto px-4 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-lg leading-tight">{row.name}</h3>
            <span
              className={`cifra shrink-0 text-sm ${row.owed === 0 ? 'text-cancelado' : 'text-sello'}`}
            >
              {row.owed === 0 ? 'al día' : `debe ${formatMoney(row.owed, raffle.currency)}`}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-1">
            {row.cells.map((cell) => (
              <button
                key={cell.ticketId}
                type="button"
                onClick={() => {
                  onOpenCell(cell);
                }}
                className={`cifra min-h-8 border px-2 py-0.5 text-sm ${
                  cell.status === 'paid'
                    ? 'border-linea text-tinta-suave line-through decoration-cancelado decoration-2'
                    : 'border-sello text-sello'
                }`}
              >
                {cell.label}
              </button>
            ))}
          </div>

          <p className="cifra mt-2 text-xs text-tinta-suave">
            {row.cells.length} {row.cells.length === 1 ? 'boleta' : 'boletas'} · abonado{' '}
            {formatMoney(row.paid, raffle.currency)}
            {row.phone === null ? null : (
              <>
                {' · '}
                <a className="underline underline-offset-4" href={`tel:${row.phone}`}>
                  {row.phone}
                </a>
              </>
            )}
          </p>
        </li>
      ))}
    </ul>
  );
}
