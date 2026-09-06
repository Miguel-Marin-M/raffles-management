import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { ApiError } from '../lib/api';
import { api } from '../lib/rifas-api';

interface AddPhoneProps {
  readonly customerId: string;
  readonly onSaved: () => void;
}

/**
 * Fills in the phone of a customer registered without one.
 *
 * Numbers are often reserved face to face before the organizer asks for a
 * phone, so the record has to be completable afterwards.
 */
export function AddPhone({ customerId, onSaved }: AddPhoneProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => api.updateCustomer(customerId, { phone }),
    onSuccess: () => {
      setOpen(false);
      setPhone('');
      setError(null);
      onSaved();
    },
    onError: (cause: unknown) => {
      setError(
        cause instanceof ApiError && cause.body.code === 'DUPLICATE_CUSTOMER_PHONE'
          ? 'Ese teléfono ya está en la ficha de otro cliente.'
          : 'Ese teléfono no es válido.',
      );
    },
  });

  if (!open) {
    return (
      <button
        type="button"
        className="self-start text-sm underline underline-offset-4"
        onClick={() => {
          setOpen(true);
        }}
      >
        Añadir teléfono
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-end gap-2">
        <label className="flex flex-1 flex-col gap-1">
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
            autoFocus
          />
        </label>
        <button
          type="button"
          className="boton"
          disabled={phone.trim() === '' || save.isPending}
          onClick={() => {
            save.mutate();
          }}
        >
          Guardar
        </button>
      </div>

      {error !== null ? (
        <p role="alert" className="text-sm text-sello">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        className="self-start text-xs text-tinta-suave underline underline-offset-4"
        onClick={() => {
          setOpen(false);
          setError(null);
        }}
      >
        Cancelar
      </button>
    </div>
  );
}
