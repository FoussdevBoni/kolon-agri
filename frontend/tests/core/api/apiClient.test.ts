import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createApiClient } from '../../../src/core/api/apiClient';
import { ApiError } from '../../../src/core/api/apiError';

const itemSchema = z.object({ id: z.string(), name: z.string() });

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** `outcome` : réponse renvoyée par fetch, ou toute autre valeur avec laquelle fetch rejette. */
function setup(outcome: Response | Error | DOMException) {
  // Discrimination sur Response : sous jsdom, DOMException n'hérite pas d'Error.
  const fetchFn = vi.fn<typeof fetch>(() =>
    outcome instanceof Response ? Promise.resolve(outcome) : Promise.reject(outcome),
  );
  const client = createApiClient({ baseUrl: '/api/v1/', fetchFn });
  return { client, fetchFn };
}

async function captureError(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error('Une ApiError était attendue');
}

describe('apiClient', () => {
  it('retourne data et meta validés depuis l’enveloppe de succès', async () => {
    const { client, fetchFn } = setup(
      jsonResponse({ success: true, data: { id: '1', name: 'Mil' }, meta: { total: 1 } }),
    );

    const result = await client.get('/products/1', itemSchema, {
      query: { page: 2, q: undefined },
    });

    expect(result).toEqual({ data: { id: '1', name: 'Mil' }, meta: { total: 1 } });
    const [url, init] = fetchFn.mock.calls[0] ?? [];
    expect(url).toBe('/api/v1/products/1?page=2');
    expect(init?.credentials).toBe('include');
    expect(init?.method).toBe('GET');
  });

  it('sérialise le corps JSON et transmet la clé d’idempotence', async () => {
    const { client, fetchFn } = setup(
      jsonResponse({ success: true, data: { id: '1', name: 'Devis' } }, 201),
    );

    await client.post('/quotations', itemSchema, {
      body: { name: 'Devis' },
      idempotencyKey: '7f1c2b8e-0d4a-4c1b-9a51-2f6a8e9d3c10',
    });

    const init = fetchFn.mock.calls[0]?.[1];
    const headers = new Headers(init?.headers);
    expect(init?.body).toBe('{"name":"Devis"}');
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('Idempotency-Key')).toBe('7f1c2b8e-0d4a-4c1b-9a51-2f6a8e9d3c10');
  });

  it('applique le point d’extension prepareHeaders', async () => {
    const { client, fetchFn } = setup(
      jsonResponse({ success: true, data: { id: '1', name: 'A' } }),
    );
    client.configure({ prepareHeaders: (headers) => headers.set('X-Test', 'oui') });

    await client.patch('/products/1', itemSchema, { body: {} });

    expect(new Headers(fetchFn.mock.calls[0]?.[1]?.headers).get('X-Test')).toBe('oui');
  });

  it('convertit une enveloppe d’erreur en ApiError', async () => {
    const { client } = setup(
      jsonResponse(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Données invalides',
            details: { issues: [] },
          },
        },
        422,
      ),
    );

    const error = await captureError(client.get('/products', itemSchema));

    expect(error.status).toBe(422);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.message).toBe('Données invalides');
    expect(error.details).toEqual({ issues: [] });
    expect(error.isRetryable).toBe(false);
  });

  it('produit une erreur HTTP générique si le corps d’erreur n’est pas normalisé', async () => {
    const { client } = setup(new Response('Bad gateway', { status: 502 }));

    const error = await captureError(client.get('/products', itemSchema));

    expect(error.code).toBe('HTTP_ERROR');
    expect(error.status).toBe(502);
    expect(error.isRetryable).toBe(true);
  });

  it('signale une erreur réseau avec le statut 0', async () => {
    const { client } = setup(new TypeError('Failed to fetch'));

    const error = await captureError(client.get('/products', itemSchema));

    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.isNetworkError).toBe(true);
  });

  it('rejette une réponse qui ne respecte pas le schéma attendu', async () => {
    const { client } = setup(jsonResponse({ success: true, data: { id: 1 } }));

    const error = await captureError(client.get('/products/1', itemSchema));

    expect(error.code).toBe('INVALID_RESPONSE');
  });

  it('laisse remonter les annulations sans les transformer', async () => {
    const { client } = setup(new DOMException('Aborted', 'AbortError'));

    const rejection = client.get('/products', itemSchema);

    await expect(rejection).rejects.toMatchObject({ name: 'AbortError' });
    await expect(rejection).rejects.not.toBeInstanceOf(ApiError);
  });

  it('propage la raison d’annulation du signal transmis par l’appelant', async () => {
    const controller = new AbortController();
    const reason = new Error('Requête remplacée');
    // Comme fetch, rejette avec la raison du signal (qui n'est pas une AbortError).
    const fetchFn = vi.fn<typeof fetch>(() => {
      controller.abort(reason);
      return Promise.reject(reason);
    });
    const client = createApiClient({ baseUrl: '/api/v1', fetchFn });

    await expect(client.get('/products', itemSchema, { signal: controller.signal })).rejects.toBe(
      reason,
    );
    expect(fetchFn.mock.calls[0]?.[1]?.signal).toBe(controller.signal);
  });
});
