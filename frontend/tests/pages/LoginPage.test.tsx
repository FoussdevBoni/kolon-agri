import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as SessionServiceModule from '../../src/core/auth/sessionService';
import { ApiError } from '../../src/core/api/apiError';
import { getCsrfToken, setCsrfToken } from '../../src/core/auth/csrfToken';
import { fetchSessionState } from '../../src/core/auth/sessionService';
import { login } from '../../src/modules/auth/services/authService';
import { safeDashboardRedirect } from '../../src/modules/auth/schemas/authFormSchema';
import { LoginPage } from '../../src/pages/auth/LoginPage';
import { buildSession } from '../helpers/sessionFixtures';

vi.mock('../../src/core/auth/sessionService', async (importOriginal) => {
  const original = await importOriginal<typeof SessionServiceModule>();
  return { ...original, fetchSessionState: vi.fn() };
});
vi.mock('../../src/modules/auth/services/authService', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  setPasswordWithToken: vi.fn(),
}));

const loginMock = vi.mocked(login);

function renderLogin(path = '/connexion') {
  const router = createMemoryRouter(
    [
      { path: '/connexion', element: <LoginPage /> },
      { path: '/dashboard/*', element: <p>Tableau de bord atteint</p> },
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
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.mocked(fetchSessionState).mockResolvedValue({ status: 'anonymous', reason: null });
    loginMock.mockReset();
    setCsrfToken(null);
  });

  it('valide les champs avant tout appel', async () => {
    renderLogin();
    await userEvent.click(await screen.findByRole('button', { name: 'Se connecter' }));

    expect(await screen.findByText('Saisissez votre adresse email.')).toBeInTheDocument();
    expect(screen.getByText('Saisissez votre mot de passe.')).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('affiche le message générique du serveur en cas d’échec', async () => {
    loginMock.mockRejectedValue(
      new ApiError({
        status: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Email ou mot de passe incorrect.',
      }),
    );
    renderLogin();

    await userEvent.type(await screen.findByLabelText('Adresse email'), 'awa@kolon.test');
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'mauvais');
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Email ou mot de passe incorrect.');
  });

  it('connecte, mémorise le jeton CSRF et redirige vers la page demandée', async () => {
    loginMock.mockResolvedValue(buildSession('admin'));
    renderLogin('/connexion?redirect=%2Fdashboard%2Fproducts');

    await userEvent.type(await screen.findByLabelText('Adresse email'), 'awa@kolon.test');
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'Mot-De-Passe-Correct-1');
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));

    expect(await screen.findByText('Tableau de bord atteint')).toBeInTheDocument();
    expect(getCsrfToken()).toBe('csrf-de-test');
  });

  it('informe d’une session expirée', async () => {
    renderLogin('/connexion?raison=session-expiree');
    expect(await screen.findByText(/Votre session a expiré/)).toBeInTheDocument();
  });

  it('refuse les redirections hors du dashboard', () => {
    expect(safeDashboardRedirect('https://pirate.example')).toBe('/dashboard');
    expect(safeDashboardRedirect('//pirate.example')).toBe('/dashboard');
    expect(safeDashboardRedirect('/dashboard/admins')).toBe('/dashboard/admins');
    expect(safeDashboardRedirect(null)).toBe('/dashboard');
  });
});
