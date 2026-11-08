import { ArrowRight, ChevronDown, Mail, MapPin, Phone, Clock, MessageCircle } from 'lucide-react';
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
      {title && <h2 className="text-3xl font-bold text-forest">{title}</h2>}
      {intro && <p className="mt-3 text-lg text-charcoal/75">{intro}</p>}
    </div>
  );
}

export function HeroSection({
  data,
  media,
  headingLevel,
}: {
  data: SectionDataMap['hero'];
  media: MediaMap;
  headingLevel: 'h1' | 'h2';
}) {
  const Heading = headingLevel;
  const image = data.imageId ? media[data.imageId] : undefined;
  return (
    <section className="relative overflow-hidden bg-forest text-ivory">
      {image && (
        <>
          <ResponsiveImage
            image={image}
            sizes="100vw"
            priority
            className="absolute inset-0 h-full w-full"
          />
          <div aria-hidden="true" className="absolute inset-0 bg-forest/80" />
        </>
      )}
      <div className={cn(container, 'relative py-20 sm:py-28')}>
        {data.eyebrow && (
          <p className="text-sm font-semibold tracking-wide text-sand uppercase">{data.eyebrow}</p>
        )}
        <Heading className="mt-3 max-w-3xl text-4xl font-extrabold sm:text-6xl">
          {data.title}
        </Heading>
        {data.subtitle && <p className="mt-6 max-w-2xl text-lg text-ivory/85">{data.subtitle}</p>}
        {(data.primaryLink ?? data.secondaryLink) && (
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            {data.primaryLink && (
              <SmartLink href={data.primaryLink.href} className={buttonClassName('accent')}>
                {data.primaryLink.label}
              </SmartLink>
            )}
            {data.secondaryLink && (
              <SmartLink
                href={data.secondaryLink.href}
                className={buttonClassName('ghost', 'text-ivory hover:bg-ivory/10')}
              >
                {data.secondaryLink.label}
                <ArrowRight aria-hidden="true" className="size-4" />
              </SmartLink>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export function RichTextSection({ data }: { data: SectionDataMap['richText'] }) {
  return (
    <section className={cn(container, 'py-14')}>
      <div className="max-w-3xl space-y-4">
        {data.title && <h2 className="text-3xl font-bold text-forest">{data.title}</h2>}
        {data.paragraphs.map((paragraph, index) => (
          <p key={index} className="text-lg whitespace-pre-line text-charcoal/80">
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}

export function CardsSection({ data }: { data: SectionDataMap['cards'] }) {
  return (
    <section className={cn(container, 'py-16')}>
      <SectionHeading title={data.title} intro={data.intro} />
      <ul className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {data.items.map((item, index) => {
          const content = (
            <>
              <h3 className="text-xl font-bold">{item.title}</h3>
              {item.description && (
                <p className="mt-2 flex-1 text-charcoal/75">{item.description}</p>
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
          const className =
            'group flex h-full flex-col rounded-2xl border border-forest/10 bg-white p-6';
          return (
            <li key={index}>
              {item.href ? (
                <SmartLink
                  href={item.href}
                  className={cn(className, 'transition-shadow hover:shadow-md')}
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
    <section className={cn(container, 'grid items-center gap-10 py-16 lg:grid-cols-2')}>
      <div className={cn(data.imagePosition === 'left' && 'lg:order-2')}>
        <h2 className="text-3xl font-bold text-forest">{data.title}</h2>
        <div className="mt-4 space-y-4">
          {data.paragraphs.map((paragraph, index) => (
            <p key={index} className="text-lg whitespace-pre-line text-charcoal/80">
              {paragraph}
            </p>
          ))}
        </div>
        {data.link && (
          <SmartLink href={data.link.href} className={buttonClassName('primary', 'mt-8')}>
            {data.link.label}
          </SmartLink>
        )}
      </div>
      {image && (
        <ResponsiveImage
          image={image}
          sizes="(min-width: 1024px) 50vw, 100vw"
          className={cn(
            'aspect-[4/3] w-full rounded-2xl',
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
      <div className="flex flex-col items-start gap-6 rounded-2xl bg-sand/60 p-8 sm:p-12 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold text-forest sm:text-3xl">{data.title}</h2>
          {data.text && <p className="mt-2 text-charcoal/75">{data.text}</p>}
        </div>
        <SmartLink href={data.link.href} className={buttonClassName('primary', 'shrink-0')}>
          {data.link.label}
        </SmartLink>
      </div>
    </section>
  );
}

export function FaqSection({ data }: { data: SectionDataMap['faq'] }) {
  return (
    <section className={cn(container, 'py-16')}>
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
          <ul className="grid gap-6 lg:grid-cols-2">
            {services.data.map((service) => (
              <li key={service.id} id={service.slug} className="scroll-mt-24">
                <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-forest/10 bg-white">
                  {service.image && (
                    <ResponsiveImage
                      image={service.image}
                      sizes="(min-width: 1024px) 50vw, 100vw"
                      className="aspect-[16/9] w-full"
                    />
                  )}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-forest">{service.title}</h3>
                    {service.summary && (
                      <p className="mt-2 font-medium text-charcoal/80">{service.summary}</p>
                    )}
                    <div className="mt-4 space-y-3 text-charcoal/75">
                      {service.paragraphs.map((paragraph, index) => (
                        <p key={index} className="whitespace-pre-line">
                          {paragraph}
                        </p>
                      ))}
                    </div>
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
            className="flex gap-3 rounded-2xl border border-forest/10 bg-white p-5"
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
