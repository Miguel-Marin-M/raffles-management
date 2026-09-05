import { useEffect, useRef } from 'react';

interface SheetProps {
  readonly open: boolean;
  readonly title: string;
  readonly onClose: () => void;
  readonly children: React.ReactNode;
}

/**
 * Bottom sheet built on the native dialog element, which brings focus
 * trapping, the top layer and Escape handling without a modal library.
 */
export function Sheet({ open, title, onClose, children }: SheetProps): React.JSX.Element {
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
      onClose={onClose}
      onClick={(event) => {
        // The backdrop is part of the dialog box, so a click outside its
        // content rectangle is a click on the backdrop.
        if (event.target === ref.current) onClose();
      }}
      className="w-full max-w-lg rounded-t-lg border border-linea bg-papel-alto p-0 text-tinta backdrop:bg-tinta/45 mt-auto mb-0 mx-auto sm:my-auto sm:rounded-lg"
    >
      <div className="flex items-center justify-between border-b border-linea px-4 py-3">
        <h2 className="text-lg">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 px-2 text-tinta-suave"
          aria-label="Cerrar"
        >
          ✕
        </button>
      </div>
      <div className="px-4 py-4">{children}</div>
    </dialog>
  );
}
