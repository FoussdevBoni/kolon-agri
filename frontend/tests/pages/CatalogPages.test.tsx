import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../src/core/api/apiError';
import { fetchPublicCategories } from '../../src/modules/categories/services/categoryService';
import { fetchPublishedPage } from '../../src/modules/pages/services/pageService';
import type {
  ProductListItem,
  PublicProduct,
} from '../../src/modules/products/schemas/productSchema';
import {
  fetchPublicProduct,
  fetchPublicProducts,
} from '../../src/modules/products/services/productService';
import { CatalogPage } from '../../src/pages/public/CatalogPage';
import { ProductPage } from '../../src/pages/public/ProductPage';

vi.mock('../../src/modules/products/services/productService', () => ({
  fetchPublicProducts: vi.fn(),
  fetchPublicProduct: vi.fn(),
}));
vi.mock('../../src/modules/categories/services/categoryService', () => ({
  fetchPublicCategories: vi.fn(),
}));
vi.mock('../../src/modules/pages/services/pageService', () => ({
  fetchPublishedPage: vi.fn(),
}));

const notFound = new ApiError({ status: 404, code: 'NOT_FOUND', message: 'Introuvable' });
const meta = { page: 1, limit: 12, total: 1, totalPages: 1 };

const item: ProductListItem = {
  id: 'p1',
  slug: 'semence-mais',
  name: 'Semence de maïs',
  shortDescription: 'Variété précoce',
  category: { id: 'c1', name: 'Semences', slug: 'semences' },
  image: null,
  priceFrom: 12500,
  availability: 'available',
  featured: false,
};

const product: PublicProduct = {
  ...item,
  description: 'Description complète.',
  characteristics: [{ label: 'Cycle', value: '90 jours' }],
  images: [],
  variants: [
    {
      id: 'v1',
      label: 'Sac 5 kg',
      sku: null,
      unit: 'sac',
      packaging: null,
      indicativePrice: 12500,
      priceOnRequest: false,
      availability: 'available',
    },
    {
      id: 'v2',
      label: 'Sac 50 kg',
      sku: null,
      unit: 'sac',
      packaging: null,
      indicativePrice: null,
      priceOnRequest: true,
      availability: 'onRequest',
    },
  ],
  seo: { title: '', description: '' },
  publishedAt: '2026-11-01T00:00:00.000Z',
};

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/catalogue', element: <CatalogPage /> },
      { path: '/catalogue/:slug', element: <ProductPage /> },
    ],
    { initialEntries: [path] },
  );
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('catalogue public', () => {
  beforeEach(() => {
    vi.mocked(fetchPublishedPage).mockRejectedValue(notFound);
    vi.mocked(fetchPublicCategories).mockResolvedValue([]);
  });

  it('affiche les produits publiés avec leur prix indicatif', async () => {
    vi.mocked(fetchPublicProducts).mockResolvedValue({ items: [item], meta });
    renderAt('/catalogue');

    expect(await screen.findByText('Semence de maïs')).toBeInTheDocument();
    expect(screen.getByText(/À partir de 12\s500 FCFA/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Semence de maïs/ })).toHaveAttribute(
      'href',
      '/catalogue/semence-mais',
    );
  });

  it('transmet les filtres de l’URL et signale l’absence de résultat', async () => {
    vi.mocked(fetchPublicProducts).mockResolvedValue({ items: [], meta: { ...meta, total: 0 } });
    renderAt('/catalogue?recherche=mil&categorie=semences');

    expect(
      await screen.findByText('Aucun produit ne correspond à votre recherche'),
    ).toBeInTheDocument();
    expect(vi.mocked(fetchPublicProducts).mock.calls[0]?.[0]).toMatchObject({
      search: 'mil',
      category: 'semences',
      page: 1,
    });
  });

  it('affiche une erreur récupérable', async () => {
    vi.mocked(fetchPublicProducts).mockRejectedValue(
      new ApiError({ status: 503, code: 'SERVICE_UNAVAILABLE', message: 'Service indisponible.' }),
    );
    renderAt('/catalogue');
    expect(await screen.findByText('Service indisponible.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument();
  });
});

describe('fiche produit', () => {
  it('affiche les variantes, dont le prix sur demande', async () => {
    vi.mocked(fetchPublicProduct).mockResolvedValue(product);
    renderAt('/catalogue/semence-mais');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Semence de maïs' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Sac 50 kg')).toBeInTheDocument();
    expect(screen.getAllByText('Prix sur demande').length).toBeGreaterThan(0);
    expect(screen.getByText('90 jours')).toBeInTheDocument();
  });

  it('redirige une ancienne adresse vers l’URL canonique', async () => {
    vi.mocked(fetchPublicProduct).mockResolvedValue(product);
    const router = renderAt('/catalogue/ancien-slug');
    await screen.findByRole('heading', { level: 1, name: 'Semence de maïs' });
    expect(router.state.location.pathname).toBe('/catalogue/semence-mais');
  });

  it('affiche un état « introuvable » pour un produit non publié', async () => {
    vi.mocked(fetchPublicProduct).mockRejectedValue(notFound);
    renderAt('/catalogue/brouillon');
    expect(await screen.findByText('Produit introuvable')).toBeInTheDocument();
  });
});
