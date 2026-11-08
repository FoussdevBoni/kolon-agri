import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import { getErrorMessage } from '../../../core/api/apiError';
import { buttonClassName } from '../../../core/components/buttonStyles';
import { ErrorState } from '../../../core/components/ErrorState';
import { FormField, inputClassName } from '../../../core/components/FormField';
import { describedBy } from '../../../core/components/formFieldUtils';
import { LoadingState } from '../../../core/components/LoadingState';
import { UnsavedChangesGuard } from '../../../core/forms/UnsavedChangesGuard';
import { MediaField } from '../../../modules/media/components/MediaField';
import { StatusBadge } from '../../../modules/products/components/ProductStatusBadge';
import { useAdminService, useServiceMutations } from '../../../modules/services/hooks/useServices';
import {
  type AdminService,
  emptyServiceForm,
  serviceFormSchema,
  type ServiceFormValues,
  serviceToForm,
} from '../../../modules/services/schemas/serviceSchema';

const card = 'space-y-4 rounded-xl border border-forest/10 bg-white p-5 sm:p-6';

function ServiceEditor({ service }: { service: AdminService | null }) {
  const navigate = useNavigate();
  const { create, update, setPublication } = useServiceMutations();
  const mutation = service ? update : create;
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: service ? serviceToForm(service) : emptyServiceForm(),
  });
  const { errors, isDirty } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    if (service) {
      update.mutate(
        { id: service.id, values },
        { onSuccess: (saved) => form.reset(serviceToForm(saved)) },
      );
    } else {
      create.mutate(values, {
        onSuccess: (saved) => {
          form.reset(serviceToForm(saved));
          void navigate(`../${saved.id}`, {
            relative: 'path',
            replace: true,
            state: { afterSave: true },
          });
        },
      });
    }
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <UnsavedChangesGuard when={isDirty && !mutation.isPending} />
      <Link
        to=".."
        relative="path"
        className="inline-flex items-center gap-2 text-sm font-semibold text-forest"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Services
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold text-forest">
          {service ? service.title : 'Nouveau service'}
        </h1>
        {service && <StatusBadge status={service.status} />}
      </div>
      {(mutation.isError || setPublication.isError) && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {getErrorMessage(mutation.error ?? setPublication.error)}
        </p>
      )}
      <form onSubmit={(event) => void onSubmit(event)} noValidate className="space-y-6">
        <section className={card}>
          <FormField id="service-title" label="Titre" error={errors.title?.message}>
            <input
              id="service-title"
              className={inputClassName}
              aria-describedby={describedBy('service-title', errors.title?.message)}
              {...form.register('title')}
            />
          </FormField>
          <FormField
            id="service-slug"
            label="Adresse (slug)"
            error={errors.slug?.message}
            hint="Vide : générée depuis le titre."
          >
            <input id="service-slug" className={inputClassName} {...form.register('slug')} />
          </FormField>
          <FormField id="service-summary" label="Résumé" error={errors.summary?.message}>
            <textarea
              id="service-summary"
              rows={2}
              className={`${inputClassName} py-2`}
              {...form.register('summary')}
            />
          </FormField>
          <FormField
            id="service-body"
            label="Description"
            error={errors.body?.message}
            hint="Séparez les paragraphes par une ligne vide. Texte brut uniquement."
          >
            <textarea
              id="service-body"
              rows={8}
              className={`${inputClassName} py-2`}
              {...form.register('body')}
            />
          </FormField>
          <Controller
            control={form.control}
            name="imageId"
            render={({ field }) => (
              <MediaField
                label="Image"
                value={field.value}
                onChange={field.onChange}
                preview={service?.image ?? undefined}
              />
            )}
          />
        </section>
        <section className={card}>
          <h2 className="text-lg font-bold">Référencement</h2>
          <FormField id="service-seo-title" label="Titre SEO" error={errors.seoTitle?.message}>
            <input
              id="service-seo-title"
              className={inputClassName}
              {...form.register('seoTitle')}
            />
          </FormField>
          <FormField
            id="service-seo-description"
            label="Description SEO"
            error={errors.seoDescription?.message}
          >
            <textarea
              id="service-seo-description"
              rows={2}
              className={`${inputClassName} py-2`}
              {...form.register('seoDescription')}
            />
          </FormField>
        </section>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {service && (
            <button
              type="button"
              disabled={isDirty || setPublication.isPending}
              title={isDirty ? 'Enregistrez avant de changer le statut.' : undefined}
              onClick={() =>
                setPublication.mutate({ id: service.id, published: service.status !== 'published' })
              }
              className={buttonClassName('secondary')}
            >
              {service.status === 'published' ? 'Dépublier' : 'Publier'}
            </button>
          )}
          <button
            type="submit"
            disabled={mutation.isPending || (service !== null && !isDirty)}
            className={buttonClassName('primary')}
          >
            {mutation.isPending ? 'Enregistrement…' : service ? 'Enregistrer' : 'Créer le service'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ServiceEditorPage() {
  const { id } = useParams();
  const service = useAdminService(id);
  if (!id) return <ServiceEditor service={null} />;
  if (service.isPending) return <LoadingState label="Chargement du service…" />;
  if (service.isError)
    return (
      <ErrorState message={getErrorMessage(service.error)} onRetry={() => void service.refetch()} />
    );
  return <ServiceEditor key={service.data.id} service={service.data} />;
}
