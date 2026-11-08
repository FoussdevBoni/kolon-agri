import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { buttonClassName } from '../../../core/components/buttonStyles';
import { FormField, inputClassName } from '../../../core/components/FormField';
import { describedBy } from '../../../core/components/formFieldUtils';
import {
  ContactFields,
  SubmissionConfirmation,
  SubmissionError,
} from '../../../core/requests/PublicFormParts';
import type { SubmissionResult } from '../../../core/requests/requestSchema';
import { usePublicSubmission } from '../../../core/requests/usePublicSubmission';
import {
  accompanimentFormSchema,
  type AccompanimentFormValues,
  projectPhaseLabels,
  projectPhases,
  projectTypeLabels,
  projectTypes,
  toAccompanimentPayload,
} from '../schemas/accompanimentSchema';
import { submitAccompaniment } from '../services/accompanimentService';

export function AccompanimentForm() {
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const { mutation, send } = usePublicSubmission(submitAccompaniment);
  const form = useForm<AccompanimentFormValues>({
    resolver: zodResolver(accompanimentFormSchema),
    defaultValues: {
      name: '',
      phone: '',
      location: '',
      email: '',
      description: '',
      needs: '',
      surfaceHectares: '',
      budgetFcfa: '',
    },
  });
  const { errors } = form.formState;

  if (result)
    return <SubmissionConfirmation result={result} title="Demande d’accompagnement envoyée" />;

  const onSubmit = form.handleSubmit((values) =>
    send(toAccompanimentPayload(values), { onSuccess: setResult }),
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
          idPrefix="accompaniment"
          locationLabel="Lieu du projet"
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
        <legend className="text-lg font-bold">Votre projet</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            id="accompaniment-type"
            label="Type de projet"
            error={errors.projectType?.message}
          >
            <select
              id="accompaniment-type"
              className={inputClassName}
              defaultValue=""
              aria-invalid={errors.projectType ? true : undefined}
              {...form.register('projectType')}
            >
              <option value="" disabled>
                Choisir…
              </option>
              {projectTypes.map((type) => (
                <option key={type} value={type}>
                  {projectTypeLabels[type]}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="accompaniment-phase" label="Avancement" error={errors.phase?.message}>
            <select
              id="accompaniment-phase"
              className={inputClassName}
              defaultValue=""
              aria-invalid={errors.phase ? true : undefined}
              {...form.register('phase')}
            >
              <option value="" disabled>
                Choisir…
              </option>
              {projectPhases.map((phase) => (
                <option key={phase} value={phase}>
                  {projectPhaseLabels[phase]}
                </option>
              ))}
            </select>
          </FormField>
        </div>
        <FormField
          id="accompaniment-description"
          label="Description du projet"
          error={errors.description?.message}
        >
          <textarea
            id="accompaniment-description"
            rows={5}
            className={`${inputClassName} py-2`}
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={describedBy('accompaniment-description', errors.description?.message)}
            {...form.register('description')}
          />
        </FormField>
        <FormField
          id="accompaniment-needs"
          label="Vos besoins"
          error={errors.needs?.message}
          hint="Études, financement, intrants, formation…"
        >
          <textarea
            id="accompaniment-needs"
            rows={3}
            className={`${inputClassName} py-2`}
            aria-invalid={errors.needs ? true : undefined}
            {...form.register('needs')}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            id="accompaniment-surface"
            label="Surface en hectares (facultatif)"
            error={errors.surfaceHectares?.message}
          >
            <input
              id="accompaniment-surface"
              inputMode="decimal"
              className={inputClassName}
              {...form.register('surfaceHectares')}
            />
          </FormField>
          <FormField
            id="accompaniment-budget"
            label="Budget global en FCFA (facultatif)"
            error={errors.budgetFcfa?.message}
          >
            <input
              id="accompaniment-budget"
              inputMode="numeric"
              className={inputClassName}
              {...form.register('budgetFcfa')}
            />
          </FormField>
        </div>
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
