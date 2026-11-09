import { useDocumentMeta } from '../../core/hooks/useDocumentMeta';
import { HomeShowcase } from '../../modules/pages/components/home/HomeShowcase';
import { usePublishedPage } from '../../modules/pages/hooks/usePages';

export function HomePage() {
  const page = usePublishedPage('home');
  useDocumentMeta({
    title: page.data?.seo.title || 'Accueil',
    description: page.data?.seo.description || undefined,
  });
  // La vitrine s'affiche sans attendre l'API (réveil possible) ; le CMS remplace ensuite les textes.
  return <HomeShowcase sections={page.data?.sections ?? []} media={page.data?.media ?? {}} />;
}
