import {
  ArrowRight,
  BookOpen,
  Check,
  FileCheck2,
  Handshake,
  type LucideIcon,
  MapPin,
  Sprout,
  Users,
} from 'lucide-react';
import { Link } from 'react-router';
import { buttonClassName } from '../../../../core/components/buttonStyles';
import { ResponsiveImage } from '../../../../core/components/ResponsiveImage';
import { SmartLink } from '../../../../core/components/SmartLink';
import { cn } from '../../../../core/utils/cn';
import { usePublicCategories } from '../../../categories/hooks/useCategories';
import type { MediaSummary } from '../../../media/schemas/mediaSchema';
import type { PageSection } from '../../schemas/pageSchema';
import { readSectionData, type SectionDataMap } from '../../schemas/sectionSchema';
import { FeaturedProductsSection } from '../PublicSections';
import { type HomePhoto, homePhotos } from './homePhotos';

const container = 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8';
type MediaMap = Record<string, MediaSummary>;

/** Bandeau affiché tant que le CMS ne répond pas (API en veille) ; remplacé dès son chargement. */
const fallbackHero: SectionDataMap['hero'] = {
  eyebrow: 'Agriculture au Mali et au Sénégal',
  title: 'Des solutions agricoles fiables, de l’intrant au projet.',
  subtitle: '',
  imageId: null,
  primaryLink: { label: 'Demander un devis', href: '/demande-de-devis' },
  secondaryLink: { label: 'Découvrir le catalogue', href: '/catalogue' },
};

const advantageIcons: readonly LucideIcon[] = [Sprout, MapPin, Users, FileCheck2];
const cardIcons: Readonly<Record<string, LucideIcon>> = {
  '/catalogue': BookOpen,
  '/accompagnement': Sprout,
  '/mise-en-relation': Handshake,
};

function Photo({
  photo,
  sizes,
  className,
  priority = false,
}: {
  photo: HomePhoto;
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <img
      src={photo.src}
      srcSet={photo.srcSet}
      sizes={sizes}
      width={photo.width}
      height={photo.height}
      alt={photo.alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      className={cn('object-cover', className)}
    />
  );
}

function Hero({ data, media }: { data: SectionDataMap['hero']; media: MediaMap }) {
  const cmsImage = data.imageId ? media[data.imageId] : undefined;
  const words = data.title.trim().split(/\s+/);
  const highlightFrom = Math.max(1, words.length - 3);
  return (
    <section className="relative isolate overflow-hidden bg-forest text-white">
      {cmsImage ? (
        <ResponsiveImage
          image={cmsImage}
          sizes="100vw"
          priority
          className="absolute inset-0 -z-20 h-full w-full object-[70%_center]"
        />
      ) : (
        <Photo
          photo={homePhotos.hero}
          sizes="100vw"
          priority
          className="absolute inset-0 -z-20 h-full w-full object-[70%_center]"
        />
      )}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-t from-forest/95 via-forest/75 to-forest/40 lg:bg-gradient-to-r lg:from-forest/95 lg:via-forest/70 lg:to-transparent"
      />
      <div className={cn(container, 'py-20 sm:py-28 lg:py-36')}>
        <div className="max-w-2xl">
          {data.eyebrow && (
            <p className="text-sm font-bold tracking-widest text-white uppercase">{data.eyebrow}</p>
          )}
          <h1 className="mt-4 text-4xl leading-tight font-extrabold sm:text-5xl lg:text-6xl">
            {words.slice(0, highlightFrom).join(' ')}{' '}
            <span className="text-sprout">{words.slice(highlightFrom).join(' ')}</span>
          </h1>
          {data.subtitle && <p className="mt-6 text-lg text-white/90">{data.subtitle}</p>}
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            {data.primaryLink && (
              <SmartLink href={data.primaryLink.href} className={buttonClassName('sprout')}>
                {data.primaryLink.label}
                <ArrowRight aria-hidden="true" className="size-4" />
              </SmartLink>
            )}
            {data.secondaryLink && (
              <SmartLink href={data.secondaryLink.href} className={buttonClassName('secondary')}>
                {data.secondaryLink.label}
              </SmartLink>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Advantages({ data }: { data: SectionDataMap['cards'] }) {
  return (
    <section aria-label={data.title} className="border-b border-forest/10 bg-white">
      <ul className={cn(container, 'grid gap-6 py-8 sm:grid-cols-2 lg:grid-cols-4')}>
        {data.items.map((item, index) => {
          const Icon = advantageIcons[index % advantageIcons.length] ?? Sprout;
          return (
            <li key={item.title} className="flex items-center gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-forest/10 text-forest">
                <Icon aria-hidden="true" className="size-6" />
              </span>
              <span>
                <span className="block font-display font-bold">{item.title}</span>
                <span className="block text-sm text-charcoal/70">{item.description}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Eyebrow({ children }: { children: string }) {
  return <p className="text-sm font-bold tracking-widest text-leaf uppercase">{children}</p>;
}

function CatalogTeaser({ data }: { data: SectionDataMap['richText'] | null }) {
  const categories = usePublicCategories();
  if (!categories.data?.length) return null;
  return (
    <section className={cn(container, 'grid gap-10 py-16 lg:grid-cols-[22rem_1fr] lg:py-24')}>
      <div>
        <Eyebrow>Notre catalogue</Eyebrow>
        {data?.title && (
          <h2 className="mt-3 text-3xl font-extrabold text-charcoal sm:text-4xl">{data.title}</h2>
        )}
        {data?.paragraphs.map((paragraph) => (
          <p key={paragraph} className="mt-4 text-lg text-charcoal/75">
            {paragraph}
          </p>
        ))}
        <Link to="/catalogue" className={buttonClassName('primary', 'mt-8')}>
          Voir le catalogue
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {categories.data.map((category) => (
          <li key={category.id}>
            <Link
              to={`/catalogue?categorie=${encodeURIComponent(category.slug)}`}
              className="group block h-full overflow-hidden rounded-2xl border border-forest/10 bg-white shadow-sm transition-shadow hover:shadow-lg"
            >
              <span className="block aspect-[4/5] overflow-hidden bg-sand">
                {category.image && (
                  <ResponsiveImage
                    image={category.image}
                    sizes="(min-width: 1024px) 15rem, 50vw"
                    alt=""
                    className="h-full w-full transition-transform duration-500 group-hover:scale-105"
                  />
                )}
              </span>
              <span className="block px-3 py-4 text-center font-display font-bold">
                {category.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ServiceCards({ data }: { data: SectionDataMap['cards'] }) {
  return (
    <section className="bg-forest/5">
      <div className={cn(container, 'py-16 lg:py-20')}>
        <div className="max-w-2xl">
          <Eyebrow>Nos services</Eyebrow>
          <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">{data.title}</h2>
          {data.intro && <p className="mt-4 text-lg text-charcoal/75">{data.intro}</p>}
        </div>
        <ul className="mt-10 grid gap-5 md:grid-cols-3">
          {data.items.map((item) => {
            const Icon = (item.href && cardIcons[item.href]) || Sprout;
            const body = (
              <>
                <Icon aria-hidden="true" className="size-9 text-leaf" />
                <h3 className="mt-5 text-xl font-bold">{item.title}</h3>
                {item.description && (
                  <p className="mt-2 flex-1 text-charcoal/75">{item.description}</p>
                )}
                {item.href && (
                  <span className="mt-5 flex size-10 items-center justify-center self-end rounded-full bg-forest/10 text-forest transition-colors group-hover:bg-forest group-hover:text-white">
                    <ArrowRight aria-hidden="true" className="size-5" />
                  </span>
                )}
              </>
            );
            const className =
              'group flex h-full flex-col rounded-2xl border border-forest/10 bg-white p-6 shadow-sm transition-shadow hover:shadow-lg';
            return (
              <li key={item.title}>
                {item.href ? (
                  <SmartLink href={item.href} className={className}>
                    {body}
                  </SmartLink>
                ) : (
                  <div className={className}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function PanelImage({ data, media }: { data: SectionDataMap['imageText']; media: MediaMap }) {
  const image = media[data.imageId];
  if (!image) return <div className="h-64 w-full bg-sand lg:h-full" />;
  return (
    <ResponsiveImage
      image={image}
      sizes="(min-width: 1024px) 40rem, 100vw"
      className="h-64 w-full lg:h-full"
    />
  );
}

function SupportPanels({
  panels,
  media,
}: {
  panels: SectionDataMap['imageText'][];
  media: MediaMap;
}) {
  const [accompaniment, matching] = panels;
  if (!accompaniment) return null;
  return (
    <section className={cn(container, 'space-y-6 py-16 lg:py-24')}>
      <article className="grid overflow-hidden rounded-3xl bg-forest text-white lg:grid-cols-2">
        <PanelImage data={accompaniment} media={media} />
        <div className="p-8 sm:p-12">
          <h2 className="text-3xl font-extrabold sm:text-4xl">{accompaniment.title}</h2>
          <ul className="mt-6 space-y-3">
            {accompaniment.paragraphs.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <Check aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-sprout" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
          {accompaniment.link && (
            <SmartLink
              href={accompaniment.link.href}
              className={buttonClassName('secondary', 'mt-8')}
            >
              {accompaniment.link.label}
              <ArrowRight aria-hidden="true" className="size-4" />
            </SmartLink>
          )}
        </div>
      </article>
      {matching && (
        <article className="grid overflow-hidden rounded-3xl border border-forest/10 bg-white lg:grid-cols-2">
          <div className="order-2 p-8 sm:p-12 lg:order-1">
            <h2 className="text-3xl font-extrabold sm:text-4xl">{matching.title}</h2>
            {matching.paragraphs.map((paragraph) => (
              <p key={paragraph} className="mt-4 text-lg text-charcoal/75">
                {paragraph}
              </p>
            ))}
            {matching.link && (
              <SmartLink href={matching.link.href} className={buttonClassName('primary', 'mt-8')}>
                {matching.link.label}
                <ArrowRight aria-hidden="true" className="size-4" />
              </SmartLink>
            )}
          </div>
          <div className="order-1 lg:order-2">
            <PanelImage data={matching} media={media} />
          </div>
        </article>
      )}
    </section>
  );
}

function FinalCall({ data }: { data: SectionDataMap['callToAction'] }) {
  return (
    <section className="relative isolate overflow-hidden bg-forest text-white">
      <Photo
        photo={homePhotos.final}
        sizes="100vw"
        className="absolute inset-0 -z-20 h-full w-full"
      />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-forest/70" />
      <div className={cn(container, 'py-20 text-center lg:py-28')}>
        <h2 className="mx-auto max-w-3xl text-3xl font-extrabold sm:text-5xl">{data.title}</h2>
        {data.text && <p className="mx-auto mt-4 max-w-xl text-lg text-white/90">{data.text}</p>}
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <SmartLink href={data.link.href} className={buttonClassName('sprout')}>
            {data.link.label}
          </SmartLink>
          <Link to="/contact" className={buttonClassName('secondary')}>
            Nous contacter
          </Link>
        </div>
      </div>
    </section>
  );
}

function readAll<K extends keyof SectionDataMap>(
  sections: readonly PageSection[],
  type: K,
): SectionDataMap[K][] {
  return sections.flatMap((section) => {
    if (section.type !== type) return [];
    const data = readSectionData(type, section.data);
    return data ? [data] : [];
  });
}

/** Vitrine d'accueil : tous les textes, images et produits proviennent du CMS et du catalogue. */
export function HomeShowcase({
  sections,
  media,
}: {
  sections: readonly PageSection[];
  media: MediaMap;
}) {
  const hero = readAll(sections, 'hero')[0];
  const cards = readAll(sections, 'cards');
  const advantages = cards.find((item) => item.title === 'Nos engagements');
  const services = cards.find((item) => item.title !== 'Nos engagements');
  const featured = readAll(sections, 'featuredProducts')[0];
  const teaser = readAll(sections, 'richText')[0] ?? null;
  const finalCall = readAll(sections, 'callToAction')[0];
  return (
    <>
      <Hero data={hero ?? fallbackHero} media={media} />
      {advantages && <Advantages data={advantages} />}
      <CatalogTeaser data={teaser} />
      {featured && <FeaturedProductsSection data={featured} />}
      {services && <ServiceCards data={services} />}
      <SupportPanels panels={readAll(sections, 'imageText')} media={media} />
      {finalCall && <FinalCall data={finalCall} />}
    </>
  );
}
