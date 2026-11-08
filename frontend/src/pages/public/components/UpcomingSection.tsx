import { EmptyState } from '../../../core/components/EmptyState';

/** Emplacement structurel en attente du contenu métier des lots suivants. */
export function UpcomingSection({ title, description }: { title: string; description?: string }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <EmptyState title={title} description={description} />
    </section>
  );
}
