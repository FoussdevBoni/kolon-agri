import { ContactForm } from '../../modules/contactMessages/components/ContactForm';
import { CmsPage } from './components/CmsPage';

export function ContactPage() {
  return (
    <CmsPage pageKey="contact" fallbackTitle="Contact" heroVariant="compact" placement="aside">
      <ContactForm />
    </CmsPage>
  );
}
