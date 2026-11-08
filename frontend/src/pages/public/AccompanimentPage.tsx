import { AccompanimentForm } from '../../modules/accompanimentRequests/components/AccompanimentForm';
import { CmsPage } from './components/CmsPage';

export function AccompanimentPage() {
  return (
    <CmsPage pageKey="accompaniment" fallbackTitle="Accompagnement">
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <AccompanimentForm />
      </section>
    </CmsPage>
  );
}
