import type { ReactNode } from 'react';
import { ApiError, getErrorMessage } from '../../../core/api/apiError';
import { ErrorState } from '../../../core/components/ErrorState';
import { LoadingState } from '../../../core/components/LoadingState';
import { useDocumentMeta } from '../../../core/hooks/useDocumentMeta';
import { SectionRenderer } from '../../../modules/pages/components/SectionRenderer';
import { usePublishedPage } from '../../../modules/pages/hooks/usePages';
import { PublicPageHeader } from './PublicPageHeader';
import { UpcomingSection } from './UpcomingSection';

interface CmsPageProps {
  pageKey: string;
  /** Titre utilisé si la page ne contient pas de bandeau ou n'est pas encore publiée. */
  fallbackTitle: string;
  children?: ReactNode;
}

/** Page publique alimentée par le CMS (version publiée uniquement). */
export function CmsPage({ pageKey, fallbackTitle, children }: CmsPageProps) {
  const page = usePublishedPage(pageKey);
  useDocumentMeta({
    title: page.data?.seo.title || fallbackTitle,
    description: page.data?.seo.description || undefined,
  });

  if (page.isPending) return <LoadingState label="Chargement de la page…" />;

  if (page.isError) {
    const notPublished = page.error instanceof ApiError && page.error.status === 404;
    return (
      <>
        <PublicPageHeader title={fallbackTitle} />
        {notPublished ? (
          <UpcomingSection title="Contenu en préparation" />
        ) : (
          <div className="mx-auto max-w-3xl px-4 py-12">
            <ErrorState message={getErrorMessage(page.error)} onRetry={() => void page.refetch()} />
          </div>
        )}
        {children}
      </>
    );
  }

  const hasHero = page.data.sections.some((section) => section.type === 'hero');
  return (
    <>
      {!hasHero && <PublicPageHeader title={fallbackTitle} />}
      <SectionRenderer sections={page.data.sections} media={page.data.media} />
      {children}
    </>
  );
}
