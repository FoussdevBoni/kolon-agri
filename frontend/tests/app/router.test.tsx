import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routes } from '../../src/app/router';
import { recoverEncodedFragment } from '../../src/core/navigation/recoverEncodedFragment';
import { readTokenFromHash } from '../../src/modules/auth/schemas/authFormSchema';
import { setPasswordWithToken } from '../../src/modules/auth/services/authService';

vi.mock('../../src/modules/auth/services/authService', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  setPasswordWithToken: vi.fn(),
}));

const setPasswordMock = vi.mocked(setPasswordWithToken);

/** Forme exacte du lien produit par admin:create-super et POST /admins. */
const ACTIVATION_LINK = '/definir-mot-de-passe#token=AbC-_9xYz0123456789abcdefghijk';

function renderAt(url: string) {
  const router = createMemoryRouter(routes, { initialEntries: [url] });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

describe('lien d’activation /definir-mot-de-passe', () => {
  beforeEach(() => setPasswordMock.mockReset());

  it('affiche le formulaire, transmet le jeton du fragment puis le retire de l’URL', async () => {
    setPasswordMock.mockResolvedValue();
    const router = renderAt(ACTIVATION_LINK);

    expect(
      await screen.findByRole('heading', { name: 'Définir votre mot de passe' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Page introuvable')).toBeNull();
    expect(router.state.location.hash).toBe('');
    expect(router.state.location.pathname).toBe('/definir-mot-de-passe');

    await userEvent.type(screen.getByLabelText('Nouveau mot de passe'), 'Phrase-De-Passe-Solide-1');
    await userEvent.type(screen.getByLabelText('Confirmation'), 'Phrase-De-Passe-Solide-1');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer le mot de passe' }));

    expect(await screen.findByText('Mot de passe enregistré')).toBeInTheDocument();
    expect(setPasswordMock).toHaveBeenCalledWith(
      'AbC-_9xYz0123456789abcdefghijk',
      'Phrase-De-Passe-Solide-1',
    );
  });

  it('signale un lien sans jeton au lieu d’une page introuvable', async () => {
    renderAt('/definir-mot-de-passe');
    expect(await screen.findByRole('heading', { name: 'Lien invalide' })).toBeInTheDocument();
  });
});

describe('recoverEncodedFragment', () => {
  it('rétablit un « # » encodé en %23 par un terminal ou un client mail', () => {
    expect(
      recoverEncodedFragment({
        pathname: '/definir-mot-de-passe%23token=AbC-_9',
        search: '',
        hash: '',
      }),
    ).toBe('/definir-mot-de-passe#token=AbC-_9');
    expect(
      recoverEncodedFragment({
        pathname: '/definir-mot-de-passe%23token%3DAbC',
        search: '',
        hash: '',
      }),
    ).toBe('/definir-mot-de-passe#token=AbC');
  });

  it('ne modifie pas une URL correcte', () => {
    expect(
      recoverEncodedFragment({ pathname: '/definir-mot-de-passe', search: '', hash: '#token=x' }),
    ).toBeNull();
    expect(
      recoverEncodedFragment({ pathname: '/catalogue', search: '?q=mil', hash: '' }),
    ).toBeNull();
  });
});

describe('readTokenFromHash', () => {
  it('extrait le jeton du fragment', () => {
    expect(readTokenFromHash('#token=AbC-_9')).toBe('AbC-_9');
    expect(readTokenFromHash('token=AbC')).toBe('AbC');
    expect(readTokenFromHash('#token=')).toBeNull();
    expect(readTokenFromHash('')).toBeNull();
  });
});
