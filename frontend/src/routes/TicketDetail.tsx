import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { AddPhone } from '../components/AddPhone';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { CustomerPicker } from '../components/CustomerPicker';
import { describeError } from '../lib/errors';
import { formatMoney } from '../lib/format';
import { api, type BoardCell, type CustomerInput } from '../lib/raffles-api';

interface TicketDetailProps {
  readonly cell: BoardCell;
  readonly raffleId: string;
  readonly currency: string;
  readonly ticketPriceMinorUnits: number;
  readonly busy: boolean;
  readonly onMarkAsPaid: () => void;
  readonly onRelease: () => void;
  readonly onReassign: (customer: CustomerInput) => void;
  readonly onChanged: () => void;
}

/**
 * What one taken number owes, and what can still happen to it.
 *
 * A paid ticket only shows its record: handing it over or releasing it would
 * erase the trace of who paid for that number, so those actions disappear
 * instead of failing when pressed.
 */
export function TicketDetail({
  cell,
  raffleId,
  currency,
  ticketPriceMinorUnits,
  busy,
  onMarkAsPaid,
  onRelease,
  onReassign,
  onChanged,
}: TicketDetailProps): React.JSX.Element {
  const [partial, setPartial] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [reassigning, setReassigning] = useState(false);
  const [newCustomer, setNewCustomer] = useState<CustomerInput | null>(null);
  const [confirming, setConfirming] = useState(false);

  const registerPayment = useMutation({
    mutationFn: (amount: number) => api.registerPayment(raffleId, [cell.number], amount),
    onSuccess: () => {
      setPartial('');
      setError(null);
      onChanged();
    },
    onError: (cause: unknown) => {
      setError(describeError(cause));
    },
  });

  const paid = cell.status === 'paid';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="eyebrow">Cliente</p>
        <p className="text-lg">{cell.customerName}</p>
        {cell.customerPhone === null ? (
          <AddPhone customerId={cell.customerId} onSaved={onChanged} />
        ) : (
          <a
            className="numeric self-start text-sm underline underline-offset-4"
            href={`tel:${cell.customerPhone}`}
          >
            {cell.customerPhone}
          </a>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-3">
        <div className="border-t border-ink pt-2">
          <dt className="eyebrow">Abonado</dt>
          <dd className="numeric text-base text-paid">
            {formatMoney(cell.amountPaidMinorUnits, currency)}
          </dd>
        </div>
        <div className="border-t border-ink pt-2">
          <dt className="eyebrow">Debe</dt>
          <dd className="numeric text-base text-stamp">
            {formatMoney(cell.outstandingMinorUnits, currency)}
          </dd>
        </div>
      </dl>

      {paid ? (
        <p className="border-l-2 border-paid pl-3 text-sm">
          Esta boleta está pagada. Ya no se puede liberar ni pasar a otro cliente.
        </p>
      ) : (
        <>
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => {
              setConfirming(true);
            }}
          >
            Marcar como pagada · {formatMoney(cell.outstandingMinorUnits, currency)}
          </button>

          <div className="flex items-end gap-2">
            <label className="flex flex-1 flex-col gap-1">
              <span className="eyebrow">Registrar un abono</span>
              <input
                className="field numeric"
                type="number"
                inputMode="numeric"
                min={1}
                max={cell.outstandingMinorUnits}
                value={partial}
                onChange={(event) => {
                  setPartial(event.target.value);
                }}
                placeholder={String(Math.round(ticketPriceMinorUnits / 2))}
              />
            </label>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={partial === '' || registerPayment.isPending}
              onClick={() => {
                registerPayment.mutate(Number(partial));
              }}
            >
              Abonar
            </button>
          </div>
        </>
      )}

      {error !== null ? (
        <p role="alert" className="border-l-2 border-stamp pl-3 text-sm text-stamp">
          {error}
        </p>
      ) : null}

      {paid ? null : reassigning ? (
        <div className="flex flex-col gap-3 border-t border-rule pt-4">
          <CustomerPicker onChange={setNewCustomer} raffleId={raffleId} autoFocus />
          <div className="flex gap-2">
            <button
              type="button"
              className="btn flex-1"
              disabled={newCustomer === null || busy}
              onClick={() => {
                if (newCustomer !== null) onReassign(newCustomer);
              }}
            >
              Pasar la boleta
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setReassigning(false);
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="self-start text-sm underline underline-offset-4"
          onClick={() => {
            setReassigning(true);
          }}
        >
          Pasar la boleta a otro cliente
        </button>
      )}

      {paid ? null : (
        <>
          <button
            type="button"
            className="self-start text-sm text-stamp underline underline-offset-4"
            onClick={onRelease}
            disabled={busy || cell.amountPaidMinorUnits > 0}
          >
            Liberar el número
          </button>
          {cell.amountPaidMinorUnits > 0 ? (
            <p className="-mt-2 text-xs text-ink-soft">
              No se puede liberar una boleta con abonos: primero devuelve el dinero.
            </p>
          ) : null}
        </>
      )}

      <ConfirmDialog
        open={confirming}
        title={`Marcar la boleta ${cell.label} como pagada`}
        confirmLabel="Sí, ya pagó"
        busy={busy}
        onCancel={() => {
          setConfirming(false);
        }}
        onConfirm={() => {
          setConfirming(false);
          onMarkAsPaid();
        }}
      >
        <p>
          Vas a registrar {formatMoney(cell.outstandingMinorUnits, currency)} de{' '}
          {cell.customerName}.
        </p>
        <p className="mt-2 text-ink-soft">
          Una vez pagada, la boleta no se puede liberar ni pasar a otro cliente. Esto no se
          puede deshacer.
        </p>
      </ConfirmDialog>
    </div>
  );
}
