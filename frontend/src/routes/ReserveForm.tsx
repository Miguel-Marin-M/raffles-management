import { useState, type FormEvent } from 'react';

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
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  function submit(event: FormEvent): void {
    event.preventDefault();
    onSubmit({ name, phone: phone === '' ? null : phone });
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

      <label className="flex flex-col gap-1">
        <span className="rotulo">Cliente</span>
        <input
          className="campo"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
          placeholder="Ana Torres"
          required
          autoFocus
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="rotulo">Teléfono</span>
        <input
          className="campo cifra"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(event) => {
            setPhone(event.target.value);
          }}
          placeholder="300 111 2233"
        />
        <span className="text-xs text-tinta-suave">
          Si ya le vendiste antes, con el mismo teléfono reusamos su ficha.
        </span>
      </label>

      <button type="submit" className="boton" disabled={busy}>
        {busy ? 'Apartando…' : 'Apartar boletas'}
      </button>
    </form>
  );
}
