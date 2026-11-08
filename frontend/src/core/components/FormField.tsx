import type { ReactNode } from 'react';

export const inputClassName =
  'block min-h-11 w-full rounded-lg border border-forest/20 bg-white px-3 text-base text-charcoal placeholder:text-charcoal/40 focus:border-forest aria-invalid:border-red-600 sm:text-sm';

interface FormFieldProps {
  id: string;
  label: string;
  error?: string | undefined;
  hint?: string;
  children: ReactNode;
}

/** Libellé, aide et message d'erreur reliés au champ (aria-describedby à poser sur le champ). */
export function FormField({ id, label, error, hint, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-charcoal/60">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
