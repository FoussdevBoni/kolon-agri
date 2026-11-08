import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaField } from '../../src/modules/media/components/MediaField';

const listResponse = {
  success: true,
  data: [],
  meta: { page: 1, limit: 24, total: 0, totalPages: 1 },
};

describe('MediaField dans un formulaire', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify(listResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      ),
    );
  });

  it('n’imbrique aucun formulaire et ne soumet jamais le formulaire parent', async () => {
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <QueryClientProvider client={new QueryClient()}>
        <form aria-label="Service" onSubmit={onSubmit}>
          <MediaField label="Image" value={null} onChange={vi.fn()} />
        </form>
      </QueryClientProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Choisir une image' }));
    const search = await screen.findByLabelText('Rechercher une image');

    await userEvent.type(search, 'maïs{Enter}');
    await userEvent.click(screen.getByRole('button', { name: 'Rechercher' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(document.querySelector('form form')).toBeNull();
    expect(screen.getByRole('form', { name: 'Service' }).contains(search)).toBe(false);
    await waitFor(() => {
      const calls = vi
        .mocked(fetch)
        .mock.calls.map(([input]) => (input instanceof Request ? input.url : input.toString()));
      expect(calls.some((url) => url.includes('search=ma%C3%AFs'))).toBe(true);
    });
  });
});
