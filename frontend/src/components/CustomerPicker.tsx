import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { api, type Customer, type CustomerInput } from '../lib/raffles-api';

interface CustomerPickerProps {
  readonly onChange: (customer: CustomerInput | null) => void;
  /** Restricts the suggestions to buyers of this raffle. */
  readonly raffleId: string;
  readonly autoFocus?: boolean;
}

/**
 * Names a customer, either by picking one already buying in this raffle or by
 * typing a new one.
 *
 * Suggestions are limited to this raffle: the common case is the buyer coming
 * back for more numbers, and offering the whole address book puts people from
 * other raffles in the way. Somebody from another raffle is recognized by their
 * phone, which the reservation reports as a conflict to merge.
 */
export function CustomerPicker({
  onChange,
  raffleId,
  autoFocus,
}: CustomerPickerProps): React.JSX.Element {
  const [term, setTerm] = useState('');
  const [phone, setPhone] = useState('');
  const [picked, setPicked] = useState<Customer | null>(null);

  const matches = useQuery({
    queryKey: ['customers', raffleId, term],
    queryFn: () => api.searchCustomers(term, raffleId),
    enabled: picked === null && term.trim().length >= 2,
    staleTime: 30_000,
  });

  function typeName(value: string): void {
    setTerm(value);
    setPicked(null);
    onChange(value.trim() === '' ? null : { name: value, phone: phone === '' ? null : phone });
  }

  function typePhone(value: string): void {
    setPhone(value);
    if (picked === null) {
      onChange(term.trim() === '' ? null : { name: term, phone: value === '' ? null : value });
    }
  }

  function pick(customer: Customer): void {
    setPicked(customer);
    setTerm(customer.name);
    setPhone(customer.phone ?? '');
    onChange({ id: customer.id });
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="eyebrow">Cliente</span>
        <input
          className="field"
          value={term}
          onChange={(event) => {
            typeName(event.target.value);
          }}
          placeholder="Ana Torres"
          autoComplete="off"
          required
          autoFocus={autoFocus}
        />
      </label>

      {picked !== null ? (
        <p className="text-sm text-paid">
          Usando la ficha de {picked.name}
          {picked.phone === null ? '' : ` · ${picked.phone}`}.{' '}
          <button
            type="button"
            className="underline underline-offset-4"
            onClick={() => {
              setPicked(null);
              onChange({ name: term, phone: phone === '' ? null : phone });
            }}
          >
            Es otra persona
          </button>
        </p>
      ) : null}

      {picked === null && (matches.data?.length ?? 0) > 0 ? (
        <ul className="flex flex-col border border-rule">
          {matches.data?.map((customer) => (
            <li key={customer.id} className="border-b border-rule last:border-b-0">
              <button
                type="button"
                className="flex min-h-11 w-full items-baseline justify-between gap-3 px-3 py-2 text-left"
                onClick={() => {
                  pick(customer);
                }}
              >
                <span>{customer.name}</span>
                <span className="numeric shrink-0 text-xs text-ink-soft">
                  {customer.phone ?? 'sin teléfono'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <label className="flex flex-col gap-1">
        <span className="eyebrow">Teléfono</span>
        <input
          className="field numeric"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(event) => {
            typePhone(event.target.value);
          }}
          placeholder="300 111 2233"
          disabled={picked !== null}
        />
        {picked === null ? (
          <span className="text-xs text-ink-soft">
            Con el mismo teléfono reusamos la ficha del cliente.
          </span>
        ) : null}
      </label>
    </div>
  );
}
