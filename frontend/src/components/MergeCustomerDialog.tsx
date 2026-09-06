import { ConfirmDialog } from './ConfirmDialog';

export interface PhoneConflict {
  readonly customerId: string;
  readonly customerName: string;
  readonly phone: string;
  /** Name the organizer just typed for the same phone. */
  readonly typedName: string;
}

interface MergeCustomerDialogProps {
  readonly conflict: PhoneConflict | null;
  readonly busy: boolean;
  readonly onConfirm: (conflict: PhoneConflict) => void;
  readonly onCancel: () => void;
}

/**
 * Asks what to do when a phone already belongs to somebody on file.
 *
 * Filing the boletas under the old record without asking is how two different
 * people end up sharing one; merging them under the name just typed is usually
 * right, but it is the organizer who knows.
 */
export function MergeCustomerDialog({
  conflict,
  busy,
  onConfirm,
  onCancel,
}: MergeCustomerDialogProps): React.JSX.Element {
  return (
    <ConfirmDialog
      open={conflict !== null}
      title="Ese teléfono ya está registrado"
      confirmLabel="Sí, unirlos"
      busy={busy}
      onCancel={onCancel}
      onConfirm={() => {
        if (conflict !== null) onConfirm(conflict);
      }}
    >
      <p>
        El <span className="numeric">{conflict?.phone}</span> ya está registrado para{' '}
        <strong>{conflict?.customerName}</strong>. ¿Quieres unir sus boletas con estas bajo el
        nombre <strong>{conflict?.typedName}</strong>?
      </p>
      <p className="mt-2 text-ink-soft">
        Si es otra persona, cancela y escríbele otro teléfono.
      </p>
    </ConfirmDialog>
  );
}
