import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as SessionServiceModule from '../../../src/core/auth/sessionService';
import { ApiError } from '../../../src/core/api/apiError';
import { RequireAuth } from '../../../src/core/auth/RequireAuth';
import { RequireRole } from '../../../src/core/auth/RequireRole';
import { fetchSessionState } from '../../../src/core/auth/sessionService';
import type { SessionState } from '../../../src/core/auth/sessionSchema';
import { createQueryClient } from '../../../src/app/queryClient';
import { buildSession } from '../../helpers/sessionFixtures';

vi.mock('../../../src/core/auth/sessionService', async (importOriginal) => {
  const original = await importOriginal<typeof SessionServiceModule>();
  return { ...original, fetchSessionState: vi.fn() };
});

const fetchSessionMock = vi.mocked(fetchSessionState);

function LoginProbe() {
  const location = useLocation();
  return <p>Connexion : {location.search}</p>;
}

function renderProtected(path: string, client: QueryClient = new QueryClient()) {
  const router = createMemoryRouter(
    [
      { path: '/connexion', element: <LoginProbe /> },
      {
        path: '/dashboard',
        element: (
          <RequireAuth>
            <p>Espace protégé</p>
          </RequireAuth>
        ),
      },
      {
        path: '/dashboard/admins',
        element: (
          <RequireAuth>
            <RequireRole role="superAdmin">
              <p>Gestion des comptes</p>
            </RequireRole>
          </RequireAuth>
        ),
      },
    ],
    { initialEntries: [path] },
  );
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

const authenticated = (role: 'admin' | 'superAdmin'): SessionState => ({
  status: 'authenticated',
  session: buildSession(role),
});

describe('RequireAuth', () => {
  beforeEach(() => {
    fetchSessionMock.mockReset();
  });

  it('affiche un état de chargement puis le contenu pour une session valide', async () => {
    fetchSessionMock.mockResolvedValue(authenticated('admin'));
    renderProtected('/dashboard');

    expect(screen.getByRole('status')).toHaveTextContent('Vérification de la session');
    expect(await screen.findByText('Espace protégé')).toBeInTheDocument();
  });

  it('redirige un visiteur vers /connexion en conservant la page demandée', async () => {
    fetchSessionMock.mockResolvedValue({ status: 'anonymous', reason: null });
    renderProtected('/dashboard?onglet=1');

    expect(await screen.findByText(/Connexion :/)).toHaveTextContent(
      '?redirect=%2Fdashboard%3Fonglet%3D1',
    );
  });

  it('signale une session expirée lors de la redirection', async () => {
    fetchSessionMock.mockResolvedValue({ status: 'anonymous', reason: 'expired' });
    renderProtected('/dashboard');

    expect(await screen.findByText(/Connexion :/)).toHaveTextContent('raison=session-expiree');
  });

  it('bascule vers la connexion quand une requête renvoie SESSION_EXPIRED', async () => {
    fetchSessionMock.mockResolvedValue(authenticated('admin'));
    const client = createQueryClient();
    renderProtected('/dashboard', client);
    await screen.findByText('Espace protégé');

    const expired = new ApiError({ status: 401, code: 'SESSION_EXPIRED', message: 'Expirée' });
    await client
      .fetchQuery({ queryKey: ['products'], queryFn: () => Promise.reject(expired), retry: false })
      .catch(() => undefined);

    expect(await screen.findByText(/Connexion :/)).toHaveTextContent('raison=session-expiree');
  });

  it('affiche un accès refusé à un admin sur un espace superAdmin', async () => {
    fetchSessionMock.mockResolvedValue(authenticated('admin'));
    renderProtected('/dashboard/admins');

    expect(await screen.findByText('Accès refusé')).toBeInTheDocument();
    expect(screen.queryByText('Gestion des comptes')).toBeNull();
  });

  it('autorise un superAdmin sur l’espace d’administration', async () => {
    fetchSessionMock.mockResolvedValue(authenticated('superAdmin'));
    renderProtected('/dashboard/admins');

    expect(await screen.findByText('Gestion des comptes')).toBeInTheDocument();
  });
});
