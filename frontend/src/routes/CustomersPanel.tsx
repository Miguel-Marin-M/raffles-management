import { useMemo, useState } from 'react';

import { AddPhone } from '../components/AddPhone';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { CustomerPicker } from '../components/CustomerPicker';
import { MergeCustomerDialog, type PhoneConflict } from '../components/MergeCustomerDialog';
import { Sheet } from '../components/Sheet';
import { formatMoney } from '../lib/format';
import type { BoardCell, CustomerInput, Raffle } from '../lib/rifas-api';

interface CustomersPanelProps {
  readonly raffle: Raffle;
  readonly takenCells: readonly BoardCell[];
  readonly busy: boolean;
  readonly onOpenCell: (cell: BoardCell) => void;
  readonly onMarkAsPaid: (numbers: readonly number[]) => void;
  readonly onRelease: (numbers: readonly number[]) => void;
  readonly onReassign: (numbers: readonly number[], customer: CustomerInput) => void;
  readonly onRegisterPayment: (numbers: readonly number[], amountMinorUnits: number) => void;
  readonly onCustomerChanged: () => void;
  readonly phoneConflict: PhoneConflict | null;
  readonly onResolveConflict: (conflict: PhoneConflict | null) => void;
  readonly readOnly: boolean;
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
 * Numbers are picked one by one — somebody who reserved five boletas often
 * pays for three today — and that one selection feeds the three things that
 * can happen to them: charging, releasing, or handing them to another person.
 */
export function CustomersPanel({
  raffle,
  takenCells,
  busy,
  onOpenCell,
  onMarkAsPaid,
  onRelease,
  onReassign,
  onRegisterPayment,
  onCustomerChanged,
  phoneConflict,
  onResolveConflict,
  readOnly,
}: CustomersPanelProps): React.JSX.Element {
  // Only one customer is collected from at a time; picking numbers of another
  // one starts a new selection.
  const [selection, setSelection] = useState<{ customerId: string; numbers: number[] } | null>(
    null,
  );
  const [confirming, setConfirming] = useState<'charge' | 'release' | null>(null);
  const [reassigning, setReassigning] = useState(false);
  const [paying, setPaying] = useState(false);
  const [amount, setAmount] = useState('');
  const [newCustomer, setNewCustomer] = useState<CustomerInput | null>(null);

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
  const selectedWithPayments = selectedCells.filter((cell) => cell.amountPaidMinorUnits > 0);
  const selectedLabels = selectedCells.map((cell) => cell.label).join(', ');

  function toggle(row: CustomerRow, cell: BoardCell): void {
    if (readOnly) return;
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

  function clearSelection(): void {
    setSelection(null);
    setNewCustomer(null);
    setAmount('');
  }

  const share = selectedCells.length === 0 ? 0 : Math.floor(Number(amount) / selectedCells.length);
  const amountIsValid =
    Number.isFinite(Number(amount)) && Number(amount) > 0 && Number(amount) <= selectedTotal;

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
        {readOnly
          ? 'Esta rifa está cerrada. Así quedó el registro de quién compró cada número.'
          : 'Toca los números apartados para escoger sobre cuáles quieres actuar.'}
      </p>

      <ul className="flex flex-col gap-3 pb-28">
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

                {pending.length > 1 && !readOnly ? (
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
                <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="numeric">
                    {row.cells.length} {row.cells.length === 1 ? 'boleta' : 'boletas'} · abonado{' '}
                    {formatMoney(row.paid, raffle.currency)}
                  </span>
                </div>
                {row.phone === null ? (
                  readOnly ? null : (
                    <AddPhone customerId={row.id} onSaved={onCustomerChanged} />
                  )
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
          <div className="mx-auto flex max-w-2xl flex-col gap-2">
            <div className="flex items-center gap-3">
              <p className="numeric min-w-0 flex-1 truncate text-sm">
                {activeRow.name} · {selectedCells.length}{' '}
                {selectedCells.length === 1 ? 'boleta' : 'boletas'} ·{' '}
                {formatMoney(selectedTotal, raffle.currency)}
              </p>
              <button
                type="button"
                className="btn"
                disabled={busy}
                onClick={() => {
                  setConfirming('charge');
                }}
              >
                Cobrar
              </button>
            </div>

            {/* Releasing and handing over are kept quiet: the daily action is
                collecting, and these two are hard to undo. */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <button
                type="button"
                className="text-stamp underline underline-offset-4"
                disabled={busy}
                onClick={() => {
                  setConfirming('release');
                }}
              >
                Liberar
              </button>
              <button
                type="button"
                className="underline underline-offset-4"
                disabled={busy}
                onClick={() => {
                  setPaying(true);
                }}
              >
                Abonar
              </button>
              <button
                type="button"
                className="underline underline-offset-4"
                disabled={busy}
                onClick={() => {
                  setReassigning(true);
                }}
              >
                Pasar a otro cliente
              </button>
              <button
                type="button"
                className="text-ink-soft underline underline-offset-4"
                onClick={clearSelection}
              >
                Quitar selección
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirming === 'charge'}
        title={`Cobrar ${selectedCells.length} ${
          selectedCells.length === 1 ? 'boleta' : 'boletas'
        }`}
        confirmLabel="Sí, ya pagó"
        busy={busy}
        onCancel={() => {
          setConfirming(null);
        }}
        onConfirm={() => {
          setConfirming(null);
          onMarkAsPaid(selectedNumbers);
          clearSelection();
        }}
      >
        <p>
          Vas a registrar {formatMoney(selectedTotal, raffle.currency)} de{' '}
          {activeRow?.name ?? 'este cliente'} por{' '}
          <span className="numeric">{selectedLabels}</span>.
        </p>
        <p className="mt-2 text-ink-soft">
          Lo que este cliente haya abonado a sus otros números pasa a estas boletas, y esos
          quedan en cero. Una vez pagadas no se pueden liberar ni pasar a otro cliente.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirming === 'release'}
        title={`Liberar ${selectedCells.length} ${
          selectedCells.length === 1 ? 'boleta' : 'boletas'
        }`}
        confirmLabel="Sí, liberar"
        busy={busy}
        onCancel={() => {
          setConfirming(null);
        }}
        onConfirm={() => {
          setConfirming(null);
          onRelease(selectedNumbers);
          clearSelection();
        }}
      >
        <p>
          <span className="numeric">{selectedLabels}</span> vuelven a quedar libres y{' '}
          {activeRow?.name ?? 'el cliente'} deja de tenerlas.
        </p>
        {selectedWithPayments.length > 0 ? (
          <p className="mt-2 text-stamp">
            Ojo:{' '}
            <span className="numeric">
              {selectedWithPayments.map((cell) => cell.label).join(', ')}
            </span>{' '}
            ya tienen abonos. Devuélvele el dinero antes de liberarlas.
          </p>
        ) : null}
        <p className="mt-2 text-ink-soft">Esto no se puede deshacer.</p>
      </ConfirmDialog>

      <Sheet
        open={paying}
        title={`Abonar a ${selectedCells.length} ${
          selectedCells.length === 1 ? 'boleta' : 'boletas'
        }`}
        onClose={() => {
          setPaying(false);
        }}
      >
        <div className="flex flex-col gap-4">
          <div>
            <p className="eyebrow">Números</p>
            <p className="numeric mt-1 text-lg">{selectedLabels}</p>
            <p className="numeric mt-1 text-sm text-ink-soft">
              Deben {formatMoney(selectedTotal, raffle.currency)}
            </p>
          </div>

          <label className="flex flex-col gap-1">
            <span className="eyebrow">Abono</span>
            <input
              className="field numeric"
              type="number"
              inputMode="numeric"
              min={1}
              max={selectedTotal}
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
              }}
              placeholder={String(Math.round(selectedTotal / 2))}
              autoFocus
            />
          </label>

          {amount !== '' && !amountIsValid ? (
            <p role="alert" className="text-sm text-stamp">
              El abono no puede ser negativo ni pasar de{' '}
              {formatMoney(selectedTotal, raffle.currency)}.
            </p>
          ) : null}

          {amountIsValid ? (
            <p className="text-sm text-ink-soft">
              Se reparte por igual: unos {formatMoney(share, raffle.currency)} a cada boleta.
              Ninguna queda pagada hasta que digas cuáles juegan.
            </p>
          ) : null}

          <button
            type="button"
            className="btn"
            disabled={!amountIsValid || busy}
            onClick={() => {
              setPaying(false);
              onRegisterPayment(selectedNumbers, Number(amount));
              clearSelection();
            }}
          >
            Registrar abono
          </button>
        </div>
      </Sheet>

      <Sheet
        open={reassigning}
        title={`Pasar ${selectedCells.length} ${
          selectedCells.length === 1 ? 'boleta' : 'boletas'
        }`}
        onClose={() => {
          setReassigning(false);
        }}
      >
        <div className="flex flex-col gap-4">
          <div>
            <p className="eyebrow">Números</p>
            <p className="numeric mt-1 text-lg">{selectedLabels}</p>
            <p className="mt-1 text-sm text-ink-soft">
              Hoy son de {activeRow?.name ?? 'este cliente'}. Lo abonado se va con las boletas.
            </p>
          </div>

          <CustomerPicker onChange={setNewCustomer} raffleId={raffle.id} autoFocus />

          <button
            type="button"
            className="btn"
            disabled={newCustomer === null || busy}
            onClick={() => {
              if (newCustomer === null) return;
              setReassigning(false);
              onReassign(selectedNumbers, newCustomer);
              clearSelection();
            }}
          >
            Pasar las boletas
          </button>
        </div>
      </Sheet>

      <MergeCustomerDialog
        conflict={phoneConflict}
        busy={busy}
        onCancel={() => {
          onResolveConflict(null);
        }}
        onConfirm={(pending) => {
          onReassign(selectedNumbers, { id: pending.customerId, name: pending.typedName });
          onResolveConflict(null);
          clearSelection();
        }}
      />
    </>
  );
}
