import { MatchingForm } from '../../modules/matchingRequests/components/MatchingForm';
import { CmsPage } from './components/CmsPage';

export function MatchingPage() {
  return (
    <CmsPage pageKey="matching" fallbackTitle="Mise en relation">
      <section id="formulaire" className="scroll-mt-24 bg-forest/5">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold sm:text-4xl">Décrivez votre besoin</h2>
          <p className="mt-3 text-lg text-charcoal/75">
            Nous recherchons le partenaire adapté dans notre réseau.
          </p>
          <div className="mt-8">
            <MatchingForm />
          </div>
        </div>
      </section>
    </CmsPage>
  );
}
