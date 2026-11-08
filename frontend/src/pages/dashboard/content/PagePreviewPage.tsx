import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { getErrorMessage } from '../../../core/api/apiError';
import { ErrorState } from '../../../core/components/ErrorState';
import { LoadingState } from '../../../core/components/LoadingState';
import { SectionRenderer } from '../../../modules/pages/components/SectionRenderer';
import { usePageDraft } from '../../../modules/pages/hooks/usePages';

/** Prévisualisation authentifiée du brouillon, rendue comme sur le site public. */
export function PagePreviewPage() {
  const { id = '' } = useParams();
  const page = usePageDraft(id);
  if (page.isPending) return <LoadingState label="Chargement de la prévisualisation…" />;
  if (page.isError)
    return <ErrorState message={getErrorMessage(page.error)} onRetry={() => void page.refetch()} />;
  return (
    <div className="-mx-4 -mt-6 md:-mx-8">
      <div className="sticky top-16 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-sand bg-sand px-4 py-3 text-sm md:px-8">
        <p>
          <strong>Prévisualisation du brouillon</strong> — {page.data.title}. Ce contenu n’est pas
          visible publiquement.
        </p>
        <Link
          to=".."
          relative="path"
          className="inline-flex items-center gap-2 font-semibold text-forest"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Retour à l’édition
        </Link>
      </div>
      <div className="bg-ivory">
        <SectionRenderer sections={page.data.draft.sections} media={page.data.media} />
      </div>
    </div>
  );
}
