import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { ApiError } from '../lib/api';
import { formatMoney } from '../lib/format';
import { api, type BoardCell } from '../lib/rifas-api';

interface TicketDetailProps {
  readonly cell: BoardCell;
  readonly currency: string;
  readonly ticketPriceMinorUnits: number;
  readonly busy: boolean;
  readonly onMarkAsPaid: () => void;
  readonly onRelease: () => void;
  readonly onPaid: () => void;
}

/** What one taken number owes, and the three things that can happen to it. */
export function TicketDetail({
  cell,
  currency,
  ticketPriceMinorUnits,
  busy,
  onMarkAsPaid,
  onRelease,
  onPaid,
}: TicketDetailProps): React.JSX.Element {
  const [partial, setPartial] = useState('');
  const [error, setError] = useState<string | null>(null);

  const registerPayment = useMutation({
    mutationFn: (amount: number) => api.registerPayment(cell.ticketId, amount),
    onSuccess: () => {
      setPartial('');
      setError(null);
      onPaid();
    },
    onError: (cause: unknown) => {
      setError(
        cause instanceof ApiError && cause.body.code === 'PAYMENT_EXCEEDS_OUTSTANDING'
          ? 'El abono es mayor a lo que falta por pagar.'
          : 'No pudimos registrar el abono.',
      );
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="rotulo">Cliente</p>
        <p className="text-lg">{cell.customerName}</p>
      </div>

      <dl className="grid grid-cols-2 gap-3">
        <div className="border-t border-tinta pt-2">
          <dt className="rotulo">Abonado</dt>
          <dd className="cifra text-base text-cancelado">
            {formatMoney(cell.amountPaidMinorUnits, currency)}
          </dd>
        </div>
        <div className="border-t border-tinta pt-2">
          <dt className="rotulo">Debe</dt>
          <dd className="cifra text-base text-sello">
            {formatMoney(cell.outstandingMinorUnits, currency)}
          </dd>
        </div>
      </dl>

      {cell.status === 'paid' ? (
        <p className="border-l-2 border-cancelado pl-3 text-sm">
          Esta boleta ya está pagada por completo.
        </p>
      ) : (
        <>
          <button type="button" className="boton" onClick={onMarkAsPaid} disabled={busy}>
            Marcar como pagada · {formatMoney(cell.outstandingMinorUnits, currency)}
          </button>

          <div className="flex items-end gap-2">
            <label className="flex flex-1 flex-col gap-1">
              <span className="rotulo">Registrar un abono</span>
              <input
                className="campo cifra"
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
              className="boton boton-secundario"
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
        <p role="alert" className="border-l-2 border-sello pl-3 text-sm text-sello">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        className="self-start text-sm text-sello underline underline-offset-4"
        onClick={onRelease}
        disabled={busy}
      >
        Liberar el número
      </button>
      {cell.amountPaidMinorUnits > 0 ? (
        <p className="-mt-2 text-xs text-tinta-suave">
          No se puede liberar una boleta con abonos: primero devuelve el dinero.
        </p>
      ) : null}
    </div>
  );
}
