import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../src/core/api/apiError';
import { PasswordLinkPanel } from '../../src/modules/admins/components/PasswordLinkPanel';
import { requestPasswordReset } from '../../src/modules/auth/services/authService';
import { ContactForm } from '../../src/modules/contactMessages/components/ContactForm';
import { submitContactMessage } from '../../src/modules/contactMessages/services/contactMessageService';
import { KpiGrid, NeedsActionCard } from '../../src/modules/dashboard/components/home/HomeWidgets';
import { bucketLabel } from '../../src/modules/dashboard/components/home/homeFormat';
import type { Overview } from '../../src/modules/dashboard/schemas/statsSchema';
import {
  type AppNotification,
  fetchNotifications,
  markNotificationRead,
} from '../../src/modules/notifications/services/notificationService';
import { ForgotPasswordPage } from '../../src/pages/auth/ForgotPasswordPage';
import { NotificationsPage } from '../../src/pages/dashboard/NotificationsPage';

vi.mock('../../src/modules/contactMessages/services/contactMessageService', () => ({
  submitContactMessage: vi.fn(),
  contactMessageApi: {},
}));
vi.mock('../../src/modules/auth/services/authService', () => ({
  requestPasswordReset: vi.fn(),
}));
vi.mock('../../src/modules/notifications/services/notificationService', () => ({
  fetchNotifications: vi.fn(),
  fetchUnreadCount: vi.fn(() => Promise.resolve(0)),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}));

function renderAt(element: ReactNode, path = '/') {
  const router = createMemoryRouter(
    [
      { path, element },
      { path: '*', element: <p>Fiche ouverte</p> },
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

beforeEach(() => vi.clearAllMocks());

describe('formulaire de contact', () => {
  it('exige un téléphone ou un email avant tout envoi', async () => {
    renderAt(<ContactForm />);
    await userEvent.type(screen.getByLabelText('Nom et prénom'), 'Awa Traoré');
    await userEvent.type(screen.getByLabelText('Objet'), 'Visite');
    await userEvent.type(screen.getByLabelText('Message'), 'Je souhaite visiter la ferme.');
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer mon message' }));
    expect(
      await screen.findByText(/Indiquez un téléphone ou une adresse email/),
    ).toBeInTheDocument();
    expect(submitContactMessage).not.toHaveBeenCalled();
  });

  it('envoie avec une clé d’idempotence, conserve la saisie en cas d’échec et confirme', async () => {
    vi.mocked(submitContactMessage)
      .mockRejectedValueOnce(
        new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'Hors ligne.' }),
      )
      .mockResolvedValueOnce({
        reference: 'CTC-2026-00004',
        createdAt: '2026-11-08T10:00:00.000Z',
      });
    renderAt(<ContactForm />);
    await userEvent.type(screen.getByLabelText('Nom et prénom'), 'Awa Traoré');
    await userEvent.type(screen.getByLabelText('Email'), 'awa@exemple.ml');
    await userEvent.type(screen.getByLabelText('Objet'), 'Visite');
    await userEvent.type(screen.getByLabelText('Message'), 'Je souhaite visiter la ferme.');

    await userEvent.click(screen.getByRole('button', { name: 'Envoyer mon message' }));
    expect(await screen.findByText(/Vos informations sont conservées/)).toBeInTheDocument();
    expect(screen.getByLabelText('Objet')).toHaveValue('Visite');
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer mon message' }));

    expect(await screen.findByText('CTC-2026-00004')).toBeInTheDocument();
    expect(screen.getByText(/au téléphone ou à l’adresse indiqués/)).toBeInTheDocument();
    const calls = vi.mocked(submitContactMessage).mock.calls;
    expect(calls[0]?.[0]).toEqual({
      name: 'Awa Traoré',
      phone: '',
      email: 'awa@exemple.ml',
      subject: 'Visite',
      message: 'Je souhaite visiter la ferme.',
    });
    expect(calls[0]?.[1]).toBe(calls[1]?.[1]);
  });
});

describe('mot de passe oublié', () => {
  it('affiche une confirmation neutre après la demande', async () => {
    vi.mocked(requestPasswordReset).mockResolvedValue(undefined);
    renderAt(<ForgotPasswordPage />, '/mot-de-passe-oublie');
    await userEvent.click(screen.getByRole('button', { name: 'Recevoir un lien' }));
    expect(await screen.findByText('Saisissez votre adresse email.')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Adresse email'), 'admin@kolon.test');
    await userEvent.click(screen.getByRole('button', { name: 'Recevoir un lien' }));
    expect(
      await screen.findByText(/Si un compte actif correspond à cette adresse/),
    ).toBeInTheDocument();
    expect(vi.mocked(requestPasswordReset).mock.calls[0]?.[0]).toBe('admin@kolon.test');
  });
});

describe('centre de notifications', () => {
  const unread: AppNotification = {
    id: 'n1',
    kind: 'assigned',
    title: 'Demande de devis DEV-2026-00003 vous est affectée',
    body: 'Affectation par Alice.',
    reference: 'DEV-2026-00003',
    target: { type: 'quotation', id: 'q1' },
    readAt: null,
    createdAt: '2026-11-08T09:00:00.000Z',
  };

  it('marque comme lue et ouvre la fiche concernée', async () => {
    vi.mocked(fetchNotifications).mockResolvedValue({
      items: [unread],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1, unreadCount: 1 },
    });
    vi.mocked(markNotificationRead).mockResolvedValue({
      ...unread,
      readAt: '2026-11-08T10:00:00.000Z',
    });
    const router = renderAt(<NotificationsPage />, '/dashboard/notifications');

    expect(await screen.findByText('1 notification non lue.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /DEV-2026-00003 vous est affectée/ }));
    expect(vi.mocked(markNotificationRead).mock.calls[0]?.[0]).toBe('n1');
    expect(router.state.location.pathname).toBe('/dashboard/quotations/q1');
  });

  it('affiche un état vide explicite', async () => {
    vi.mocked(fetchNotifications).mockResolvedValue({
      items: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 1, unreadCount: 0 },
    });
    renderAt(<NotificationsPage />, '/dashboard/notifications');
    expect(await screen.findByText('Aucune notification')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tout marquer comme lu' })).toBeDisabled();
  });
});

describe('tableau de bord', () => {
  const overview: Overview = {
    requests: {
      totals: { total: 7, new: 3, inProgress: 1, completed: 3 },
      byType: [],
    },
    needsAction: {
      total: 2,
      unassigned: 2,
      waiting: 1,
      assignedToMe: 1,
      waitingThresholdHours: 48,
      items: [
        {
          type: 'quotation',
          id: 'q1',
          reference: 'DEV-2026-00001',
          status: 'new',
          customerName: 'Client A',
          assignee: null,
          createdAt: '2026-11-05T09:00:00.000Z',
          reasons: ['unassigned', 'waiting'],
        },
        {
          type: 'contact',
          id: 'c1',
          reference: 'CTC-2026-00001',
          status: 'new',
          customerName: 'Client B',
          assignee: null,
          createdAt: '2026-11-08T08:00:00.000Z',
          reasons: ['unassigned'],
        },
      ],
    },
    catalog: {
      products: { published: 1, draft: 0, archived: 0 },
      services: { published: 0, draft: 0 },
    },
    partners: { active: 0, inactive: 0, archived: 0 },
    pages: { total: 9, published: 9, withUnpublishedChanges: 0 },
    generatedAt: '2026-11-08T10:00:00.000Z',
  };

  it('présente les indicateurs réels et les demandes prioritaires avec leur motif', () => {
    renderAt(
      <>
        <KpiGrid overview={overview} />
        <NeedsActionCard overview={overview} />
      </>,
    );
    expect(screen.getByRole('link', { name: /À traiter\s*2/ })).toHaveAttribute(
      'href',
      '/dashboard/demandes?responsable=none',
    );
    expect(screen.getByRole('link', { name: /CTC-2026-00001/ })).toHaveAttribute(
      'href',
      '/dashboard/messages/c1',
    );
    expect(screen.getByText('En attente')).toBeInTheDocument();
    expect(screen.getAllByText('Sans responsable')).toHaveLength(2);
  });

  it('formate les intervalles en UTC', () => {
    expect(bucketLabel('2026-11-02T00:00:00.000Z', 'week')).toBe('sem. du 2 nov.');
    expect(bucketLabel('2026-11-01T00:00:00.000Z', 'month')).toBe('nov. 26');
  });
});

describe('liens d’accès des administrateurs', () => {
  it('confirme l’envoi par email sans afficher de lien', () => {
    render(
      <PasswordLinkPanel
        link={{ delivery: 'email', purpose: 'invitation', email: 'a@kolon.test' }}
      />,
    );
    expect(screen.getByText('Invitation envoyée')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
