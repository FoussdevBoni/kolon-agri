import { Link } from 'react-router';
import { photoCredits } from '../../core/content/photoCredits';
import { publicNavItems, quotationRequestPath } from '../../core/navigation/publicNavigation';
import { usePublishedPage } from '../../modules/pages/hooks/usePages';
import { readSectionData } from '../../modules/pages/schemas/sectionSchema';

const DEFAULT_SITE_NAME = 'Kolon Agri';

/** Pied de page : identité et coordonnées issues de la page CMS « site ». */
function useSiteInfo() {
  const site = usePublishedPage('site');
  const sections = site.data?.sections ?? [];
  const identitySection = sections.find((section) => section.type === 'siteIdentity');
  const contactSection = sections.find((section) => section.type === 'contactInfo');
  return {
    identity: identitySection ? readSectionData('siteIdentity', identitySection.data) : null,
    contact: contactSection ? readSectionData('contactInfo', contactSection.data) : null,
  };
}

export function PublicFooter() {
  const { identity, contact } = useSiteInfo();
  const name = identity?.name ?? DEFAULT_SITE_NAME;
  const contactLines = [contact?.phone, contact?.email, contact?.address].filter(Boolean);

  return (
    <footer className="bg-forest text-ivory">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:px-8">
        <div>
          <p className="font-display text-xl font-extrabold">{name}</p>
          {identity?.tagline && (
            <p className="mt-3 max-w-sm text-sm text-ivory/70">{identity.tagline}</p>
          )}
          {contactLines.length > 0 && (
            <address className="mt-4 space-y-1 text-sm whitespace-pre-line text-ivory/70 not-italic">
              {contactLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </address>
          )}
        </div>
        <nav aria-label="Liens du pied de page">
          <ul className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {publicNavItems.map((item) => (
              <li key={item.path}>
                <Link to={item.path} className="text-ivory/80 hover:text-sand">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link to={quotationRequestPath} className="text-ivory/80 hover:text-sand">
                Demande de devis
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-ivory/10">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-ivory/60 sm:px-6 lg:px-8">
          © {new Date().getFullYear()} {name}. Tous droits réservés.
        </p>
        <details className="mx-auto max-w-7xl px-4 pb-5 text-xs text-ivory/60 sm:px-6 lg:px-8">
          <summary className="cursor-pointer">Crédits photographiques</summary>
          <ul className="mt-2 space-y-1">
            {photoCredits.map((photo) => (
              <li key={photo.sourceUrl}>
                <a href={photo.sourceUrl} rel="noreferrer" target="_blank" className="underline">
                  {photo.title}
                </a>{' '}
                — {photo.author}, {photo.license}, via Wikimedia Commons, image redimensionnée.
              </li>
            ))}
          </ul>
        </details>
      </div>
    </footer>
  );
}
