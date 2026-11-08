import { CircleCheck } from 'lucide-react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { ApiError, getErrorMessage } from '../api/apiError';
import { FormField, inputClassName } from '../components/FormField';
import { describedBy } from '../components/formFieldUtils';
import { formatDateTime } from '../utils/formatDate';
import type { SubmissionResult } from './requestSchema';

type ContactKey = 'name' | 'phone' | 'location' | 'email';

interface ContactFieldsProps {
  idPrefix: string;
  register: Record<ContactKey, UseFormRegisterReturn>;
  errors: Partial<Record<ContactKey, string | undefined>>;
  locationLabel?: string;
}

const contactLabels: Record<ContactKey, string> = {
  name: 'Nom et prénom',
  phone: 'Téléphone',
  location: 'Localité',
  email: 'Email (facultatif)',
};

/** Coordonnées communes aux trois formulaires publics. */
export function ContactFields({ idPrefix, register, errors, locationLabel }: ContactFieldsProps) {
  const field = (key: ContactKey, type: string, autoComplete: string) => {
    const id = `${idPrefix}-${key}`;
    const error = errors[key];
    return (
      <FormField
        id={id}
        label={key === 'location' && locationLabel ? locationLabel : contactLabels[key]}
        error={error}
      >
        <input
          id={id}
          type={type}
          autoComplete={autoComplete}
          className={inputClassName}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error)}
          {...register[key]}
        />
      </FormField>
    );
  };
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {field('name', 'text', 'name')}
      {field('phone', 'tel', 'tel')}
      {field('location', 'text', 'address-level2')}
      {field('email', 'email', 'email')}
    </div>
  );
}

/** Message d'échec d'envoi : saisies conservées, nouvel essai possible avec la même clé. */
export function SubmissionError({ error }: { error: unknown }) {
  const network = error instanceof ApiError && error.isNetworkError;
  return (
    <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
      <p>{getErrorMessage(error)}</p>
      {network && (
        <p className="mt-1">
          Vos informations sont conservées : vous pouvez renvoyer le formulaire.
        </p>
      )}
    </div>
  );
}

export function SubmissionConfirmation({
  result,
  title,
  followUp = 'Nous vous recontactons au numéro indiqué.',
  children,
}: {
  result: SubmissionResult;
  title: string;
  followUp?: string;
  children?: React.ReactNode;
}) {
  return (
    <div role="status" className="rounded-2xl border border-leaf/30 bg-leaf/5 p-6 sm:p-8">
      <CircleCheck aria-hidden="true" className="size-10 text-leaf" />
      <h2 className="mt-4 text-2xl font-bold text-forest">{title}</h2>
      <p className="mt-2 text-charcoal/80">
        Votre référence : <strong className="font-mono">{result.reference}</strong> (envoyée le{' '}
        {formatDateTime(result.createdAt)}). Conservez-la pour tout échange avec notre équipe.
      </p>
      <p className="mt-2 text-sm text-charcoal/70">{followUp}</p>
      {children}
    </div>
  );
}
