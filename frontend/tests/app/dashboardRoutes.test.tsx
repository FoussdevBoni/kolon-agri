import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routes } from '../../src/app/router';
import type * as SessionServiceModule from '../../src/core/auth/sessionService';
import { fetchSessionState } from '../../src/core/auth/sessionService';
import { buildSession } from '../helpers/sessionFixtures';

vi.mock('../../src/core/auth/sessionService', async (importOriginal) => {
  const original = await importOriginal<typeof SessionServiceModule>();
  return { ...original, fetchSessionState: vi.fn() };
});

const PAGE_ID = '0123456789abcdef01234567';
const now = '2026-11-07T10:00:00.000Z';

const product = {
  id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
  slug: 'semence-mais',
  name: 'Semence de maïs',
  shortDescription: '',
  category: null,
  image: null,
  priceFrom: 12500,
  availability: 'available',
  featured: false,
  status: 'published',
  variantsCount: 2,
  updatedAt: now,
};

const pageDraft = {
  id: PAGE_ID,
  key: 'about',
  title: 'À propos',
  path: '/a-propos',
  status: 'draft',
  hasUnpublishedChanges: true,
  draftUpdatedAt: now,
  publishedAt: null,
  allowedSectionTypes: ['hero', 'richText'],
  draft: {
    revision: 1,
    sections: [
      {
        id: '11111111-1111-4111-8111-111111111111',
        type: 'hero',
        version: 1,
        data: {
          eyebrow: '',
          title: 'Notre histoire',
          subtitle: '',
          imageId: null,
          primaryLink: null,
          secondaryLink: null,
        },
      },
    ],
    seo: { title: '', description: '', imageId: null },
  },
  media: {},
  publishedRevision: null,
  versions: [],
};

/** Réponses d'API réalistes : les écrans affichent leurs données (dont la pagination). */
function apiResponse(url: URL): unknown {
  const path = url.pathname.replace('/api/v1', '');
  if (path === '/products')
    return { data: [product], meta: { page: 1, limit: 20, total: 21, totalPages: 2 } };
  if (path === '/categories') return { data: [] };
  if (path === '/media') return { data: [], meta: { page: 1, limit: 24, total: 0, totalPages: 1 } };
  if (path === `/pages/${PAGE_ID}/draft`) return { data: pageDraft };
  throw new Error(`Appel inattendu : ${path}`);
}

function renderAt(url: string) {
  const router = createMemoryRouter(routes, { initialEntries: [url] });
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

describe('écrans du dashboard (non-régression des modules partagés)', () => {
  beforeEach(() => {
    vi.mocked(fetchSessionState).mockResolvedValue({
      status: 'authenticated',
      session: buildSession('admin'),
    });
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = new URL(
          input instanceof Request ? input.url : input.toString(),
          'http://localhost',
        );
        const body = { success: true, ...(apiResponse(url) as object) };
        return Promise.resolve(
          new Response(JSON.stringify(body), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }),
    );
  });

  it('affiche la liste des produits avec sa pagination', async () => {
    const router = renderAt('/dashboard/products');
    const table = await screen.findByRole(
      'table',
      { name: 'Liste des produits' },
      { timeout: 3000 },
    );
    expect(within(table).getByText('Semence de maïs')).toBeInTheDocument();
    const pagination = screen.getByRole('navigation', { name: 'Pagination' });
    expect(within(pagination).getByText(/21 produits · page 1 sur 2/)).toBeInTheDocument();
    expect(router.state.errors).toBeNull();
  });

  it('affiche le formulaire de création de service avec son champ image', async () => {
    const router = renderAt('/dashboard/services/nouveau');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Nouveau service' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choisir une image' })).toBeInTheDocument();
    expect(router.state.errors).toBeNull();
  });

  it('affiche l’éditeur de page avec ses sections et la publication', async () => {
    const router = renderAt(`/dashboard/pages/${PAGE_ID}`);
    expect(await screen.findByRole('heading', { level: 1, name: 'À propos' })).toBeInTheDocument();
    expect(screen.getByText('Notre histoire')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publier le brouillon' })).toBeEnabled();
    expect(screen.queryByText('Cette page ne peut pas s’afficher')).toBeNull();
    expect(router.state.errors).toBeNull();
  });
});
