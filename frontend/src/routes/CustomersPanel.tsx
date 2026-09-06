import { useMemo, useState } from 'react';

import { AddPhone } from '../components/AddPhone';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatMoney } from '../lib/format';
import type { BoardCell, Raffle } from '../lib/rifas-api';

interface CustomersPanelProps {
  readonly raffle: Raffle;
  readonly takenCells: readonly BoardCell[];
  readonly busy: boolean;
  readonly onOpenCell: (cell: BoardCell) => void;
  readonly onMarkAsPaid: (numbers: readonly number[]) => void;
  readonly onCustomerChanged: () => void;
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
 *
 * Numbers are charged one by one or in groups: somebody who reserved five
 * boletas often pays for three today and the rest next week, so the pending
 * ones can be picked individually before charging them together.
 */
export function CustomersPanel({
  raffle,
  takenCells,
  busy,
  onOpenCell,
  onMarkAsPaid,
  onCustomerChanged,
}: CustomersPanelProps): React.JSX.Element {
  // Only one customer is collected from at a time; picking numbers of another
  // one starts a new selection.
  const [selection, setSelection] = useState<{ customerId: string; numbers: number[] } | null>(
    null,
  );
  const [confirming, setConfirming] = useState(false);

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

  const activeRow = rows.find((row) => row.id === selection?.customerId) ?? null;
  const selectedNumbers = selection?.numbers ?? [];
  const selectedCells =
    activeRow?.cells.filter((cell) => selectedNumbers.includes(cell.number)) ?? [];
  const selectedTotal = selectedCells.reduce(
    (total, cell) => total + cell.outstandingMinorUnits,
    0,
  );

  function toggle(row: CustomerRow, cell: BoardCell): void {
    if (cell.status === 'paid') {
      onOpenCell(cell);
      return;
    }

    const current = selection?.customerId === row.id ? selection.numbers : [];
    const next = current.includes(cell.number)
      ? current.filter((value) => value !== cell.number)
      : [...current, cell.number].sort((a, b) => a - b);

    setSelection(next.length === 0 ? null : { customerId: row.id, numbers: next });
  }

  if (rows.length === 0) {
    return (
      <div className="border border-dashed border-rule px-5 py-10 text-center">
        <p className="font-display text-lg">Nadie ha apartado todavía.</p>
        <p className="mt-1 text-ink-soft">
          Ve al tablero, toca los números libres y apártalos a nombre de tu cliente.
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="mb-3 text-sm text-ink-soft">
        Toca los números apartados para escoger cuáles te está pagando ahora.
      </p>

      <ul className="flex flex-col gap-3 pb-24">
        {rows.map((row) => {
          const pending = row.cells.filter((cell) => cell.status !== 'paid');
          const isActive = selection?.customerId === row.id;

          return (
            <li key={row.id} className="border border-rule bg-sheet px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-lg leading-tight">{row.name}</h3>
                <span
                  className={`numeric shrink-0 text-sm ${
                    row.owed === 0 ? 'text-paid' : 'text-stamp'
                  }`}
                >
                  {row.owed === 0 ? 'al día' : `debe ${formatMoney(row.owed, raffle.currency)}`}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1">
                {row.cells.map((cell) => {
                  const selected = isActive && selectedNumbers.includes(cell.number);

                  return (
                    <button
                      key={cell.ticketId}
                      type="button"
                      aria-pressed={cell.status === 'paid' ? undefined : selected}
                      onClick={() => {
                        toggle(row, cell);
                      }}
                      className={`numeric min-h-9 border px-2 py-0.5 text-sm ${
                        cell.status === 'paid'
                          ? 'border-rule text-ink-soft line-through decoration-paid decoration-2'
                          : selected
                            ? 'border-ink bg-ink text-sheet'
                            : 'border-stamp text-stamp'
                      }`}
                    >
                      {cell.label}
                    </button>
                  );
                })}

                {pending.length > 1 ? (
                  <button
                    type="button"
                    className="min-h-9 px-2 text-xs underline underline-offset-4"
                    onClick={() => {
                      setSelection({
                        customerId: row.id,
                        numbers: pending.map((cell) => cell.number).sort((a, b) => a - b),
                      });
                    }}
                  >
                    Todas
                  </button>
                ) : null}
              </div>

              <div className="mt-2 text-xs text-ink-soft">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
                  <span className="numeric">
                    {row.cells.length} {row.cells.length === 1 ? 'boleta' : 'boletas'} · abonado{' '}
                    {formatMoney(row.paid, raffle.currency)}
                  </span>
                </div>
                {row.phone === null ? (
                  <AddPhone customerId={row.id} onSaved={onCustomerChanged} />
                ) : (
                  <a className="numeric underline underline-offset-4" href={`tel:${row.phone}`}>
                    {row.phone}
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {activeRow !== null && selectedCells.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 border-t border-ink bg-sheet px-4 py-3">
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="numeric truncate text-sm">
                {activeRow.name} · {selectedCells.length}{' '}
                {selectedCells.length === 1 ? 'boleta' : 'boletas'} ·{' '}
                {formatMoney(selectedTotal, raffle.currency)}
              </p>
              <button
                type="button"
                className="text-xs text-ink-soft underline underline-offset-4"
                onClick={() => {
                  setSelection(null);
                }}
              >
                Quitar selección
              </button>
            </div>
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() => {
                setConfirming(true);
              }}
            >
              Cobrar
            </button>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirming}
        title={`Cobrar ${selectedCells.length} ${
          selectedCells.length === 1 ? 'boleta' : 'boletas'
        }`}
        confirmLabel="Sí, ya pagó"
        busy={busy}
        onCancel={() => {
          setConfirming(false);
        }}
        onConfirm={() => {
          setConfirming(false);
          onMarkAsPaid(selectedNumbers);
          setSelection(null);
        }}
      >
        <p>
          Vas a registrar {formatMoney(selectedTotal, raffle.currency)} de{' '}
          {activeRow?.name ?? 'este cliente'} por{' '}
          <span className="numeric">
            {selectedCells.map((cell) => cell.label).join(', ')}
          </span>
          .
        </p>
        <p className="mt-2 text-ink-soft">
          Una vez pagadas, esas boletas no se pueden liberar ni pasar a otro cliente. Esto no se
          puede deshacer.
        </p>
      </ConfirmDialog>
    </>
  );
}
