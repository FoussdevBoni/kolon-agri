import { ContactForm } from '../../modules/contactMessages/components/ContactForm';
import { CmsPage } from './components/CmsPage';

export function ContactPage() {
  return (
    <CmsPage pageKey="contact" fallbackTitle="Contact">
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <ContactForm />
      </section>
    </CmsPage>
  );
}
