import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { SectionRenderer } from '../../src/modules/pages/components/SectionRenderer';
import type { PageSection } from '../../src/modules/pages/schemas/pageSchema';

function renderSections(sections: PageSection[]) {
  const router = createMemoryRouter(
    [{ path: '/', element: <SectionRenderer sections={sections} media={{}} /> }],
    { initialEntries: ['/'] },
  );
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('SectionRenderer', () => {
  it('rend les sections typées avec un seul titre h1 et des liens internes', () => {
    renderSections([
      {
        id: 'a',
        type: 'hero',
        data: {
          eyebrow: 'Agriculture',
          title: 'Bienvenue',
          subtitle: '',
          imageId: null,
          primaryLink: { label: 'Catalogue', href: '/catalogue' },
          secondaryLink: null,
        },
      },
      {
        id: 'b',
        type: 'cards',
        data: {
          title: 'Nos offres',
          intro: '',
          items: [{ title: 'Semences', description: 'Locales', href: '/catalogue' }],
        },
      },
    ]);

    expect(screen.getByRole('heading', { level: 1, name: 'Bienvenue' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Catalogue' })).toHaveAttribute('href', '/catalogue');
    expect(screen.getByText('Semences')).toBeInTheDocument();
  });

  it('affiche le texte saisi tel quel, sans interpréter de HTML', () => {
    renderSections([
      {
        id: 'c',
        type: 'richText',
        data: { title: '', paragraphs: ['<img src=x onerror=alert(1)> Bonjour'] },
      },
    ]);
    expect(screen.getByText('<img src=x onerror=alert(1)> Bonjour')).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
  });

  it('ignore une section dont les données ne respectent pas le schéma', () => {
    renderSections([
      { id: 'd', type: 'callToAction', data: { title: 'Sans lien' } },
      {
        id: 'e',
        type: 'faq',
        data: { title: 'FAQ', items: [{ question: 'Livrez-vous ?', answer: 'Oui.' }] },
      },
    ]);
    expect(screen.queryByText('Sans lien')).toBeNull();
    expect(screen.getByText('Livrez-vous ?')).toBeInTheDocument();
  });
});
