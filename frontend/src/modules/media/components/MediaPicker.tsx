import { Search, X } from 'lucide-react';
import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getErrorMessage } from '../../../core/api/apiError';
import { buttonClassName } from '../../../core/components/buttonStyles';
import { EmptyState } from '../../../core/components/EmptyState';
import { ErrorState } from '../../../core/components/ErrorState';
import { inputClassName } from '../../../core/components/FormField';
import { LoadingState } from '../../../core/components/LoadingState';
import { Pagination } from '../../../core/components/Pagination';
import { cloudinaryUrl } from '../../../core/utils/cloudinaryImage';
import { useMediaList } from '../hooks/useMedia';
import type { MediaSummary } from '../schemas/mediaSchema';
import { MediaUploadButton } from './MediaUploadButton';

interface MediaPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (media: MediaSummary) => void;
}

/** Sélecteur de médias : recherche, pagination et téléversement direct. */
export function MediaPicker({ open, onClose, onSelect }: MediaPickerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const media = useMediaList(page, search);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [open]);

  const select = (item: MediaSummary) => {
    onSelect(item);
    onClose();
  };

  const applySearch = () => {
    setPage(1);
    setSearch(draft.trim());
  };

  // Entrée lance la recherche sans soumettre le formulaire qui contient le champ image.
  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    applySearch();
  };

  // Rendu hors du formulaire parent (portail) : aucun <form> imbriqué ni soumission implicite.
  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="h-[90dvh] w-[calc(100%-1rem)] max-w-4xl rounded-2xl bg-white p-0 text-charcoal backdrop:bg-charcoal/40"
    >
      {open && (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-forest/10 px-5 py-3">
            <h2 id={titleId} className="text-lg font-bold">
              Choisir une image
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-forest/5"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </div>
          <div className="flex flex-col gap-4 border-b border-forest/10 p-5 sm:flex-row sm:items-start sm:justify-between">
            <div role="search" className="flex flex-1 gap-2">
              <label htmlFor={`${titleId}-search`} className="sr-only">
                Rechercher une image
              </label>
              <input
                id={`${titleId}-search`}
                type="search"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={onSearchKeyDown}
                placeholder="Nom ou texte alternatif"
                className={inputClassName}
              />
              <button
                type="button"
                onClick={applySearch}
                className={buttonClassName('secondary', 'shrink-0 px-3')}
              >
                <Search aria-hidden="true" className="size-4" />
                <span className="sr-only">Rechercher</span>
              </button>
            </div>
            <MediaUploadButton onUploaded={select} label="Téléverser et choisir" />
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {media.isPending ? (
              <LoadingState label="Chargement des médias…" />
            ) : media.isError ? (
              <ErrorState
                message={getErrorMessage(media.error)}
                onRetry={() => void media.refetch()}
              />
            ) : media.data.items.length === 0 ? (
              <EmptyState title="Aucune image" description="Téléversez une première image." />
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {media.data.items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => select(item)}
                      className="group block w-full overflow-hidden rounded-xl border border-forest/10 text-left focus-visible:ring-2 focus-visible:ring-forest"
                    >
                      <img
                        src={cloudinaryUrl(item.url, 320)}
                        alt=""
                        loading="lazy"
                        className="aspect-square w-full object-cover transition-opacity group-hover:opacity-90"
                      />
                      <span className="block truncate px-2 py-1.5 text-xs">
                        {item.alt || item.originalFilename || 'Sans titre'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {media.data && media.data.meta.totalPages > 1 && (
            <div className="border-t border-forest/10 p-4">
              <Pagination
                meta={media.data.meta}
                itemLabel={['image', 'images']}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      )}
    </dialog>,
    document.body,
  );
}
