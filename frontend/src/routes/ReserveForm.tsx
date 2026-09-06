import { useState, type FormEvent } from 'react';

import { CustomerPicker } from '../components/CustomerPicker';
import type { CustomerInput } from '../lib/rifas-api';

interface ReserveFormProps {
  readonly numbers: readonly number[];
  readonly digits: number;
  readonly total: string;
  readonly busy: boolean;
  readonly onSubmit: (customer: CustomerInput) => void;
}

/** Who is taking the selected numbers. */
export function ReserveForm({
  numbers,
  digits,
  total,
  busy,
  onSubmit,
}: ReserveFormProps): React.JSX.Element {
  const [customer, setCustomer] = useState<CustomerInput | null>(null);

  function submit(event: FormEvent): void {
    event.preventDefault();
    if (customer !== null) onSubmit(customer);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <p className="rotulo">Números</p>
        <p className="cifra mt-1 text-lg">
          {numbers.map((value) => String(value).padStart(digits, '0')).join(' · ')}
        </p>
        <p className="cifra mt-1 text-sm text-tinta-suave">Total {total}</p>
      </div>

      <CustomerPicker onChange={setCustomer} autoFocus />

      <button type="submit" className="boton" disabled={busy || customer === null}>
        {busy ? 'Apartando…' : 'Apartar boletas'}
      </button>
    </form>
  );
}
