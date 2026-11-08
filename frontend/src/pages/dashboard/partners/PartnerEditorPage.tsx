import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import { getErrorMessage } from '../../../core/api/apiError';
import { buttonClassName } from '../../../core/components/buttonStyles';
import { ConfirmDialog } from '../../../core/components/ConfirmDialog';
import { ErrorState } from '../../../core/components/ErrorState';
import { FormField, inputClassName } from '../../../core/components/FormField';
import { describedBy } from '../../../core/components/formFieldUtils';
import { LoadingState } from '../../../core/components/LoadingState';
import { UnsavedChangesGuard } from '../../../core/forms/UnsavedChangesGuard';
import { usePartner, usePartnerMutations } from '../../../modules/partners/hooks/usePartners';
import {
  emptyPartnerForm,
  type Partner,
  partnerCategories,
  partnerCategoryLabels,
  partnerFormSchema,
  type PartnerFormValues,
  partnerToForm,
} from '../../../modules/partners/schemas/partnerSchema';

const card = 'space-y-4 rounded-xl border border-forest/10 bg-white p-5 sm:p-6';

function PartnerEditor({ partner }: { partner: Partner | null }) {
  const navigate = useNavigate();
  const { create, update, setStatus, archive } = usePartnerMutations();
  const [confirmArchive, setConfirmArchive] = useState(false);
  const mutation = partner ? update : create;
  const form = useForm<PartnerFormValues>({
    resolver: zodResolver(partnerFormSchema),
    defaultValues: partner ? partnerToForm(partner) : emptyPartnerForm(),
  });
  const { errors, isDirty } = form.formState;
  const lifecycleError = setStatus.error ?? archive.error;

  const onSubmit = form.handleSubmit((values) => {
    if (partner) {
      update.mutate(
        { id: partner.id, values },
        { onSuccess: (saved) => form.reset(partnerToForm(saved)) },
      );
    } else {
      create.mutate(values, {
        onSuccess: (saved) => {
          form.reset(partnerToForm(saved));
          void navigate(`../${saved.id}`, {
            relative: 'path',
            replace: true,
            state: { afterSave: true },
          });
        },
      });
    }
  });

  const text = (name: keyof PartnerFormValues, label: string, hint?: string, multiline = false) => {
    const id = `partner-${name}`;
    const error = errors[name]?.message;
    const common = {
      id,
      'aria-invalid': error ? true : undefined,
      'aria-describedby': describedBy(id, error, hint),
      ...form.register(name),
    };
    return (
      <FormField id={id} label={label} error={error} hint={hint}>
        {multiline ? (
          <textarea rows={4} className={`${inputClassName} py-2`} {...common} />
        ) : (
          <input className={inputClassName} {...common} />
        )}
      </FormField>
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <UnsavedChangesGuard when={isDirty && !mutation.isPending} />
      <Link
        to=".."
        relative="path"
        className="inline-flex items-center gap-2 text-sm font-semibold text-forest"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Partenaires
      </Link>
      <h1 className="text-2xl font-extrabold text-forest">
        {partner ? partner.name : 'Nouveau partenaire'}
      </h1>
      {mutation.isError && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {getErrorMessage(mutation.error)}
        </p>
      )}
      <form onSubmit={(event) => void onSubmit(event)} noValidate className="space-y-6">
        <section className={card}>
          <h2 className="text-lg font-bold">Activité</h2>
          {text('name', 'Nom')}
          <FormField id="partner-category" label="Catégorie">
            <select id="partner-category" className={inputClassName} {...form.register('category')}>
              {partnerCategories.map((category) => (
                <option key={category} value={category}>
                  {partnerCategoryLabels[category]}
                </option>
              ))}
            </select>
          </FormField>
          {text('description', 'Description de l’activité', undefined, true)}
          {text('regions', 'Régions couvertes', 'Séparées par des virgules : Ségou, Mopti…')}
        </section>
        <section className={card}>
          <h2 className="text-lg font-bold">Coordonnées confidentielles</h2>
          <p className="text-sm text-charcoal/70">Jamais affichées sur le site public.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {text('contactName', 'Personne de contact')}
            {text('phone', 'Téléphone')}
            {text('email', 'Email')}
            {text('address', 'Adresse')}
          </div>
          {text('internalNotes', 'Notes internes', undefined, true)}
        </section>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={mutation.isPending || (partner !== null && !isDirty)}
            className={buttonClassName('primary')}
          >
            {mutation.isPending ? 'Enregistrement…' : partner ? 'Enregistrer' : 'Créer la fiche'}
          </button>
        </div>
      </form>
      {partner && (
        <section className={card}>
          <h2 className="text-lg font-bold">Disponibilité</h2>
          <p className="text-sm text-charcoal/70">
            Un partenaire inactif ou archivé ne peut plus être associé à une demande ; ses
            associations existantes sont conservées.
          </p>
          {lifecycleError && (
            <p role="alert" className="text-sm text-red-700">
              {getErrorMessage(lifecycleError)}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {!partner.archivedAt && (
              <button
                type="button"
                disabled={setStatus.isPending}
                onClick={() =>
                  setStatus.mutate({
                    id: partner.id,
                    status: partner.status === 'active' ? 'inactive' : 'active',
                  })
                }
                className={buttonClassName('secondary')}
              >
                {partner.status === 'active' ? 'Désactiver' : 'Réactiver'}
              </button>
            )}
            {partner.archivedAt ? (
              <p className="text-sm text-charcoal/70">Fiche archivée.</p>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmArchive(true)}
                className={buttonClassName('ghost', 'text-red-700 hover:bg-red-50')}
              >
                Archiver
              </button>
            )}
          </div>
          <ConfirmDialog
            open={confirmArchive}
            title="Archiver la fiche"
            description="La fiche sera retirée de l’annuaire actif et ne pourra plus être associée à une demande."
            confirmLabel="Archiver"
            tone="danger"
            pending={archive.isPending}
            onCancel={() => setConfirmArchive(false)}
            onConfirm={() =>
              archive.mutate(partner.id, { onSettled: () => setConfirmArchive(false) })
            }
          />
        </section>
      )}
    </div>
  );
}

export function PartnerEditorPage() {
  const { id } = useParams();
  const partner = usePartner(id);
  if (!id) return <PartnerEditor partner={null} />;
  if (partner.isPending) return <LoadingState label="Chargement du partenaire…" />;
  if (partner.isError)
    return (
      <ErrorState message={getErrorMessage(partner.error)} onRetry={() => void partner.refetch()} />
    );
  return <PartnerEditor key={partner.data.id} partner={partner.data} />;
}
