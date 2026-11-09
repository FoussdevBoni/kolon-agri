import { QuotationRequest } from '../../modules/quotations/components/QuotationRequest';
import { CmsPage } from './components/CmsPage';

export function QuotationRequestPage() {
  return (
    <CmsPage
      pageKey="quotation-request"
      fallbackTitle="Demande de devis"
      heroVariant="compact"
      placement="early"
    >
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <QuotationRequest />
      </section>
    </CmsPage>
  );
}
