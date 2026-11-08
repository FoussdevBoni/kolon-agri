import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createApiClient } from '../../../src/core/api/apiClient';
import { installCsrfHeader, setCsrfToken } from '../../../src/core/auth/csrfToken';

function setup() {
  const fetchFn = vi.fn<typeof fetch>(() =>
    Promise.resolve(
      new Response(JSON.stringify({ success: true, data: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  );
  const client = createApiClient({ baseUrl: '/api/v1', fetchFn });
  installCsrfHeader(client);
  const sentHeader = (call: number) =>
    new Headers(fetchFn.mock.calls[call]?.[1]?.headers).get('X-CSRF-Token');
  return { client, sentHeader };
}

describe('en-tête CSRF', () => {
  afterEach(() => setCsrfToken(null));

  it('est ajouté aux requêtes mutantes uniquement', async () => {
    const { client, sentHeader } = setup();
    setCsrfToken('jeton-csrf');

    await client.get('/auth/me', z.null());
    await client.post('/auth/logout', z.null());
    await client.patch('/admins/1', z.null(), { body: {} });

    expect(sentHeader(0)).toBeNull();
    expect(sentHeader(1)).toBe('jeton-csrf');
    expect(sentHeader(2)).toBe('jeton-csrf');
  });

  it('n’est pas envoyé sans session', async () => {
    const { client, sentHeader } = setup();
    await client.post('/auth/login', z.null(), { body: {} });
    expect(sentHeader(0)).toBeNull();
  });
});
