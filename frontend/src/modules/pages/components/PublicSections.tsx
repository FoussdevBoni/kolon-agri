import {
  ArrowRight,
  Check,
  ChevronDown,
  Mail,
  MapPin,
  Phone,
  Clock,
  MessageCircle,
} from 'lucide-react';
import { Link } from 'react-router';
import { getErrorMessage } from '../../../core/api/apiError';
import { buttonClassName } from '../../../core/components/buttonStyles';
import { ErrorState } from '../../../core/components/ErrorState';
import { LoadingState } from '../../../core/components/LoadingState';
import { ResponsiveImage } from '../../../core/components/ResponsiveImage';
import { SmartLink } from '../../../core/components/SmartLink';
import { cn } from '../../../core/utils/cn';
import type { MediaSummary } from '../../media/schemas/mediaSchema';
import { ProductCard } from '../../products/components/ProductCard';
import { usePublicProducts } from '../../products/hooks/useProducts';
import { usePublicServices } from '../../services/hooks/useServices';
import type { SectionDataMap } from '../schemas/sectionSchema';

type MediaMap = Record<string, MediaSummary>;
const container = 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8';

function SectionHeading({ title, intro }: { title: string; intro?: string }) {
  if (!title && !intro) return null;
  return (
    <div className="max-w-3xl">
      {title && <h2 className="text-3xl font-extrabold sm:text-4xl">{title}</h2>}
      {intro && <p className="mt-3 text-lg text-charcoal/75">{intro}</p>}
    </div>
  );
}

export type HeroVariant = 'band' | 'split' | 'compact';

function HeroLinks({ data }: { data: SectionDataMap['hero'] }) {
  if (!data.primaryLink && !data.secondaryLink) return null;
  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
      {data.primaryLink && (
        <SmartLink href={data.primaryLink.href} className={buttonClassName('sprout')}>
          {data.primaryLink.label}
        </SmartLink>
      )}
      {data.secondaryLink && (
        <SmartLink href={data.secondaryLink.href} className={buttonClassName('secondary')}>
          {data.secondaryLink.label}
          <ArrowRight aria-hidden="true" className="size-4" />
        </SmartLink>
      )}
    </div>
  );
}

export function HeroSection({
  data,
  media,
  headingLevel,
  variant = 'band',
}: {
  data: SectionDataMap['hero'];
  media: MediaMap;
  headingLevel: 'h1' | 'h2';
  variant?: HeroVariant;
}) {
  const Heading = headingLevel;
  const image = data.imageId ? media[data.imageId] : undefined;

  if (variant === 'split') {
    return (
      <section className="border-b border-forest/10 bg-white">
        <div className={cn(container, 'grid items-center gap-10 py-14 lg:grid-cols-2 lg:py-20')}>
          <div>
            {data.eyebrow && (
              <p className="text-sm font-bold tracking-widest text-leaf uppercase">
                {data.eyebrow}
              </p>
            )}
            <Heading className="mt-3 text-4xl font-extrabold text-forest sm:text-5xl">
              {data.title}
            </Heading>
            {data.subtitle && <p className="mt-5 text-xl text-charcoal/80">{data.subtitle}</p>}
            <HeroLinks data={data} />
          </div>
          {image && (
            <ResponsiveImage
              image={image}
              sizes="(min-width: 1024px) 40rem, 100vw"
              priority
              className="aspect-[4/3] w-full rounded-3xl"
            />
          )}
        </div>
      </section>
    );
  }

  const compact = variant === 'compact';
  return (
    <section className="relative isolate overflow-hidden bg-forest text-white">
      {image && (
        <>
          <ResponsiveImage
            image={image}
            sizes="100vw"
            priority
            className="absolute inset-0 -z-20 h-full w-full"
          />
          <div
            aria-hidden="true"
            className={cn('absolute inset-0 -z-10', compact ? 'bg-forest/85' : 'bg-forest/70')}
          />
        </>
      )}
      <div className={cn(container, compact ? 'py-12 sm:py-16' : 'py-20 sm:py-28')}>
        {data.eyebrow && (
          <p className="text-sm font-bold tracking-widest text-sprout uppercase">{data.eyebrow}</p>
        )}
        <Heading
          className={cn(
            'mt-3 max-w-3xl font-extrabold',
            compact ? 'text-3xl sm:text-4xl' : 'text-4xl sm:text-5xl lg:text-6xl',
          )}
        >
          {data.title}
        </Heading>
        {data.subtitle && <p className="mt-5 max-w-2xl text-lg text-white/90">{data.subtitle}</p>}
        <HeroLinks data={data} />
      </div>
    </section>
  );
}

export function RichTextSection({
  data,
  notice = false,
}: {
  data: SectionDataMap['richText'];
  notice?: boolean;
}) {
  if (notice) {
    return (
      <p className={cn(container, 'pt-8 text-sm text-charcoal/75')}>
        {data.title && <strong className="font-semibold text-forest">{data.title} : </strong>}
        {data.paragraphs.join(' ')}
      </p>
    );
  }
  return (
    <section className={cn(container, 'grid gap-6 py-14 lg:grid-cols-[1fr_2fr] lg:py-20')}>
      {data.title && <h2 className="text-3xl font-extrabold sm:text-4xl">{data.title}</h2>}
      <div className={cn('space-y-4', !data.title && 'lg:col-span-2')}>
        {data.paragraphs.map((paragraph, index) => (
          <p key={index} className="text-lg whitespace-pre-line text-charcoal/80">
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}

function StepsSection({ data }: { data: SectionDataMap['cards'] }) {
  return (
    <section className="bg-forest text-white">
      <div className={cn(container, 'py-16 lg:py-20')}>
        <h2 className="text-3xl font-extrabold sm:text-4xl">{data.title}</h2>
        {data.intro && <p className="mt-3 max-w-2xl text-lg text-white/85">{data.intro}</p>}
        <ol className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {data.items.map((item, index) => (
            <li key={item.title}>
              <span className="flex size-12 items-center justify-center rounded-full bg-sprout font-display text-lg font-extrabold text-charcoal">
                {index + 1}
              </span>
              <h3 className="mt-4 text-xl font-bold">{item.title}</h3>
              {item.description && <p className="mt-2 text-white/80">{item.description}</p>}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ChipsSection({ data }: { data: SectionDataMap['cards'] }) {
  return (
    <section className={cn(container, 'py-16')}>
      <SectionHeading title={data.title} intro={data.intro} />
      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.items.map((item) => (
          <li
            key={item.title}
            className="flex items-center gap-3 rounded-xl border border-forest/10 bg-white px-4 py-4 font-semibold"
          >
            <Check aria-hidden="true" className="size-5 shrink-0 text-leaf" />
            {item.title}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CardsSection({ data }: { data: SectionDataMap['cards'] }) {
  if (/comment ça marche/i.test(data.title)) return <StepsSection data={data} />;
  if (data.items.every((item) => !item.description)) return <ChipsSection data={data} />;
  const count = data.items.length;
  const highlighted = count === 2;
  return (
    <section className={cn(container, 'py-16 lg:py-20')}>
      <SectionHeading title={data.title} intro={data.intro} />
      <ul
        className={cn(
          'mt-10 grid gap-5',
          count === 2 && 'md:grid-cols-2',
          count === 3 && 'md:grid-cols-3',
          count >= 4 && 'md:grid-cols-2 lg:grid-cols-4',
        )}
      >
        {data.items.map((item) => {
          const content = (
            <>
              <h3 className={cn('font-bold', highlighted ? 'text-2xl' : 'text-xl')}>
                {item.title}
              </h3>
              {item.description && (
                <p
                  className={cn(
                    'mt-3 flex-1',
                    highlighted ? 'text-lg text-white/85' : 'text-charcoal/75',
                  )}
                >
                  {item.description}
                </p>
              )}
              {item.href && (
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-forest">
                  En savoir plus
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 transition-transform group-hover:translate-x-1"
                  />
                </span>
              )}
            </>
          );
          const className = cn(
            'group flex h-full flex-col rounded-2xl p-7 shadow-sm',
            highlighted ? 'bg-forest text-white' : 'border border-forest/10 bg-white',
          );
          return (
            <li key={item.title}>
              {item.href ? (
                <SmartLink
                  href={item.href}
                  className={cn(className, 'transition-shadow hover:shadow-lg')}
                >
                  {content}
                </SmartLink>
              ) : (
                <div className={className}>{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function ImageTextSection({
  data,
  media,
}: {
  data: SectionDataMap['imageText'];
  media: MediaMap;
}) {
  const image = media[data.imageId];
  return (
    <section className={cn(container, 'grid items-center gap-10 py-16 lg:grid-cols-2 lg:py-20')}>
      <div className={cn(data.imagePosition === 'left' && 'lg:order-2')}>
        <h2 className="text-3xl font-extrabold sm:text-4xl">{data.title}</h2>
        <div className="mt-5 space-y-4">
          {data.paragraphs.map((paragraph, index) => (
            <p key={index} className="text-lg whitespace-pre-line text-charcoal/80">
              {paragraph}
            </p>
          ))}
        </div>
        {data.link && (
          <SmartLink href={data.link.href} className={buttonClassName('primary', 'mt-8')}>
            {data.link.label}
            <ArrowRight aria-hidden="true" className="size-4" />
          </SmartLink>
        )}
      </div>
      {image && (
        <ResponsiveImage
          image={image}
          sizes="(min-width: 1024px) 40rem, 100vw"
          className={cn(
            'aspect-[4/3] w-full rounded-3xl',
            data.imagePosition === 'left' && 'lg:order-1',
          )}
        />
      )}
    </section>
  );
}

export function CallToActionSection({ data }: { data: SectionDataMap['callToAction'] }) {
  return (
    <section className={cn(container, 'py-16')}>
      <div className="flex flex-col items-start gap-6 rounded-3xl bg-forest p-8 text-white sm:p-12 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-extrabold sm:text-3xl">{data.title}</h2>
          {data.text && <p className="mt-2 text-white/85">{data.text}</p>}
        </div>
        <SmartLink href={data.link.href} className={buttonClassName('sprout', 'shrink-0')}>
          {data.link.label}
          <ArrowRight aria-hidden="true" className="size-4" />
        </SmartLink>
      </div>
    </section>
  );
}

export function FaqSection({
  data,
  embedded = false,
}: {
  data: SectionDataMap['faq'];
  embedded?: boolean;
}) {
  return (
    <section className={cn(!embedded && cn(container, 'py-16 lg:py-20'))}>
      <SectionHeading title={data.title || 'Questions fréquentes'} />
      <div className="mt-8 max-w-3xl divide-y divide-forest/10 rounded-2xl border border-forest/10 bg-white">
        {data.items.map((item, index) => (
          <details key={index} className="group p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
              {item.question}
              <ChevronDown
                aria-hidden="true"
                className="size-5 shrink-0 transition-transform group-open:rotate-180"
              />
            </summary>
            <p className="mt-3 whitespace-pre-line text-charcoal/80">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function FeaturedProductsSection({ data }: { data: SectionDataMap['featuredProducts'] }) {
  const products = usePublicProducts({
    page: 1,
    search: '',
    category: '',
    sort: 'newest',
    featured: true,
    limit: data.limit,
  });
  if (products.isSuccess && products.data.items.length === 0) return null;
  return (
    <section className={cn(container, 'py-16')}>
      <SectionHeading title={data.title} intro={data.intro} />
      <div className="mt-8">
        {products.isPending ? (
          <LoadingState label="Chargement des produits…" />
        ) : products.isError ? (
          <ErrorState
            message={getErrorMessage(products.error)}
            onRetry={() => void products.refetch()}
          />
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.data.items.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function serviceTarget(slug: string): string {
  if (slug.includes('accompagnement')) return '/accompagnement';
  if (slug.includes('relation')) return '/mise-en-relation';
  return '/catalogue';
}

function serviceCta(slug: string): string {
  if (slug.includes('accompagnement')) return 'Présenter mon projet';
  if (slug.includes('relation')) return 'Trouver un partenaire';
  return 'Voir le catalogue';
}

export function ServicesListSection({ data }: { data: SectionDataMap['servicesList'] }) {
  const services = usePublicServices();
  return (
    <section className={cn(container, 'py-16')}>
      <SectionHeading title={data.title} intro={data.intro} />
      <div className="mt-8">
        {services.isPending ? (
          <LoadingState label="Chargement des services…" />
        ) : services.isError ? (
          <ErrorState
            message={getErrorMessage(services.error)}
            onRetry={() => void services.refetch()}
          />
        ) : services.data.length === 0 ? (
          <p className="text-charcoal/70">Les services seront présentés prochainement.</p>
        ) : (
          <ul className="space-y-14 lg:space-y-20">
            {services.data.map((service, index) => (
              <li key={service.id} id={service.slug} className="scroll-mt-24">
                <article className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
                  {service.image && (
                    <ResponsiveImage
                      image={service.image}
                      sizes="(min-width: 1024px) 40rem, 100vw"
                      className={cn(
                        'aspect-[4/3] w-full rounded-3xl',
                        index % 2 === 1 && 'lg:order-2',
                      )}
                    />
                  )}
                  <div>
                    <p className="font-display text-sm font-bold tracking-widest text-leaf uppercase">
                      Service {index + 1}
                    </p>
                    <h2 className="mt-2 text-3xl font-extrabold">{service.title}</h2>
                    {service.summary && (
                      <p className="mt-3 text-xl text-charcoal/85">{service.summary}</p>
                    )}
                    <div className="mt-4 space-y-3 text-lg text-charcoal/75">
                      {service.paragraphs.map((paragraph, paragraphIndex) => (
                        <p key={paragraphIndex} className="whitespace-pre-line">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                    <Link
                      to={serviceTarget(service.slug)}
                      className={buttonClassName('primary', 'mt-7')}
                    >
                      {serviceCta(service.slug)}
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </Link>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function ContactInfoSection({ data }: { data: SectionDataMap['contactInfo'] }) {
  const items = [
    {
      icon: Phone,
      label: 'Téléphone',
      value: data.phone,
      href: data.phone ? `tel:${data.phone.replace(/\s/g, '')}` : null,
    },
    { icon: MessageCircle, label: 'WhatsApp', value: data.whatsapp, href: null },
    {
      icon: Mail,
      label: 'Email',
      value: data.email,
      href: data.email ? `mailto:${data.email}` : null,
    },
    { icon: MapPin, label: 'Adresse', value: data.address, href: null },
    { icon: Clock, label: 'Horaires', value: data.hours, href: null },
  ].filter((item) => item.value);
  if (items.length === 0) return null;
  return (
    <section className={cn(container, 'py-16')}>
      <SectionHeading title={data.title || 'Coordonnées'} />
      <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex gap-3 rounded-2xl border border-forest/10 bg-white p-5 shadow-sm"
          >
            <item.icon aria-hidden="true" className="size-5 shrink-0 text-leaf" />
            <div>
              <dt className="text-sm font-semibold">{item.label}</dt>
              <dd className="mt-1 whitespace-pre-line text-charcoal/80">
                {item.href ? (
                  <a href={item.href} className="hover:text-forest hover:underline">
                    {item.value}
                  </a>
                ) : (
                  item.value
                )}
              </dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}
