import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { describeError } from '../lib/errors';
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
      setError(describeError(cause));
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
          <span className="eyebrow">Teléfono</span>
          <input
            className="field numeric"
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
          className="btn"
          disabled={phone.trim() === '' || save.isPending}
          onClick={() => {
            save.mutate();
          }}
        >
          Guardar
        </button>
      </div>

      {error !== null ? (
        <p role="alert" className="text-sm text-stamp">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        className="self-start text-xs text-ink-soft underline underline-offset-4"
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
