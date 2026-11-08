import { useEffect, useId, useRef } from 'react';
import { buttonClassName } from './buttonStyles';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Boîte de confirmation modale (élément <dialog> natif : focus piégé, Échap pour annuler). */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Annuler',
  tone = 'default',
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onCancel();
      }}
      className="w-[calc(100%-2rem)] max-w-md rounded-2xl bg-white p-6 text-charcoal shadow-xl backdrop:bg-charcoal/40"
    >
      <h2 id={titleId} className="text-lg font-bold">
        {title}
      </h2>
      <p id={descriptionId} className="mt-2 text-sm text-charcoal/75">
        {description}
      </p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className={buttonClassName('secondary')}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className={buttonClassName(
            'primary',
            tone === 'danger' ? 'bg-red-700 hover:bg-red-800' : undefined,
          )}
        >
          {pending ? 'Traitement…' : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
