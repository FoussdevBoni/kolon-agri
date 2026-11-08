import { Images, Search } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { getErrorMessage } from '../../../core/api/apiError';
import { buttonClassName } from '../../../core/components/buttonStyles';
import { ConfirmDialog } from '../../../core/components/ConfirmDialog';
import { EmptyState } from '../../../core/components/EmptyState';
import { ErrorState } from '../../../core/components/ErrorState';
import { FormField, inputClassName } from '../../../core/components/FormField';
import { LoadingState } from '../../../core/components/LoadingState';
import { Pagination } from '../../../core/components/Pagination';
import { cloudinaryUrl } from '../../../core/utils/cloudinaryImage';
import { cn } from '../../../core/utils/cn';
import { formatDateTime } from '../../../core/utils/formatDate';
import { MediaUploadButton } from '../../../modules/media/components/MediaUploadButton';
import {
  useMediaDetail,
  useMediaList,
  useMediaMutations,
} from '../../../modules/media/hooks/useMedia';
import { referenceTypeLabels } from '../../../modules/media/schemas/mediaSchema';

function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} Mo`
    : `${String(Math.ceil(bytes / 1024))} Ko`;
}

function MediaDetailPanel({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  const detail = useMediaDetail(id);
  const { updateAlt, remove } = useMediaMutations();
  const [alt, setAlt] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (detail.isPending) return <LoadingState label="Chargement du média…" />;
  if (detail.isError)
    return (
      <ErrorState message={getErrorMessage(detail.error)} onRetry={() => void detail.refetch()} />
    );

  const media = detail.data;
  const altValue = alt ?? media.alt;
  const inUse = media.references.length > 0;

  return (
    <div className="space-y-5">
      <img
        src={cloudinaryUrl(media.url, 640)}
        alt={media.alt}
        className="w-full rounded-xl border border-forest/10"
      />
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <dt className="text-charcoal/60">Fichier</dt>
        <dd className="truncate">{media.originalFilename || '—'}</dd>
        <dt className="text-charcoal/60">Format</dt>
        <dd>
          {media.format.toUpperCase()} · {media.width} × {media.height} px
        </dd>
        <dt className="text-charcoal/60">Poids</dt>
        <dd>{formatBytes(media.bytes)}</dd>
        <dt className="text-charcoal/60">Ajouté le</dt>
        <dd>{formatDateTime(media.createdAt)}</dd>
      </dl>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          updateAlt.mutate({ id, alt: altValue.trim() }, { onSuccess: () => setAlt(null) });
        }}
      >
        <FormField
          id="media-alt"
          label="Texte alternatif"
          hint="Décrit l’image pour l’accessibilité et le référencement."
        >
          <input
            id="media-alt"
            value={altValue}
            maxLength={250}
            onChange={(event) => setAlt(event.target.value)}
            className={inputClassName}
          />
        </FormField>
        {updateAlt.isError && (
          <p role="alert" className="text-sm text-red-700">
            {getErrorMessage(updateAlt.error)}
          </p>
        )}
        <button
          type="submit"
          disabled={alt === null || updateAlt.isPending}
          className={buttonClassName('primary')}
        >
          Enregistrer
        </button>
      </form>
      <div>
        <h3 className="text-sm font-semibold">Utilisations</h3>
        {inUse ? (
          <ul className="mt-2 space-y-1 text-sm">
            {media.references.map((reference) => (
              <li key={`${reference.type}-${reference.id}`}>
                {referenceTypeLabels[reference.type] ?? reference.type} : {reference.label}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-charcoal/60">Aucun contenu n’utilise cette image.</p>
        )}
      </div>
      {remove.isError && (
        <p role="alert" className="text-sm text-red-700">
          {getErrorMessage(remove.error)}
        </p>
      )}
      <button
        type="button"
        disabled={inUse || remove.isPending}
        title={inUse ? 'Retirez d’abord l’image des contenus qui l’utilisent.' : undefined}
        onClick={() => setConfirmDelete(true)}
        className={buttonClassName('secondary', 'border-red-200 text-red-700 hover:bg-red-50')}
      >
        Supprimer l’image
      </button>
      <ConfirmDialog
        open={confirmDelete}
        title="Supprimer l’image"
        description="L’image sera définitivement supprimée de la médiathèque et du stockage."
        confirmLabel="Supprimer"
        tone="danger"
        pending={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          remove.mutate(id, {
            onSuccess: () => {
              setConfirmDelete(false);
              onDeleted();
            },
            onError: () => setConfirmDelete(false),
          })
        }
      />
    </div>
  );
}

export function MediaLibraryPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const media = useMediaList(page, search);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(draft.trim());
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-forest">Médiathèque</h1>
          <p className="mt-1 text-sm text-charcoal/70">
            Images utilisées par le catalogue et les contenus du site.
          </p>
        </div>
        <MediaUploadButton onUploaded={(item) => setSelectedId(item.id)} />
      </div>
      <form role="search" onSubmit={submitSearch} className="flex max-w-lg gap-2">
        <label htmlFor="media-search" className="sr-only">
          Rechercher une image
        </label>
        <input
          id="media-search"
          type="search"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Nom ou texte alternatif"
          className={inputClassName}
        />
        <button type="submit" className={buttonClassName('secondary', 'shrink-0 px-3')}>
          <Search aria-hidden="true" className="size-4" />
          <span className="sr-only">Rechercher</span>
        </button>
      </form>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          {media.isPending ? (
            <LoadingState label="Chargement des médias…" />
          ) : media.isError ? (
            <ErrorState
              message={getErrorMessage(media.error)}
              onRetry={() => void media.refetch()}
            />
          ) : media.data.items.length === 0 ? (
            <EmptyState icon={Images} title={search ? 'Aucun résultat' : 'Aucune image'} />
          ) : (
            <>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {media.data.items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      aria-pressed={selectedId === item.id}
                      className={cn(
                        'block w-full overflow-hidden rounded-xl border-2 bg-white text-left',
                        selectedId === item.id ? 'border-forest' : 'border-transparent',
                      )}
                    >
                      <img
                        src={cloudinaryUrl(item.url, 320)}
                        alt=""
                        loading="lazy"
                        className="aspect-square w-full object-cover"
                      />
                      <span className="block truncate px-2 py-1.5 text-xs">
                        {item.alt || item.originalFilename || 'Sans titre'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <Pagination
                meta={media.data.meta}
                itemLabel={['image', 'images']}
                onPageChange={setPage}
              />
            </>
          )}
        </div>
        <aside
          aria-label="Détail du média"
          className="rounded-xl border border-forest/10 bg-white p-5 lg:sticky lg:top-20 lg:self-start"
        >
          {selectedId ? (
            <MediaDetailPanel
              key={selectedId}
              id={selectedId}
              onDeleted={() => setSelectedId(null)}
            />
          ) : (
            <p className="text-sm text-charcoal/60">
              Sélectionnez une image pour voir ses détails.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
