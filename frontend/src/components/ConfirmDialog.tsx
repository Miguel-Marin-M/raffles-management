import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  readonly open: boolean;
  readonly title: string;
  readonly confirmLabel: string;
  readonly busy?: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly children: React.ReactNode;
}

/**
 * In-app confirmation for actions that cannot be undone.
 *
 * The browser's own `confirm()` is deliberately avoided: it cannot say which
 * numbers and which customer are involved, and on a phone it reads as a
 * warning from the browser rather than from the app.
 */
export function ConfirmDialog({
  open,
  title,
  confirmLabel,
  busy = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps): React.JSX.Element {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onCancel}
      onClick={(event) => {
        if (event.target === ref.current) onCancel();
      }}
      className="mx-auto my-auto w-[min(28rem,calc(100vw-2rem))] rounded-sm border border-ink bg-sheet p-0 text-ink backdrop:bg-ink/45"
      aria-labelledby="confirmar-titulo"
    >
      <div className="border-b border-rule px-4 py-3">
        <h2 id="confirmar-titulo" className="text-lg leading-tight">
          {title}
        </h2>
      </div>

      <div className="px-4 py-4">{children}</div>

      <div className="flex gap-2 border-t border-rule px-4 py-3">
        <button type="button" className="btn flex-1" onClick={onConfirm} disabled={busy}>
          {busy ? 'Guardando…' : confirmLabel}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </dialog>
  );
}
