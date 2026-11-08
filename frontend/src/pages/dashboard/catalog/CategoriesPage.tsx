import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDown, ArrowUp, Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { getErrorMessage } from '../../../core/api/apiError';
import { buttonClassName } from '../../../core/components/buttonStyles';
import { ConfirmDialog } from '../../../core/components/ConfirmDialog';
import { EmptyState } from '../../../core/components/EmptyState';
import { ErrorState } from '../../../core/components/ErrorState';
import { FormField, inputClassName } from '../../../core/components/FormField';
import { describedBy } from '../../../core/components/formFieldUtils';
import { LoadingState } from '../../../core/components/LoadingState';
import { UnsavedChangesGuard } from '../../../core/forms/UnsavedChangesGuard';
import {
  useAdminCategories,
  useCategoryMutations,
} from '../../../modules/categories/hooks/useCategories';
import {
  type AdminCategory,
  categoryFormSchema,
  type CategoryFormValues,
} from '../../../modules/categories/schemas/categorySchema';
import { MediaField } from '../../../modules/media/components/MediaField';

function CategoryForm({
  category,
  onDone,
}: {
  category: AdminCategory | null;
  onDone: () => void;
}) {
  const { create, update } = useCategoryMutations();
  const mutation = category ? update : create;
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: category?.name ?? '',
      slug: category?.slug ?? '',
      description: category?.description ?? '',
      imageId: category?.image?.id ?? null,
      isActive: category?.isActive ?? true,
    },
  });
  const { errors, isDirty } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    const options = {
      onSuccess: () => {
        form.reset(values);
        onDone();
      },
    };
    if (category) update.mutate({ id: category.id, values }, options);
    else create.mutate(values, options);
  });

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      noValidate
      className="space-y-4 rounded-xl border border-forest/10 bg-white p-5"
    >
      <UnsavedChangesGuard when={isDirty && !mutation.isPending} />
      <h2 className="text-lg font-bold">
        {category ? `Modifier « ${category.name} »` : 'Nouvelle catégorie'}
      </h2>
      {mutation.isError && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {getErrorMessage(mutation.error)}
        </p>
      )}
      <FormField id="category-name" label="Nom" error={errors.name?.message}>
        <input
          id="category-name"
          className={inputClassName}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={describedBy('category-name', errors.name?.message)}
          {...form.register('name')}
        />
      </FormField>
      <FormField
        id="category-slug"
        label="Adresse (slug)"
        error={errors.slug?.message}
        hint="Laisser vide pour la générer à partir du nom. La modifier change l’URL publique."
      >
        <input
          id="category-slug"
          className={inputClassName}
          aria-invalid={errors.slug ? true : undefined}
          aria-describedby={describedBy('category-slug', errors.slug?.message, 'hint')}
          {...form.register('slug')}
        />
      </FormField>
      <FormField id="category-description" label="Description" error={errors.description?.message}>
        <textarea
          id="category-description"
          rows={3}
          className={`${inputClassName} py-2`}
          {...form.register('description')}
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
            preview={category?.image ?? undefined}
          />
        )}
      />
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" className="size-5 accent-forest" {...form.register('isActive')} />
        Visible sur le site
      </label>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onDone} className={buttonClassName('secondary')}>
          Annuler
        </button>
        <button type="submit" disabled={mutation.isPending} className={buttonClassName('primary')}>
          {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </form>
  );
}

export function CategoriesPage() {
  const categories = useAdminCategories();
  const { reorder, remove } = useCategoryMutations();
  const [editing, setEditing] = useState<AdminCategory | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<AdminCategory | null>(null);

  const move = (index: number, direction: -1 | 1) => {
    const list = categories.data;
    if (!list) return;
    const ids = list.map((category) => category.id);
    const target = index + direction;
    const current = ids[index];
    const other = ids[target];
    if (current === undefined || other === undefined) return;
    ids[index] = other;
    ids[target] = current;
    reorder.mutate(ids);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-forest">Catégories</h1>
          <p className="mt-1 text-sm text-charcoal/70">
            Organisation du catalogue et ordre d’affichage public.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className={buttonClassName('primary')}
        >
          <Plus aria-hidden="true" className="size-4" />
          Nouvelle catégorie
        </button>
      </div>

      {editing && (
        <CategoryForm
          key={editing === 'new' ? 'new' : editing.id}
          category={editing === 'new' ? null : editing}
          onDone={() => setEditing(null)}
        />
      )}

      {(reorder.isError || remove.isError) && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {getErrorMessage(reorder.error ?? remove.error)}
        </p>
      )}

      {categories.isPending ? (
        <LoadingState label="Chargement des catégories…" />
      ) : categories.isError ? (
        <ErrorState
          message={getErrorMessage(categories.error)}
          onRetry={() => void categories.refetch()}
        />
      ) : categories.data.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="Aucune catégorie"
          description="Créez une catégorie pour organiser le catalogue."
        />
      ) : (
        <ol className="divide-y divide-forest/10 rounded-xl border border-forest/10 bg-white">
          {categories.data.map((category, index) => (
            <li key={category.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{category.name}</p>
                <p className="text-sm text-charcoal/60">
                  /{category.slug} · {category.isActive ? 'Visible' : 'Masquée'}
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={index === 0 || reorder.isPending}
                  onClick={() => move(index, -1)}
                  aria-label={`Monter ${category.name}`}
                  className={buttonClassName('ghost', 'px-3')}
                >
                  <ArrowUp aria-hidden="true" className="size-4" />
                </button>
                <button
                  type="button"
                  disabled={index === categories.data.length - 1 || reorder.isPending}
                  onClick={() => move(index, 1)}
                  aria-label={`Descendre ${category.name}`}
                  className={buttonClassName('ghost', 'px-3')}
                >
                  <ArrowDown aria-hidden="true" className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(category)}
                  aria-label={`Modifier ${category.name}`}
                  className={buttonClassName('ghost', 'px-3')}
                >
                  <Pencil aria-hidden="true" className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setToDelete(category)}
                  aria-label={`Supprimer ${category.name}`}
                  className={buttonClassName('ghost', 'px-3 text-red-700 hover:bg-red-50')}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer la catégorie"
        description={`« ${toDelete?.name ?? ''} » sera supprimée. Impossible si des produits y sont rattachés : masquez-la plutôt.`}
        confirmLabel="Supprimer"
        tone="danger"
        pending={remove.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) remove.mutate(toDelete.id, { onSettled: () => setToDelete(null) });
        }}
      />
    </div>
  );
}
