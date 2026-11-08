import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDown, ArrowLeft, ArrowUp, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useFieldArray, useForm, type UseFormReturn } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import { getErrorMessage } from '../../../core/api/apiError';
import { buttonClassName } from '../../../core/components/buttonStyles';
import { ConfirmDialog } from '../../../core/components/ConfirmDialog';
import { ErrorState } from '../../../core/components/ErrorState';
import { FormField, inputClassName } from '../../../core/components/FormField';
import { describedBy } from '../../../core/components/formFieldUtils';
import { LoadingState } from '../../../core/components/LoadingState';
import { UnsavedChangesGuard } from '../../../core/forms/UnsavedChangesGuard';
import { cloudinaryUrl } from '../../../core/utils/cloudinaryImage';
import { useAdminCategories } from '../../../modules/categories/hooks/useCategories';
import { MediaPicker } from '../../../modules/media/components/MediaPicker';
import type { MediaSummary } from '../../../modules/media/schemas/mediaSchema';
import { StatusBadge } from '../../../modules/products/components/ProductStatusBadge';
import { useAdminProduct, useProductMutations } from '../../../modules/products/hooks/useProducts';
import {
  type AdminProduct,
  availabilityLabels,
  emptyProductForm,
  emptyVariant,
  productFormSchema,
  type ProductFormValues,
  productToForm,
  variantAvailabilities,
} from '../../../modules/products/schemas/productSchema';

const card = 'space-y-4 rounded-xl border border-forest/10 bg-white p-5 sm:p-6';
type Form = UseFormReturn<ProductFormValues>;

function VariantsEditor({ form }: { form: Form }) {
  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'variants',
  });
  const errors = form.formState.errors.variants;
  return (
    <section aria-labelledby="variants-title" className={card}>
      <div className="flex items-center justify-between gap-4">
        <h2 id="variants-title" className="text-lg font-bold">
          Variantes
        </h2>
        <button
          type="button"
          onClick={() => append(emptyVariant())}
          className={buttonClassName('secondary')}
        >
          <Plus aria-hidden="true" className="size-4" />
          Ajouter
        </button>
      </div>
      <p className="text-sm text-charcoal/70">
        Prix indicatifs en FCFA. Une variante désactivée n’est pas affichée ; « sur demande » n’a
        pas de prix ferme.
      </p>
      {errors?.root?.message && (
        <p role="alert" className="text-sm text-red-700">
          {errors.root.message}
        </p>
      )}
      {errors?.message && (
        <p role="alert" className="text-sm text-red-700">
          {errors.message}
        </p>
      )}
      <ol className="space-y-4">
        {fields.map((field, index) => {
          const fieldErrors = errors?.[index];
          const prefix = `variant-${field.id}`;
          return (
            <li key={field.id} className="rounded-lg border border-forest/10 bg-ivory/60 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Variante {index + 1}</p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                    aria-label="Monter la variante"
                    className={buttonClassName('ghost', 'px-2')}
                  >
                    <ArrowUp aria-hidden="true" className="size-4" />
                  </button>
                  <button
                    type="button"
                    disabled={index === fields.length - 1}
                    onClick={() => move(index, index + 1)}
                    aria-label="Descendre la variante"
                    className={buttonClassName('ghost', 'px-2')}
                  >
                    <ArrowDown aria-hidden="true" className="size-4" />
                  </button>
                  <button
                    type="button"
                    disabled={fields.length === 1}
                    onClick={() => remove(index)}
                    aria-label="Supprimer la variante"
                    className={buttonClassName('ghost', 'px-2 text-red-700')}
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </button>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <FormField
                  id={`${prefix}-label`}
                  label="Libellé"
                  error={fieldErrors?.label?.message}
                >
                  <input
                    id={`${prefix}-label`}
                    className={inputClassName}
                    aria-describedby={describedBy(`${prefix}-label`, fieldErrors?.label?.message)}
                    {...form.register(`variants.${index}.label`)}
                  />
                </FormField>
                <FormField id={`${prefix}-unit`} label="Unité" error={fieldErrors?.unit?.message}>
                  <input
                    id={`${prefix}-unit`}
                    className={inputClassName}
                    placeholder="sac, litre, pièce…"
                    {...form.register(`variants.${index}.unit`)}
                  />
                </FormField>
                <FormField
                  id={`${prefix}-packaging`}
                  label="Conditionnement (facultatif)"
                  error={fieldErrors?.packaging?.message}
                >
                  <input
                    id={`${prefix}-packaging`}
                    className={inputClassName}
                    placeholder="Sac de 25 kg"
                    {...form.register(`variants.${index}.packaging`)}
                  />
                </FormField>
                <FormField
                  id={`${prefix}-sku`}
                  label="Référence (facultatif)"
                  error={fieldErrors?.sku?.message}
                >
                  <input
                    id={`${prefix}-sku`}
                    className={inputClassName}
                    {...form.register(`variants.${index}.sku`)}
                  />
                </FormField>
                <FormField
                  id={`${prefix}-price`}
                  label="Prix indicatif (FCFA)"
                  error={fieldErrors?.indicativePrice?.message}
                >
                  <input
                    id={`${prefix}-price`}
                    inputMode="numeric"
                    className={inputClassName}
                    {...form.register(`variants.${index}.indicativePrice`)}
                  />
                </FormField>
                <FormField id={`${prefix}-availability`} label="Disponibilité">
                  <select
                    id={`${prefix}-availability`}
                    className={inputClassName}
                    {...form.register(`variants.${index}.availability`)}
                  >
                    {variantAvailabilities.map((availability) => (
                      <option key={availability} value={availability}>
                        {availabilityLabels[availability]}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
              <div className="mt-3 flex flex-wrap gap-6 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="size-5 accent-forest"
                    {...form.register(`variants.${index}.priceOnRequest`)}
                  />
                  Prix sur demande
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="size-5 accent-forest"
                    {...form.register(`variants.${index}.isActive`)}
                  />
                  Variante active
                </label>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function CharacteristicsEditor({ form }: { form: Form }) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'characteristics',
  });
  const errors = form.formState.errors.characteristics;
  return (
    <section aria-labelledby="characteristics-title" className={card}>
      <div className="flex items-center justify-between gap-4">
        <h2 id="characteristics-title" className="text-lg font-bold">
          Caractéristiques
        </h2>
        <button
          type="button"
          disabled={fields.length >= 30}
          onClick={() => append({ label: '', value: '' })}
          className={buttonClassName('secondary')}
        >
          <Plus aria-hidden="true" className="size-4" />
          Ajouter
        </button>
      </div>
      {fields.length === 0 && (
        <p className="text-sm text-charcoal/60">
          Aucune caractéristique (ex. cycle, rendement, composition).
        </p>
      )}
      <ul className="space-y-3">
        {fields.map((field, index) => (
          <li key={field.id} className="grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
            <FormField
              id={`char-${field.id}-label`}
              label="Libellé"
              error={errors?.[index]?.label?.message}
            >
              <input
                id={`char-${field.id}-label`}
                className={inputClassName}
                {...form.register(`characteristics.${index}.label`)}
              />
            </FormField>
            <FormField
              id={`char-${field.id}-value`}
              label="Valeur"
              error={errors?.[index]?.value?.message}
            >
              <input
                id={`char-${field.id}-value`}
                className={inputClassName}
                {...form.register(`characteristics.${index}.value`)}
              />
            </FormField>
            <button
              type="button"
              onClick={() => remove(index)}
              aria-label="Supprimer la caractéristique"
              className={buttonClassName('ghost', 'px-3 text-red-700')}
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ImagesEditor({ form, initial }: { form: Form; initial: MediaSummary[] }) {
  const { fields, append, remove, move } = useFieldArray({ control: form.control, name: 'images' });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [previews, setPreviews] = useState<Record<string, MediaSummary>>(() =>
    Object.fromEntries(initial.map((media) => [media.id, media])),
  );
  return (
    <section aria-labelledby="images-title" className={card}>
      <div className="flex items-center justify-between gap-4">
        <h2 id="images-title" className="text-lg font-bold">
          Images
        </h2>
        <button
          type="button"
          disabled={fields.length >= 10}
          onClick={() => setPickerOpen(true)}
          className={buttonClassName('secondary')}
        >
          <Plus aria-hidden="true" className="size-4" />
          Ajouter
        </button>
      </div>
      <p className="text-sm text-charcoal/70">
        La première image est l’image principale du produit.
      </p>
      {form.formState.errors.images?.message && (
        <p role="alert" className="text-sm text-red-700">
          {form.formState.errors.images.message}
        </p>
      )}
      <ol className="space-y-3">
        {fields.map((field, index) => {
          const preview = previews[field.mediaId];
          return (
            <li
              key={field.id}
              className="flex flex-col gap-3 rounded-lg border border-forest/10 p-3 sm:flex-row sm:items-center"
            >
              {preview ? (
                <img
                  src={cloudinaryUrl(preview.url, 160)}
                  alt=""
                  className="size-20 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <span className="size-20 shrink-0 rounded-lg bg-ivory" />
              )}
              <div className="flex-1">
                <FormField id={`image-${field.id}-alt`} label="Texte alternatif">
                  <input
                    id={`image-${field.id}-alt`}
                    className={inputClassName}
                    {...form.register(`images.${index}.alt`)}
                  />
                </FormField>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => move(index, index - 1)}
                  aria-label="Monter l’image"
                  className={buttonClassName('ghost', 'px-2')}
                >
                  <ArrowUp aria-hidden="true" className="size-4" />
                </button>
                <button
                  type="button"
                  disabled={index === fields.length - 1}
                  onClick={() => move(index, index + 1)}
                  aria-label="Descendre l’image"
                  className={buttonClassName('ghost', 'px-2')}
                >
                  <ArrowDown aria-hidden="true" className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  aria-label="Retirer l’image"
                  className={buttonClassName('ghost', 'px-2 text-red-700')}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(media) => {
          if (fields.some((field) => field.mediaId === media.id)) return;
          setPreviews((current) => ({ ...current, [media.id]: media }));
          append({ mediaId: media.id, alt: media.alt });
        }}
      />
    </section>
  );
}

function LifecyclePanel({ product, dirty }: { product: AdminProduct; dirty: boolean }) {
  const { setPublication, archive, restore } = useProductMutations();
  const [confirmArchive, setConfirmArchive] = useState(false);
  const error = setPublication.error ?? archive.error ?? restore.error;
  const busy = setPublication.isPending || archive.isPending || restore.isPending;
  return (
    <section aria-labelledby="lifecycle-title" className={card}>
      <div className="flex items-center justify-between gap-3">
        <h2 id="lifecycle-title" className="text-lg font-bold">
          Publication
        </h2>
        <StatusBadge status={product.status} />
      </div>
      {dirty && (
        <p className="text-sm text-charcoal/70">
          Enregistrez vos modifications avant de changer le statut.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {getErrorMessage(error)}
        </p>
      )}
      <div className="flex flex-col gap-2">
        {product.status === 'draft' && (
          <button
            type="button"
            disabled={dirty || busy}
            onClick={() => setPublication.mutate({ id: product.id, published: true })}
            className={buttonClassName('primary')}
          >
            Publier
          </button>
        )}
        {product.status === 'published' && (
          <>
            <a
              href={`/catalogue/${product.slug}`}
              target="_blank"
              rel="noreferrer"
              className={buttonClassName('secondary')}
            >
              <ExternalLink aria-hidden="true" className="size-4" />
              Voir sur le site
            </a>
            <button
              type="button"
              disabled={dirty || busy}
              onClick={() => setPublication.mutate({ id: product.id, published: false })}
              className={buttonClassName('secondary')}
            >
              Dépublier
            </button>
          </>
        )}
        {product.status === 'archived' ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => restore.mutate(product.id)}
            className={buttonClassName('secondary')}
          >
            Restaurer en brouillon
          </button>
        ) : (
          <button
            type="button"
            disabled={dirty || busy}
            onClick={() => setConfirmArchive(true)}
            className={buttonClassName('ghost', 'text-red-700 hover:bg-red-50')}
          >
            Archiver
          </button>
        )}
      </div>
      <ConfirmDialog
        open={confirmArchive}
        title="Archiver le produit"
        description="Le produit sera retiré du catalogue public mais conservé (historique des devis). Vous pourrez le restaurer."
        confirmLabel="Archiver"
        tone="danger"
        pending={archive.isPending}
        onCancel={() => setConfirmArchive(false)}
        onConfirm={() => archive.mutate(product.id, { onSettled: () => setConfirmArchive(false) })}
      />
    </section>
  );
}

function ProductEditor({ product }: { product: AdminProduct | null }) {
  const navigate = useNavigate();
  const categories = useAdminCategories();
  const { create, update } = useProductMutations();
  const mutation = product ? update : create;
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: product ? productToForm(product) : emptyProductForm(),
  });
  const { errors, isDirty } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    if (product) {
      update.mutate(
        { id: product.id, values },
        { onSuccess: (saved) => form.reset(productToForm(saved)) },
      );
    } else {
      create.mutate(values, {
        onSuccess: (saved) => {
          form.reset(productToForm(saved));
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
    <div className="mx-auto max-w-6xl space-y-6">
      <UnsavedChangesGuard when={isDirty && !mutation.isPending} />
      <Link
        to=".."
        relative="path"
        className="inline-flex items-center gap-2 text-sm font-semibold text-forest"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Produits
      </Link>
      <h1 className="text-2xl font-extrabold text-forest">
        {product ? product.name : 'Nouveau produit'}
      </h1>

      <form
        onSubmit={(event) => void onSubmit(event)}
        noValidate
        className="grid gap-6 lg:grid-cols-[1fr_20rem]"
      >
        <div className="space-y-6">
          {mutation.isError && (
            <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
              {getErrorMessage(mutation.error)}
            </p>
          )}
          <section aria-labelledby="info-title" className={card}>
            <h2 id="info-title" className="text-lg font-bold">
              Informations
            </h2>
            <FormField id="product-name" label="Nom" error={errors.name?.message}>
              <input
                id="product-name"
                className={inputClassName}
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={describedBy('product-name', errors.name?.message)}
                {...form.register('name')}
              />
            </FormField>
            <FormField
              id="product-slug"
              label="Adresse (slug)"
              error={errors.slug?.message}
              hint="Vide : générée depuis le nom. Une ancienne adresse reste redirigée."
            >
              <input
                id="product-slug"
                className={inputClassName}
                aria-describedby={describedBy('product-slug', errors.slug?.message, 'hint')}
                {...form.register('slug')}
              />
            </FormField>
            <FormField id="product-category" label="Catégorie">
              <select
                id="product-category"
                className={inputClassName}
                {...form.register('categoryId')}
              >
                <option value="">Aucune catégorie</option>
                {categories.data?.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                    {category.isActive ? '' : ' (masquée)'}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField id="product-short" label="Résumé" error={errors.shortDescription?.message}>
              <textarea
                id="product-short"
                rows={2}
                className={`${inputClassName} py-2`}
                {...form.register('shortDescription')}
              />
            </FormField>
            <FormField
              id="product-description"
              label="Description"
              error={errors.description?.message}
              hint="Texte brut ; les retours à la ligne sont conservés."
            >
              <textarea
                id="product-description"
                rows={6}
                className={`${inputClassName} py-2`}
                {...form.register('description')}
              />
            </FormField>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="size-5 accent-forest"
                {...form.register('featured')}
              />
              Mettre en avant sur l’accueil
            </label>
          </section>
          <ImagesEditor form={form} initial={product?.images ?? []} />
          <VariantsEditor form={form} />
          <CharacteristicsEditor form={form} />
          <section aria-labelledby="seo-title" className={card}>
            <h2 id="seo-title" className="text-lg font-bold">
              Référencement
            </h2>
            <FormField
              id="product-seo-title"
              label="Titre SEO"
              error={errors.seoTitle?.message}
              hint="Vide : le nom du produit est utilisé."
            >
              <input
                id="product-seo-title"
                className={inputClassName}
                {...form.register('seoTitle')}
              />
            </FormField>
            <FormField
              id="product-seo-description"
              label="Description SEO"
              error={errors.seoDescription?.message}
            >
              <textarea
                id="product-seo-description"
                rows={2}
                className={`${inputClassName} py-2`}
                {...form.register('seoDescription')}
              />
            </FormField>
          </section>
        </div>
        <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <section className={card}>
            <button
              type="submit"
              disabled={mutation.isPending || (product !== null && !isDirty)}
              className={buttonClassName('primary', 'w-full')}
            >
              {mutation.isPending
                ? 'Enregistrement…'
                : product
                  ? 'Enregistrer'
                  : 'Créer le produit'}
            </button>
            {product && (
              <button
                type="button"
                disabled={!isDirty || mutation.isPending}
                onClick={() => form.reset()}
                className={buttonClassName('secondary', 'w-full')}
              >
                Annuler les modifications
              </button>
            )}
            {update.isSuccess && !isDirty && (
              <p role="status" className="text-sm text-forest">
                Modifications enregistrées.
              </p>
            )}
          </section>
          {product && <LifecyclePanel product={product} dirty={isDirty} />}
        </div>
      </form>
    </div>
  );
}

export function ProductEditorPage() {
  const { id } = useParams();
  const product = useAdminProduct(id);
  if (!id) return <ProductEditor product={null} />;
  if (product.isPending) return <LoadingState label="Chargement du produit…" />;
  if (product.isError)
    return (
      <ErrorState message={getErrorMessage(product.error)} onRetry={() => void product.refetch()} />
    );
  return <ProductEditor key={product.data.id} product={product.data} />;
}
