import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { buttonClassName } from '../../../core/components/buttonStyles';
import { FormField, inputClassName } from '../../../core/components/FormField';
import { describedBy } from '../../../core/components/formFieldUtils';
import { SubmissionConfirmation, SubmissionError } from '../../../core/requests/PublicFormParts';
import type { SubmissionResult } from '../../../core/requests/requestSchema';
import { usePublicSubmission } from '../../../core/requests/usePublicSubmission';
import {
  contactFormSchema,
  type ContactFormValues,
  toContactPayload,
} from '../schemas/contactMessageSchema';
import { submitContactMessage } from '../services/contactMessageService';

export function ContactForm() {
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const { mutation, send } = usePublicSubmission(submitContactMessage);
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: { name: '', phone: '', email: '', subject: '', message: '' },
  });
  const { errors } = form.formState;

  if (result) {
    return (
      <SubmissionConfirmation
        result={result}
        title="Message envoyé"
        followUp="Nous vous répondons au téléphone ou à l’adresse indiqués."
      />
    );
  }

  const onSubmit = form.handleSubmit((values) =>
    send(toContactPayload(values), { onSuccess: setResult }),
  );

  const textField = (
    name: 'name' | 'phone' | 'email' | 'subject',
    label: string,
    type: string,
    autoComplete: string,
    hint?: string,
  ) => {
    const id = `contact-${name}`;
    const error = errors[name]?.message;
    return (
      <FormField id={id} label={label} error={error} hint={hint}>
        <input
          id={id}
          type={type}
          autoComplete={autoComplete}
          className={inputClassName}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          {...form.register(name)}
        />
      </FormField>
    );
  };

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      noValidate
      className="space-y-6 rounded-2xl border border-forest/10 bg-white p-5 sm:p-8"
    >
      <fieldset className="space-y-4">
        <legend className="text-lg font-bold">Vos coordonnées</legend>
        {textField('name', 'Nom et prénom', 'text', 'name')}
        <div className="grid gap-4 sm:grid-cols-2">
          {textField(
            'phone',
            'Téléphone',
            'tel',
            'tel',
            'Téléphone ou email : au moins l’un des deux.',
          )}
          {textField('email', 'Email', 'email', 'email')}
        </div>
      </fieldset>
      <fieldset className="space-y-4">
        <legend className="text-lg font-bold">Votre message</legend>
        {textField('subject', 'Objet', 'text', 'off')}
        <FormField id="contact-message" label="Message" error={errors.message?.message}>
          <textarea
            id="contact-message"
            rows={6}
            maxLength={5000}
            className={`${inputClassName} py-2`}
            aria-invalid={errors.message ? true : undefined}
            aria-describedby={describedBy('contact-message', errors.message?.message)}
            {...form.register('message')}
          />
        </FormField>
      </fieldset>
      {mutation.isError && <SubmissionError error={mutation.error} />}
      <button
        type="submit"
        disabled={mutation.isPending}
        className={buttonClassName('primary', 'w-full sm:w-auto')}
      >
        {mutation.isPending ? 'Envoi en cours…' : 'Envoyer mon message'}
      </button>
    </form>
  );
}
