import { useMutation } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { useMemo, useState } from 'react';

import { MergeCustomerDialog, type PhoneConflict } from '../../components/MergeCustomerDialog';
import { NumberGrid } from '../../components/NumberGrid';
import { Sheet } from '../../components/Sheet';
import { useBoard } from '../../features/board/use-board';
import { ApiError } from '../../lib/api';
import { formatMoney } from '../../lib/format';
import { api, type CustomerInput } from '../../lib/rifas-api';
import { ReserveForm } from '../ReserveForm';

/**
 * The board itself: pick free numbers, hand them to a customer, and open the
 * ones already taken.
 */
export function BoardTab(): React.JSX.Element {
  const { raffleId } = useParams({ from: '/raffles/$raffleId' });
  const { board, reload, openCell, readOnly } = useBoard();
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());
  const [reserving, setReserving] = useState(false);
  const [conflict, setConflict] = useState<readonly number[] | null>(null);
  const [phoneConflict, setPhoneConflict] = useState<PhoneConflict | null>(null);

  const takenByNumber = useMemo(
    () => new Map(board.takenCells.map((cell) => [cell.number, cell])),
    [board.takenCells],
  );

  const reserve = useMutation({
    mutationFn: (input: CustomerInput) => api.reserve(raffleId, [...selected], input),
    onSuccess: () => {
      setReserving(false);
      setPhoneConflict(null);
      setSelected(new Set());
      reload();
    },
    onError: (error: unknown, input: CustomerInput) => {
      if (!(error instanceof ApiError)) return;

      if (error.body.numbers !== undefined) {
        setConflict(error.body.numbers);
        setReserving(false);
        reload();
        return;
      }

      // The phone is on file under another name: ask before merging them.
      if (
        error.body.code === 'DUPLICATE_CUSTOMER_PHONE' &&
        error.body.customerId !== undefined &&
        !('id' in input)
      ) {
        setPhoneConflict({
          customerId: error.body.customerId,
          customerName: error.body.customerName ?? 'otro cliente',
          phone: input.phone ?? '',
          typedName: input.name,
        });
        setReserving(false);
      }
    },
  });

  function toggle(value: number): void {
    if (readOnly) return;

    const cell = takenByNumber.get(value);
    // Tapping a taken number opens it; only free numbers join a selection.
    if (cell !== undefined) {
      openCell(cell);
      return;
    }

    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setSelected(next);
    setConflict(null);
  }

  const { raffle, summary } = board;
  const selectionTotal = selected.size * raffle.ticketPriceMinorUnits;

  return (
    <>
      {conflict !== null ? (
        <p role="alert" className="mb-4 border-l-2 border-stamp pl-3 text-sm text-stamp">
          {conflict.length === 1
            ? `El ${String(conflict[0]).padStart(raffle.numberDigits, '0')} lo apartaron primero.`
            : `Estos números ya estaban apartados: ${conflict
                .map((value) => String(value).padStart(raffle.numberDigits, '0'))
                .join(', ')}.`}{' '}
          Ya actualizamos el tablero.
        </p>
      ) : null}

      <NumberGrid
        raffle={raffle}
        takenCells={board.takenCells}
        selected={selected}
        onToggle={toggle}
      />

      <Legend />

      {readOnly ? (
        <p className="mt-4 border-l-2 border-ink pl-3 text-sm text-ink-soft">
          Esta rifa está cerrada. El tablero queda como registro de lo que se vendió.
        </p>
      ) : null}

      {selected.size > 0 ? (
        <div className="fixed inset-x-0 bottom-0 border-t border-ink bg-sheet px-4 py-3">
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="numeric text-sm">
                {selected.size} {selected.size === 1 ? 'boleta' : 'boletas'} ·{' '}
                {formatMoney(selectionTotal, raffle.currency)}
              </p>
              <button
                type="button"
                className="text-xs text-ink-soft underline underline-offset-4"
                onClick={() => {
                  setSelected(new Set());
                }}
              >
                Quitar selección
              </button>
            </div>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setReserving(true);
              }}
            >
              Apartar
            </button>
          </div>
        </div>
      ) : null}

      <Sheet
        open={reserving}
        title={`Apartar ${selected.size} ${selected.size === 1 ? 'boleta' : 'boletas'}`}
        onClose={() => {
          setReserving(false);
        }}
      >
        <ReserveForm
          raffleId={raffleId}
          numbers={[...selected].sort((a, b) => a - b)}
          digits={raffle.numberDigits}
          total={formatMoney(selectionTotal, raffle.currency)}
          busy={reserve.isPending}
          onSubmit={(customer) => {
            reserve.mutate(customer);
          }}
        />
      </Sheet>

      <MergeCustomerDialog
        conflict={phoneConflict}
        busy={reserve.isPending}
        onCancel={() => {
          setPhoneConflict(null);
        }}
        onConfirm={(pending) => {
          reserve.mutate({ id: pending.customerId, name: pending.typedName });
        }}
      />

      <p className="sr-only" aria-live="polite">
        {summary.freeNumbers} números libres de {summary.totalNumbers}.
      </p>
    </>
  );
}

function Legend(): React.JSX.Element {
  return (
    <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-soft">
      <li className="flex items-center gap-2">
        <span className="h-3 w-3 border border-rule bg-sheet" aria-hidden="true" />
        Libre
      </li>
      <li className="flex items-center gap-2">
        <span className="h-3 w-3 border border-stamp bg-stamp/12" aria-hidden="true" />
        Apartada
      </li>
      <li className="flex items-center gap-2">
        <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
          <rect width="12" height="12" fill="none" stroke="var(--color-rule)" />
          <path d="M2 10 L10 2" stroke="var(--color-paid)" strokeWidth="1.6" />
        </svg>
        Pagada
      </li>
    </ul>
  );
}
