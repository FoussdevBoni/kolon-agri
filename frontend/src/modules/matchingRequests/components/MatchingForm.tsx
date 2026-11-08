import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { buttonClassName } from '../../../core/components/buttonStyles';
import { FormField, inputClassName } from '../../../core/components/FormField';
import {
  ContactFields,
  SubmissionConfirmation,
  SubmissionError,
} from '../../../core/requests/PublicFormParts';
import type { SubmissionResult } from '../../../core/requests/requestSchema';
import { usePublicSubmission } from '../../../core/requests/usePublicSubmission';
import { partnerCategories, partnerCategoryLabels } from '../../partners/schemas/partnerSchema';
import {
  matchingFormSchema,
  type MatchingFormValues,
  toMatchingPayload,
} from '../schemas/matchingSchema';
import { submitMatching } from '../services/matchingService';

/** Le visiteur exprime son besoin ; l'annuaire des partenaires reste privé. */
export function MatchingForm() {
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const { mutation, send } = usePublicSubmission(submitMatching);
  const form = useForm<MatchingFormValues>({
    resolver: zodResolver(matchingFormSchema),
    defaultValues: { name: '', phone: '', location: '', email: '', description: '', timeframe: '' },
  });
  const { errors } = form.formState;

  if (result)
    return <SubmissionConfirmation result={result} title="Demande de mise en relation envoyée" />;

  const onSubmit = form.handleSubmit((values) =>
    send(toMatchingPayload(values), { onSuccess: setResult }),
  );

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      noValidate
      className="space-y-6 rounded-2xl border border-forest/10 bg-white p-5 sm:p-8"
    >
      <fieldset className="space-y-4">
        <legend className="text-lg font-bold">Vos coordonnées</legend>
        <ContactFields
          idPrefix="matching"
          register={{
            name: form.register('name'),
            phone: form.register('phone'),
            location: form.register('location'),
            email: form.register('email'),
          }}
          errors={{
            name: errors.name?.message,
            phone: errors.phone?.message,
            location: errors.location?.message,
            email: errors.email?.message,
          }}
        />
      </fieldset>
      <fieldset className="space-y-4">
        <legend className="text-lg font-bold">Votre besoin</legend>
        <FormField
          id="matching-category"
          label="Type de partenaire recherché"
          error={errors.needCategory?.message}
        >
          <select
            id="matching-category"
            className={inputClassName}
            defaultValue=""
            aria-invalid={errors.needCategory ? true : undefined}
            {...form.register('needCategory')}
          >
            <option value="" disabled>
              Choisir…
            </option>
            {partnerCategories.map((category) => (
              <option key={category} value={category}>
                {partnerCategoryLabels[category]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField
          id="matching-description"
          label="Description du besoin"
          error={errors.description?.message}
          hint="Produits, quantités, zone, conditions souhaitées…"
        >
          <textarea
            id="matching-description"
            rows={5}
            className={`${inputClassName} py-2`}
            aria-invalid={errors.description ? true : undefined}
            {...form.register('description')}
          />
        </FormField>
        <FormField
          id="matching-timeframe"
          label="Échéance souhaitée (facultatif)"
          error={errors.timeframe?.message}
        >
          <input
            id="matching-timeframe"
            className={inputClassName}
            placeholder="Avant la prochaine campagne"
            {...form.register('timeframe')}
          />
        </FormField>
      </fieldset>
      {mutation.isError && <SubmissionError error={mutation.error} />}
      <button
        type="submit"
        disabled={mutation.isPending}
        className={buttonClassName('primary', 'w-full sm:w-auto')}
      >
        {mutation.isPending ? 'Envoi en cours…' : 'Envoyer ma demande'}
      </button>
    </form>
  );
}
