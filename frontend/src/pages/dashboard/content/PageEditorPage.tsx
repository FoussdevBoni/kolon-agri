import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDown, ArrowLeft, ArrowUp, Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router';
import { getErrorMessage } from '../../../core/api/apiError';
import { buttonClassName } from '../../../core/components/buttonStyles';
import { ConfirmDialog } from '../../../core/components/ConfirmDialog';
import { ErrorState } from '../../../core/components/ErrorState';
import { FormField, inputClassName } from '../../../core/components/FormField';
import { LoadingState } from '../../../core/components/LoadingState';
import { UnsavedChangesGuard } from '../../../core/forms/UnsavedChangesGuard';
import { formatDateTime } from '../../../core/utils/formatDate';
import { MediaField } from '../../../modules/media/components/MediaField';
import { SectionForm } from '../../../modules/pages/components/SectionForms';
import { usePageDraft, usePageMutations } from '../../../modules/pages/hooks/usePages';
import {
  type DraftSection,
  type PageDraft,
  pageSeoFormSchema,
  type PageSeoFormValues,
} from '../../../modules/pages/schemas/pageSchema';
import { type SectionType, sectionTypeLabels } from '../../../modules/pages/schemas/sectionSchema';
import { StatusBadge } from '../../../modules/products/components/ProductStatusBadge';

const card = 'space-y-4 rounded-xl border border-forest/10 bg-white p-5 sm:p-6';
const singletonTypes = new Set<SectionType>(['hero', 'contactInfo', 'siteIdentity']);

function sectionSummary(section: DraftSection): string {
  const title = section.data['title'] ?? section.data['name'];
  return typeof title === 'string' && title ? title : sectionTypeLabels[section.type];
}

function SeoForm({ page }: { page: PageDraft }) {
  const { updateSeo, refresh } = usePageMutations(page.id);
  const form = useForm<PageSeoFormValues>({
    resolver: zodResolver(pageSeoFormSchema),
    defaultValues: page.draft.seo,
  });
  const { errors, isDirty } = form.formState;
  const onSubmit = form.handleSubmit((seo) =>
    updateSeo.mutate(
      { expectedRevision: page.draft.revision, seo },
      { onSuccess: (draft) => form.reset(draft.draft.seo) },
    ),
  );
  return (
    <section aria-labelledby="seo-title" className={card}>
      <UnsavedChangesGuard when={isDirty && !updateSeo.isPending} />
      <h2 id="seo-title" className="text-lg font-bold">
        Référencement
      </h2>
      {updateSeo.isError && (
        <div role="alert" className="space-y-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          <p>{getErrorMessage(updateSeo.error)}</p>
          <button
            type="button"
            onClick={() => void refresh()}
            className={buttonClassName('secondary')}
          >
            Recharger
          </button>
        </div>
      )}
      <form onSubmit={(event) => void onSubmit(event)} noValidate className="space-y-4">
        <FormField
          id="page-seo-title"
          label="Titre de la page"
          error={errors.title?.message}
          hint="Affiché dans l’onglet et les moteurs de recherche."
        >
          <input id="page-seo-title" className={inputClassName} {...form.register('title')} />
        </FormField>
        <FormField
          id="page-seo-description"
          label="Description"
          error={errors.description?.message}
        >
          <textarea
            id="page-seo-description"
            rows={2}
            className={`${inputClassName} py-2`}
            {...form.register('description')}
          />
        </FormField>
        <Controller
          control={form.control}
          name="imageId"
          render={({ field }) => (
            <MediaField
              label="Image de partage"
              value={field.value}
              onChange={field.onChange}
              preview={field.value ? page.media[field.value] : undefined}
            />
          )}
        />
        <button
          type="submit"
          disabled={!isDirty || updateSeo.isPending}
          className={buttonClassName('primary')}
        >
          Enregistrer le référencement
        </button>
      </form>
    </section>
  );
}

function PublicationPanel({ page }: { page: PageDraft }) {
  const { publish, unpublish, restore } = usePageMutations(page.id);
  const [confirm, setConfirm] = useState<'unpublish' | number | null>(null);
  const error = publish.error ?? unpublish.error ?? restore.error;
  return (
    <section aria-labelledby="publication-title" className={card}>
      <div className="flex items-center justify-between gap-3">
        <h2 id="publication-title" className="text-lg font-bold">
          Publication
        </h2>
        <StatusBadge
          status={page.status}
          label={page.status === 'published' ? 'Publiée' : 'Non publiée'}
        />
      </div>
      <p className="text-sm text-charcoal/70">
        {page.hasUnpublishedChanges
          ? 'Le brouillon contient des modifications non visibles sur le site.'
          : 'Le site affiche la dernière version du brouillon.'}
      </p>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {getErrorMessage(error)}
        </p>
      )}
      <div className="flex flex-col gap-2">
        <Link to="preview" className={buttonClassName('secondary')}>
          <Eye aria-hidden="true" className="size-4" />
          Prévisualiser le brouillon
        </Link>
        <button
          type="button"
          disabled={!page.hasUnpublishedChanges || publish.isPending}
          onClick={() => publish.mutate(page.draft.revision)}
          className={buttonClassName('primary')}
        >
          {publish.isPending ? 'Publication…' : 'Publier le brouillon'}
        </button>
        {page.status === 'published' && (
          <button
            type="button"
            onClick={() => setConfirm('unpublish')}
            className={buttonClassName('ghost', 'text-red-700 hover:bg-red-50')}
          >
            Dépublier
          </button>
        )}
      </div>
      {page.versions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold">Versions publiées</h3>
          <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto text-sm">
            {page.versions.map((version) => (
              <li key={version.number} className="flex items-center justify-between gap-2">
                <span>
                  Version {version.number} · {formatDateTime(version.publishedAt)}
                </span>
                <button
                  type="button"
                  onClick={() => setConfirm(version.number)}
                  className="font-semibold text-forest hover:underline"
                >
                  Restaurer
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <ConfirmDialog
        open={confirm === 'unpublish'}
        title="Dépublier la page"
        description="La page ne sera plus visible sur le site. Le brouillon est conservé."
        confirmLabel="Dépublier"
        tone="danger"
        pending={unpublish.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => unpublish.mutate(undefined, { onSettled: () => setConfirm(null) })}
      />
      <ConfirmDialog
        open={typeof confirm === 'number'}
        title="Restaurer une version"
        description="Le brouillon actuel sera remplacé par cette version. Le site n’est pas modifié avant publication."
        confirmLabel="Restaurer dans le brouillon"
        pending={restore.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (typeof confirm === 'number') {
            restore.mutate(
              { number: confirm, expectedRevision: page.draft.revision },
              { onSettled: () => setConfirm(null) },
            );
          }
        }}
      />
    </section>
  );
}

function SectionsEditor({ page }: { page: PageDraft }) {
  const mutations = usePageMutations(page.id);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState<SectionType | null>(null);
  const [newType, setNewType] = useState<SectionType | ''>('');
  const [toDelete, setToDelete] = useState<DraftSection | null>(null);
  const sections = page.draft.sections;
  const availableTypes = page.allowedSectionTypes.filter(
    (type) => !singletonTypes.has(type) || !sections.some((section) => section.type === type),
  );
  const structureError = mutations.reorder.error ?? mutations.deleteSection.error;

  const move = (index: number, direction: -1 | 1) => {
    const ids = sections.map((section) => section.id);
    const current = ids[index];
    const other = ids[index + direction];
    if (current === undefined || other === undefined) return;
    ids[index] = other;
    ids[index + direction] = current;
    mutations.reorder.mutate({ expectedRevision: page.draft.revision, sectionIds: ids });
  };

  return (
    <section aria-labelledby="sections-title" className={card}>
      <h2 id="sections-title" className="text-lg font-bold">
        Sections
      </h2>
      {structureError && (
        <div role="alert" className="space-y-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          <p>{getErrorMessage(structureError)}</p>
          <button
            type="button"
            onClick={() => void mutations.refresh()}
            className={buttonClassName('secondary')}
          >
            Recharger
          </button>
        </div>
      )}
      {sections.length === 0 && (
        <p className="text-sm text-charcoal/60">Cette page ne contient encore aucune section.</p>
      )}
      <ol className="space-y-3">
        {sections.map((section, index) => (
          <li key={section.id} className="rounded-lg border border-forest/10">
            <div className="flex flex-wrap items-center gap-2 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold tracking-wide text-leaf uppercase">
                  {sectionTypeLabels[section.type]}
                </p>
                <p className="truncate font-medium">{sectionSummary(section)}</p>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={index === 0 || mutations.reorder.isPending}
                  onClick={() => move(index, -1)}
                  aria-label="Monter la section"
                  className={buttonClassName('ghost', 'px-2')}
                >
                  <ArrowUp aria-hidden="true" className="size-4" />
                </button>
                <button
                  type="button"
                  disabled={index === sections.length - 1 || mutations.reorder.isPending}
                  onClick={() => move(index, 1)}
                  aria-label="Descendre la section"
                  className={buttonClassName('ghost', 'px-2')}
                >
                  <ArrowDown aria-hidden="true" className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(editing === section.id ? null : section.id)}
                  aria-expanded={editing === section.id}
                  aria-label="Modifier la section"
                  className={buttonClassName('ghost', 'px-2')}
                >
                  <Pencil aria-hidden="true" className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setToDelete(section)}
                  aria-label="Supprimer la section"
                  className={buttonClassName('ghost', 'px-2 text-red-700')}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </div>
            </div>
            {editing === section.id && (
              <div className="border-t border-forest/10 p-4">
                <SectionForm
                  type={section.type}
                  data={section.data}
                  media={page.media}
                  pending={mutations.updateSection.isPending}
                  error={mutations.updateSection.error}
                  onReload={() => {
                    mutations.updateSection.reset();
                    void mutations.refresh();
                  }}
                  onCancel={() => {
                    mutations.updateSection.reset();
                    setEditing(null);
                  }}
                  onSave={(data) =>
                    mutations.updateSection.mutate(
                      { sectionId: section.id, expectedVersion: section.version, data },
                      { onSuccess: () => setEditing(null) },
                    )
                  }
                />
              </div>
            )}
          </li>
        ))}
      </ol>

      {adding ? (
        <div className="rounded-lg border border-leaf/30 bg-leaf/5 p-4">
          <h3 className="mb-3 font-semibold">Nouvelle section : {sectionTypeLabels[adding]}</h3>
          <SectionForm
            type={adding}
            media={page.media}
            pending={mutations.addSection.isPending}
            error={mutations.addSection.error}
            onReload={() => void mutations.refresh()}
            onCancel={() => {
              mutations.addSection.reset();
              setAdding(null);
            }}
            onSave={(data) =>
              mutations.addSection.mutate(
                { expectedRevision: page.draft.revision, type: adding, data },
                { onSuccess: () => setAdding(null) },
              )
            }
          />
        </div>
      ) : (
        availableTypes.length > 0 && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <FormField id="new-section-type" label="Ajouter une section">
              <select
                id="new-section-type"
                value={newType}
                onChange={(event) => setNewType(event.target.value as SectionType | '')}
                className={`${inputClassName} sm:w-64`}
              >
                <option value="">Choisir un type…</option>
                {availableTypes.map((type) => (
                  <option key={type} value={type}>
                    {sectionTypeLabels[type]}
                  </option>
                ))}
              </select>
            </FormField>
            <button
              type="button"
              disabled={!newType}
              onClick={() => {
                if (newType) setAdding(newType);
                setNewType('');
              }}
              className={buttonClassName('secondary')}
            >
              <Plus aria-hidden="true" className="size-4" />
              Ajouter
            </button>
          </div>
        )
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer la section"
        description="La section sera retirée du brouillon. Le site n’est modifié qu’à la prochaine publication."
        confirmLabel="Supprimer"
        tone="danger"
        pending={mutations.deleteSection.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) {
            mutations.deleteSection.mutate(
              { sectionId: toDelete.id, expectedRevision: page.draft.revision },
              { onSettled: () => setToDelete(null) },
            );
          }
        }}
      />
    </section>
  );
}

export function PageEditorPage() {
  const { id = '' } = useParams();
  const page = usePageDraft(id);
  if (page.isPending) return <LoadingState label="Chargement de la page…" />;
  if (page.isError)
    return <ErrorState message={getErrorMessage(page.error)} onRetry={() => void page.refetch()} />;
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        to=".."
        relative="path"
        className="inline-flex items-center gap-2 text-sm font-semibold text-forest"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Pages
      </Link>
      <div>
        <h1 className="text-2xl font-extrabold text-forest">{page.data.title}</h1>
        <p className="mt-1 text-sm text-charcoal/60">
          {page.data.path ?? 'Informations communes à tout le site'}
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <SectionsEditor page={page.data} />
          {page.data.path && <SeoForm key={page.data.draft.revision} page={page.data} />}
        </div>
        <div className="lg:sticky lg:top-20 lg:self-start">
          <PublicationPanel page={page.data} />
        </div>
      </div>
    </div>
  );
}
