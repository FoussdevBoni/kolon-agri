import { MatchingForm } from '../../modules/matchingRequests/components/MatchingForm';
import { CmsPage } from './components/CmsPage';

export function MatchingPage() {
  return (
    <CmsPage pageKey="matching" fallbackTitle="Mise en relation">
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <MatchingForm />
      </section>
    </CmsPage>
  );
}
