import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { api, type Customer, type CustomerInput } from '../lib/rifas-api';

interface CustomerPickerProps {
  readonly onChange: (customer: CustomerInput | null) => void;
  readonly autoFocus?: boolean;
}

/**
 * Names a customer, either by picking one already on file or by typing a new
 * one. The organizer types a name in both cases, so there is a single field
 * and the matches appear underneath while typing.
 */
export function CustomerPicker({ onChange, autoFocus }: CustomerPickerProps): React.JSX.Element {
  const [term, setTerm] = useState('');
  const [phone, setPhone] = useState('');
  const [picked, setPicked] = useState<Customer | null>(null);

  const matches = useQuery({
    queryKey: ['customers', term],
    queryFn: () => api.searchCustomers(term),
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
        <span className="rotulo">Cliente</span>
        <input
          className="campo"
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
        <p className="text-sm text-cancelado">
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
        <ul className="flex flex-col border border-linea">
          {matches.data?.map((customer) => (
            <li key={customer.id} className="border-b border-linea last:border-b-0">
              <button
                type="button"
                className="flex min-h-11 w-full items-baseline justify-between gap-3 px-3 py-2 text-left"
                onClick={() => {
                  pick(customer);
                }}
              >
                <span>{customer.name}</span>
                <span className="cifra shrink-0 text-xs text-tinta-suave">
                  {customer.phone ?? 'sin teléfono'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <label className="flex flex-col gap-1">
        <span className="rotulo">Teléfono</span>
        <input
          className="campo cifra"
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
          <span className="text-xs text-tinta-suave">
            Con el mismo teléfono reusamos la ficha del cliente.
          </span>
        ) : null}
      </label>
    </div>
  );
}
