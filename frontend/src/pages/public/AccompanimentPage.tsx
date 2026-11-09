import { AccompanimentForm } from '../../modules/accompanimentRequests/components/AccompanimentForm';
import { CmsPage } from './components/CmsPage';

export function AccompanimentPage() {
  return (
    <CmsPage pageKey="accompaniment" fallbackTitle="Accompagnement">
      <section id="formulaire" className="scroll-mt-24 bg-forest/5">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold sm:text-4xl">Présentez votre projet</h2>
          <p className="mt-3 text-lg text-charcoal/75">
            Quelques informations suffisent pour que nous puissions étudier votre demande.
          </p>
          <div className="mt-8">
            <AccompanimentForm />
          </div>
        </div>
      </section>
    </CmsPage>
  );
}
