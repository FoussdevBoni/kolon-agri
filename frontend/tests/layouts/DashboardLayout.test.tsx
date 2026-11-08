import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { CurrentSessionContext } from '../../src/core/auth/currentSessionContext';
import type { AdminRole } from '../../src/core/auth/roles';
import { DashboardLayout } from '../../src/layouts/DashboardLayout';
import { buildSession } from '../helpers/sessionFixtures';

function renderDashboardAt(path: string, role: AdminRole = 'superAdmin') {
  const router = createMemoryRouter(
    [
      {
        path: '/dashboard',
        element: (
          <CurrentSessionContext value={buildSession(role)}>
            <DashboardLayout />
          </CurrentSessionContext>
        ),
        children: [
          { index: true, element: <p>Accueil du dashboard</p> },
          { path: '*', element: <p>Contenu du module</p> },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('DashboardLayout', () => {
  it('affiche la barre mobile Accueil, Demandes, Produits, Alertes, Plus', () => {
    renderDashboardAt('/dashboard');
    const mobileNav = screen.getByRole('navigation', { name: 'Navigation mobile' });

    expect(
      within(mobileNav)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Accueil', 'Demandes', 'Produits', 'Alertes']);
    expect(within(mobileNav).getByRole('button', { name: 'Plus' })).toBeInTheDocument();
  });

  it('active l’onglet Demandes sur une page de détail de devis', () => {
    renderDashboardAt('/dashboard/quotations/abc');
    const mobileNav = screen.getByRole('navigation', { name: 'Navigation mobile' });

    expect(within(mobileNav).getByRole('link', { name: 'Demandes' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByText('Contenu du module')).toBeInTheDocument();
  });

  it('met en évidence le module actif dans la sidebar', () => {
    renderDashboardAt('/dashboard/partners');
    const sidebar = screen.getByRole('navigation', { name: 'Navigation du dashboard' });

    expect(within(sidebar).getByRole('link', { name: 'Partenaires' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('affiche l’utilisateur connecté et masque l’administration aux admins', () => {
    renderDashboardAt('/dashboard', 'admin');
    const sidebar = screen.getByRole('navigation', { name: 'Navigation du dashboard' });

    expect(screen.getByText('Awa Traoré')).toBeInTheDocument();
    expect(within(sidebar).queryByRole('link', { name: 'Administrateurs' })).toBeNull();
    expect(screen.getAllByRole('button', { name: /Se déconnecter/ }).length).toBeGreaterThan(0);
  });
});
