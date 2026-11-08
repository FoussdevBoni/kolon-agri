import type { ReactNode } from 'react';

interface PublicPageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}

export function PublicPageHeader({ eyebrow, title, description, children }: PublicPageHeaderProps) {
  return (
    <section className="border-b border-forest/10 bg-sand/40">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        {eyebrow && (
          <p className="text-sm font-semibold tracking-wide text-leaf uppercase">{eyebrow}</p>
        )}
        <h1 className="mt-2 max-w-3xl text-4xl font-extrabold text-forest sm:text-5xl">{title}</h1>
        {description && <p className="mt-4 max-w-2xl text-lg text-charcoal/75">{description}</p>}
        {children}
      </div>
    </section>
  );
}
