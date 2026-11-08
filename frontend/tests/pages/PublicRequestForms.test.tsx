import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../src/core/api/apiError';
import { AccompanimentForm } from '../../src/modules/accompanimentRequests/components/AccompanimentForm';
import { submitAccompaniment } from '../../src/modules/accompanimentRequests/services/accompanimentService';
import type { PublicProduct } from '../../src/modules/products/schemas/productSchema';
import { fetchPublicProduct } from '../../src/modules/products/services/productService';
import { quotationCart } from '../../src/modules/quotations/cart/quotationCartStore';
import { QuotationRequest } from '../../src/modules/quotations/components/QuotationRequest';
import { submitQuotation } from '../../src/modules/quotations/services/quotationService';
import type * as QuotationServiceModule from '../../src/modules/quotations/services/quotationService';

vi.mock('../../src/modules/accompanimentRequests/services/accompanimentService', () => ({
  submitAccompaniment: vi.fn(),
}));
vi.mock('../../src/modules/products/services/productService', () => ({
  fetchPublicProduct: vi.fn(),
}));
vi.mock('../../src/modules/quotations/services/quotationService', async (importOriginal) => {
  const original = await importOriginal<typeof QuotationServiceModule>();
  return { ...original, submitQuotation: vi.fn() };
});

const PRODUCT_ID = '0123456789abcdef01234567';
const VARIANT_ID = '0123456789abcdef01234568';

const product: PublicProduct = {
  id: PRODUCT_ID,
  slug: 'semence-mais',
  name: 'Semence de maïs',
  shortDescription: '',
  category: null,
  image: null,
  priceFrom: 12500,
  availability: 'available',
  featured: false,
  description: '',
  characteristics: [],
  images: [],
  variants: [
    {
      id: VARIANT_ID,
      label: 'Sac 5 kg',
      sku: null,
      unit: 'sac',
      packaging: null,
      indicativePrice: 12500,
      priceOnRequest: false,
      availability: 'available',
    },
  ],
  seo: { title: '', description: '' },
  publishedAt: null,
};

function renderInRouter(element: React.ReactNode) {
  const router = createMemoryRouter([
    { path: '/', element },
    { path: '*', element: <p>Autre page</p> },
  ]);
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

async function fillContact() {
  await userEvent.type(screen.getByLabelText(/Nom et prénom/), 'Awa Traoré');
  await userEvent.type(screen.getByLabelText('Téléphone'), '+223 70 00 00 00');
  await userEvent.type(screen.getByLabelText(/Localité|Lieu du projet/), 'Ségou');
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  quotationCart.reload();
});

describe('demande de devis', () => {
  it('envoie les lignes du panier sans prix, puis affiche la référence et vide le panier', async () => {
    quotationCart.add(PRODUCT_ID, VARIANT_ID, 3);
    vi.mocked(fetchPublicProduct).mockResolvedValue(product);
    vi.mocked(submitQuotation).mockResolvedValue({
      reference: 'DEV-2026-00007',
      createdAt: '2026-11-08T10:00:00.000Z',
    });
    renderInRouter(<QuotationRequest />);

    expect(await screen.findByText('Semence de maïs')).toBeInTheDocument();
    expect(screen.getByText(/37\s500 FCFA/)).toBeInTheDocument();
    await fillContact();
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer ma demande de devis' }));

    expect(await screen.findByText('DEV-2026-00007')).toBeInTheDocument();
    const [payload, key] = vi.mocked(submitQuotation).mock.calls[0] ?? [];
    expect(payload?.items).toEqual([{ productId: PRODUCT_ID, variantId: VARIANT_ID, quantity: 3 }]);
    expect(JSON.stringify(payload)).not.toMatch(/price/i);
    expect(key).toMatch(/^[0-9a-f-]{36}$/);
    expect(quotationCart.getItems()).toEqual([]);
  });

  it('bloque l’envoi tant qu’un produit retiré du catalogue reste dans le panier', async () => {
    quotationCart.add(PRODUCT_ID, VARIANT_ID, 1);
    vi.mocked(fetchPublicProduct).mockRejectedValue(
      new ApiError({ status: 404, code: 'PRODUCT_NOT_FOUND', message: 'Introuvable' }),
    );
    renderInRouter(<QuotationRequest />);

    expect(await screen.findByText(/Produit retiré du catalogue/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Envoyer ma demande de devis' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: /Retirer/ }));
    expect(await screen.findByText('Votre demande de devis est vide')).toBeInTheDocument();
  });
});

describe('demande d’accompagnement', () => {
  it('affiche les erreurs de validation sans envoyer', async () => {
    renderInRouter(<AccompanimentForm />);
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer ma demande' }));
    expect(await screen.findByText('Indiquez votre nom.')).toBeInTheDocument();
    expect(screen.getByText('Choisissez un type de projet.')).toBeInTheDocument();
    expect(submitAccompaniment).not.toHaveBeenCalled();
  });

  it('réutilise la même clé d’idempotence après un échec réseau, puis confirme', async () => {
    vi.mocked(submitAccompaniment)
      .mockRejectedValueOnce(
        new ApiError({
          status: 0,
          code: 'NETWORK_ERROR',
          message: 'Impossible de joindre le serveur.',
        }),
      )
      .mockResolvedValueOnce({
        reference: 'ACC-2026-00003',
        createdAt: '2026-11-08T10:00:00.000Z',
      });
    renderInRouter(<AccompanimentForm />);

    await fillContact();
    await userEvent.selectOptions(screen.getByLabelText('Type de projet'), 'marketGardening');
    await userEvent.selectOptions(screen.getByLabelText('Avancement'), 'idea');
    await userEvent.type(
      screen.getByLabelText('Description du projet'),
      'Création d’un périmètre maraîcher.',
    );
    await userEvent.type(screen.getByLabelText('Vos besoins'), 'Étude de faisabilité.');
    await userEvent.type(screen.getByLabelText(/Surface/), '2,5');

    await userEvent.click(screen.getByRole('button', { name: 'Envoyer ma demande' }));
    expect(await screen.findByText(/Vos informations sont conservées/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Envoyer ma demande' }));
    expect(await screen.findByText('ACC-2026-00003')).toBeInTheDocument();

    const calls = vi.mocked(submitAccompaniment).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0]?.[1]).toBe(calls[1]?.[1]);
    expect(calls[0]?.[0]).toMatchObject({
      surfaceHectares: 2.5,
      budgetFcfa: null,
      projectType: 'marketGardening',
    });
  });
});
