import type { MediaSummary } from '../../media/schemas/mediaSchema';
import type { PageSection } from '../schemas/pageSchema';
import { readSectionData } from '../schemas/sectionSchema';
import {
  CallToActionSection,
  CardsSection,
  ContactInfoSection,
  FaqSection,
  FeaturedProductsSection,
  HeroSection,
  ImageTextSection,
  RichTextSection,
  ServicesListSection,
} from './PublicSections';

interface SectionRendererProps {
  sections: readonly PageSection[];
  media: Record<string, MediaSummary>;
}

/**
 * Rendu des sections typées (texte brut uniquement, jamais de HTML injecté).
 * Le premier bandeau porte le titre h1 de la page ; une section invalide est ignorée.
 */
export function SectionRenderer({ sections, media }: SectionRendererProps) {
  const firstHeroId = sections.find((section) => section.type === 'hero')?.id;
  return (
    <>
      {sections.map((section) => {
        switch (section.type) {
          case 'hero': {
            const data = readSectionData('hero', section.data);
            return data ? (
              <HeroSection
                key={section.id}
                data={data}
                media={media}
                headingLevel={section.id === firstHeroId ? 'h1' : 'h2'}
              />
            ) : null;
          }
          case 'richText': {
            const data = readSectionData('richText', section.data);
            return data ? <RichTextSection key={section.id} data={data} /> : null;
          }
          case 'cards': {
            const data = readSectionData('cards', section.data);
            return data ? <CardsSection key={section.id} data={data} /> : null;
          }
          case 'imageText': {
            const data = readSectionData('imageText', section.data);
            return data ? <ImageTextSection key={section.id} data={data} media={media} /> : null;
          }
          case 'callToAction': {
            const data = readSectionData('callToAction', section.data);
            return data ? <CallToActionSection key={section.id} data={data} /> : null;
          }
          case 'faq': {
            const data = readSectionData('faq', section.data);
            return data ? <FaqSection key={section.id} data={data} /> : null;
          }
          case 'featuredProducts': {
            const data = readSectionData('featuredProducts', section.data);
            return data ? <FeaturedProductsSection key={section.id} data={data} /> : null;
          }
          case 'servicesList': {
            const data = readSectionData('servicesList', section.data);
            return data ? <ServicesListSection key={section.id} data={data} /> : null;
          }
          case 'contactInfo': {
            const data = readSectionData('contactInfo', section.data);
            return data ? <ContactInfoSection key={section.id} data={data} /> : null;
          }
          case 'siteIdentity':
            return null;
        }
      })}
    </>
  );
}
