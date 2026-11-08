import { useId, type ReactNode } from 'react';
import { Controller, type FieldValues, type Path, type UseFormReturn } from 'react-hook-form';
import { getErrorMessage } from '../../../core/api/apiError';
import { buttonClassName } from '../../../core/components/buttonStyles';
import { FormField, inputClassName } from '../../../core/components/FormField';
import { describedBy } from '../../../core/components/formFieldUtils';
import { MediaField } from '../../media/components/MediaField';
import type { MediaSummary } from '../../media/schemas/mediaSchema';

interface FieldProps<T extends FieldValues> {
  form: UseFormReturn<T>;
  name: Path<T>;
  label: string;
  hint?: string;
}

function errorOf<T extends FieldValues>(form: UseFormReturn<T>, name: Path<T>): string | undefined {
  return form.getFieldState(name, form.formState).error?.message;
}

export function TextInput<T extends FieldValues>({
  form,
  name,
  label,
  hint,
  multiline = false,
}: FieldProps<T> & { multiline?: boolean }) {
  const id = useId();
  const error = errorOf(form, name);
  const common = {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy(id, error, hint),
    ...form.register(name),
  };
  return (
    <FormField id={id} label={label} error={error} hint={hint}>
      {multiline ? (
        <textarea rows={3} className={`${inputClassName} py-2`} {...common} />
      ) : (
        <input className={inputClassName} {...common} />
      )}
    </FormField>
  );
}

/** Paragraphes saisis dans une zone de texte, séparés par une ligne vide. */
export function ParagraphsInput<T extends FieldValues>({ form, name, label }: FieldProps<T>) {
  const id = useId();
  const error = errorOf(form, name) ?? errorOf(form, `${name}.0` as Path<T>);
  const hint = 'Séparez les paragraphes par une ligne vide. Texte brut uniquement.';
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormField id={id} label={label} error={error} hint={hint}>
          <textarea
            id={id}
            rows={6}
            className={`${inputClassName} py-2`}
            aria-describedby={describedBy(id, error, hint)}
            value={Array.isArray(field.value) ? (field.value as string[]).join('\n\n') : ''}
            onBlur={field.onBlur}
            onChange={(event) => field.onChange(event.target.value.split(/\n\s*\n/))}
          />
        </FormField>
      )}
    />
  );
}

/** Lien éditorial ; facultatif : une case active ou retire le lien. */
export function LinkInput<T extends FieldValues>({
  form,
  name,
  label,
  optional = false,
}: FieldProps<T> & { optional?: boolean }) {
  const id = useId();
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => {
        const value = field.value as { label: string; href: string } | null;
        const labelError = errorOf(form, `${name}.label` as Path<T>);
        const hrefError = errorOf(form, `${name}.href` as Path<T>);
        return (
          <fieldset className="space-y-3 rounded-lg border border-forest/10 p-4">
            <legend className="px-1 text-sm font-medium">{label}</legend>
            {optional && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-5 accent-forest"
                  checked={value !== null}
                  onChange={(event) =>
                    field.onChange(event.target.checked ? { label: '', href: '/' } : null)
                  }
                />
                Afficher un bouton
              </label>
            )}
            {value && (
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField id={`${id}-label`} label="Texte du bouton" error={labelError}>
                  <input
                    id={`${id}-label`}
                    className={inputClassName}
                    value={value.label}
                    onChange={(event) => field.onChange({ ...value, label: event.target.value })}
                  />
                </FormField>
                <FormField
                  id={`${id}-href`}
                  label="Destination"
                  error={hrefError}
                  hint="/catalogue, /contact ou https://…"
                >
                  <input
                    id={`${id}-href`}
                    className={inputClassName}
                    value={value.href}
                    onChange={(event) => field.onChange({ ...value, href: event.target.value })}
                  />
                </FormField>
              </div>
            )}
          </fieldset>
        );
      }}
    />
  );
}

export function ImageInput<T extends FieldValues>({
  form,
  name,
  label,
  media,
  required = false,
}: FieldProps<T> & { media: Record<string, MediaSummary>; required?: boolean }) {
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => {
        const value = typeof field.value === 'string' && field.value ? field.value : null;
        return (
          <MediaField
            label={label}
            value={value}
            onChange={(mediaId) => field.onChange(mediaId ?? (required ? '' : null))}
            preview={value ? media[value] : undefined}
            required={required}
            error={errorOf(form, name)}
          />
        );
      }}
    />
  );
}

interface ShellProps {
  onSubmit: () => void;
  onCancel: () => void;
  pending: boolean;
  error: unknown;
  onReload?: () => void;
  children: ReactNode;
}

/** Cadre commun d'un formulaire de section : erreurs (dont conflit 409) et actions. */
export function SectionFormShell({
  onSubmit,
  onCancel,
  pending,
  error,
  onReload,
  children,
}: ShellProps) {
  const conflict = error instanceof Error && 'code' in error && error.code === 'VERSION_CONFLICT';
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="space-y-4"
    >
      {error !== null && error !== undefined && (
        <div role="alert" className="space-y-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          <p>{getErrorMessage(error)}</p>
          {conflict && onReload && (
            <button type="button" onClick={onReload} className={buttonClassName('secondary')}>
              Recharger la dernière version
            </button>
          )}
        </div>
      )}
      {children}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className={buttonClassName('secondary')}
        >
          Annuler
        </button>
        <button type="submit" disabled={pending} className={buttonClassName('primary')}>
          {pending ? 'Enregistrement…' : 'Enregistrer la section'}
        </button>
      </div>
    </form>
  );
}
