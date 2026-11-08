import { createBrowserRouter, Navigate, Outlet, type RouteObject } from 'react-router';
import { LOGIN_PATH, RequireAuth } from '../core/auth/RequireAuth';
import { RequireRole } from '../core/auth/RequireRole';
import { LoadingState } from '../core/components/LoadingState';
import { DASHBOARD_ROOT, dashboardNavItems } from '../core/navigation/dashboardNavigation';
import { recoverEncodedFragment } from '../core/navigation/recoverEncodedFragment';
import { AuthLayout } from '../layouts/AuthLayout';
import { PublicLayout } from '../layouts/PublicLayout';
import { RouteErrorPage } from '../pages/RouteErrorPage';

const publicRoutes: RouteObject[] = [
  {
    index: true,
    lazy: async () => ({ Component: (await import('../pages/public/HomePage')).HomePage }),
  },
  {
    path: 'a-propos',
    lazy: async () => ({ Component: (await import('../pages/public/AboutPage')).AboutPage }),
  },
  {
    path: 'services',
    lazy: async () => ({ Component: (await import('../pages/public/ServicesPage')).ServicesPage }),
  },
  {
    path: 'catalogue',
    lazy: async () => ({ Component: (await import('../pages/public/CatalogPage')).CatalogPage }),
  },
  {
    path: 'catalogue/:slug',
    lazy: async () => ({ Component: (await import('../pages/public/ProductPage')).ProductPage }),
  },
  {
    path: 'demande-de-devis',
    lazy: async () => ({
      Component: (await import('../pages/public/QuotationRequestPage')).QuotationRequestPage,
    }),
  },
  {
    path: 'accompagnement',
    lazy: async () => ({
      Component: (await import('../pages/public/AccompanimentPage')).AccompanimentPage,
    }),
  },
  {
    path: 'mise-en-relation',
    lazy: async () => ({ Component: (await import('../pages/public/MatchingPage')).MatchingPage }),
  },
  {
    path: 'contact',
    lazy: async () => ({ Component: (await import('../pages/public/ContactPage')).ContactPage }),
  },
];

/** Modules disposant de leurs propres écrans ; les autres affichent un écran structurel. */
const implementedModuleIds = new Set([
  'home',
  'admins',
  'products',
  'categories',
  'media',
  'services',
  'pages',
  'requests',
  'partners',
  'messages',
  'notifications',
]);

const productEditor = async () => ({
  Component: (await import('../pages/dashboard/catalog/ProductEditorPage')).ProductEditorPage,
});
const serviceEditor = async () => ({
  Component: (await import('../pages/dashboard/services/ServiceEditorPage')).ServiceEditorPage,
});

/** Catalogue, médiathèque et CMS : accessibles à tout administrateur. */
const partnerEditor = async () => ({
  Component: (await import('../pages/dashboard/partners/PartnerEditorPage')).PartnerEditorPage,
});

/** Demandes : vue unifiée, fiches de détail (doc 06) et annuaire des partenaires. */
const requestRoutes: RouteObject[] = [
  {
    path: 'demandes',
    lazy: async () => ({
      Component: (await import('../pages/dashboard/requests/RequestsPage')).RequestsPage,
    }),
  },
  // Listes par type de la doc 06 : vue unifiée filtrée.
  { path: 'quotations', element: <Navigate to="/dashboard/demandes?type=quotation" replace /> },
  {
    path: 'accompaniment',
    element: <Navigate to="/dashboard/demandes?type=accompaniment" replace />,
  },
  { path: 'matching', element: <Navigate to="/dashboard/demandes?type=matching" replace /> },
  {
    path: 'quotations/:id',
    lazy: async () => ({
      Component: (await import('../pages/dashboard/requests/QuotationDetailPage'))
        .QuotationDetailPage,
    }),
  },
  {
    path: 'accompaniment/:id',
    lazy: async () => ({
      Component: (await import('../pages/dashboard/requests/AccompanimentDetailPage'))
        .AccompanimentDetailPage,
    }),
  },
  {
    path: 'matching/:id',
    lazy: async () => ({
      Component: (await import('../pages/dashboard/requests/MatchingDetailPage'))
        .MatchingDetailPage,
    }),
  },
  {
    path: 'messages',
    lazy: async () => ({
      Component: (await import('../pages/dashboard/messages/MessagesPage')).MessagesPage,
    }),
  },
  {
    path: 'messages/:id',
    lazy: async () => ({
      Component: (await import('../pages/dashboard/messages/MessageDetailPage')).MessageDetailPage,
    }),
  },
  {
    path: 'notifications',
    lazy: async () => ({
      Component: (await import('../pages/dashboard/NotificationsPage')).NotificationsPage,
    }),
  },
  {
    path: 'partners',
    children: [
      {
        index: true,
        lazy: async () => ({
          Component: (await import('../pages/dashboard/partners/PartnersPage')).PartnersPage,
        }),
      },
      { path: 'nouveau', lazy: partnerEditor },
      { path: ':id', lazy: partnerEditor },
    ],
  },
];

const contentRoutes: RouteObject[] = [
  {
    path: 'products',
    children: [
      {
        index: true,
        lazy: async () => ({
          Component: (await import('../pages/dashboard/catalog/ProductsListPage')).ProductsListPage,
        }),
      },
      { path: 'nouveau', lazy: productEditor },
      { path: ':id', lazy: productEditor },
    ],
  },
  {
    path: 'categories',
    lazy: async () => ({
      Component: (await import('../pages/dashboard/catalog/CategoriesPage')).CategoriesPage,
    }),
  },
  {
    path: 'media',
    lazy: async () => ({
      Component: (await import('../pages/dashboard/media/MediaLibraryPage')).MediaLibraryPage,
    }),
  },
  {
    path: 'services',
    children: [
      {
        index: true,
        lazy: async () => ({
          Component: (await import('../pages/dashboard/services/ServicesListPage'))
            .ServicesListPage,
        }),
      },
      { path: 'nouveau', lazy: serviceEditor },
      { path: ':id', lazy: serviceEditor },
    ],
  },
  {
    path: 'pages',
    children: [
      {
        index: true,
        lazy: async () => ({
          Component: (await import('../pages/dashboard/content/PagesListPage')).PagesListPage,
        }),
      },
      {
        path: ':id',
        lazy: async () => ({
          Component: (await import('../pages/dashboard/content/PageEditorPage')).PageEditorPage,
        }),
      },
      {
        path: ':id/preview',
        lazy: async () => ({
          Component: (await import('../pages/dashboard/content/PagePreviewPage')).PagePreviewPage,
        }),
      },
    ],
  },
];

const adminRoutes: RouteObject = {
  path: 'admins',
  element: (
    <RequireRole role="superAdmin">
      <Outlet />
    </RequireRole>
  ),
  children: [
    {
      index: true,
      lazy: async () => ({
        Component: (await import('../pages/dashboard/admins/AdminsListPage')).AdminsListPage,
      }),
    },
    {
      path: 'nouveau',
      lazy: async () => ({
        Component: (await import('../pages/dashboard/admins/AdminCreatePage')).AdminCreatePage,
      }),
    },
    {
      path: ':id',
      lazy: async () => ({
        Component: (await import('../pages/dashboard/admins/AdminDetailPage')).AdminDetailPage,
      }),
    },
  ],
};

const authRoutes: RouteObject = {
  element: <AuthLayout />,
  children: [
    {
      path: LOGIN_PATH,
      lazy: async () => ({ Component: (await import('../pages/auth/LoginPage')).LoginPage }),
    },
    {
      path: '/mot-de-passe-oublie',
      lazy: async () => ({
        Component: (await import('../pages/auth/ForgotPasswordPage')).ForgotPasswordPage,
      }),
    },
    {
      path: '/definir-mot-de-passe',
      lazy: async () => ({
        Component: (await import('../pages/auth/SetPasswordPage')).SetPasswordPage,
      }),
    },
  ],
};

// Routes des modules dérivées de la configuration unique de navigation.
const dashboardModuleRoutes: RouteObject[] = dashboardNavItems
  .filter((item) => !implementedModuleIds.has(item.id))
  .map((item) => ({
    path: item.path.slice(DASHBOARD_ROOT.length + 1),
    lazy: async () => {
      const { DashboardModulePage } = await import('../pages/dashboard/DashboardModulePage');
      return { element: <DashboardModulePage item={item} /> };
    },
  }));

export const routes: RouteObject[] = [
  {
    hydrateFallbackElement: <LoadingState fullPage />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/', element: <PublicLayout />, children: publicRoutes },
      authRoutes,
      {
        path: DASHBOARD_ROOT,
        // Toutes les routes /dashboard/* exigent une session valide.
        lazy: async () => {
          const { DashboardLayout } = await import('../layouts/DashboardLayout');
          return {
            element: (
              <RequireAuth>
                <DashboardLayout />
              </RequireAuth>
            ),
          };
        },
        children: [
          {
            index: true,
            lazy: async () => ({
              Component: (await import('../pages/dashboard/DashboardHomePage')).DashboardHomePage,
            }),
          },
          adminRoutes,
          ...contentRoutes,
          ...requestRoutes,
          ...dashboardModuleRoutes,
        ],
      },
      {
        path: '*',
        lazy: async () => ({ Component: (await import('../pages/NotFoundPage')).NotFoundPage }),
      },
    ],
  },
];

// Rétablit un fragment encodé (%23) avant que le routeur ne lise l'URL initiale.
const recoveredUrl = recoverEncodedFragment(window.location);
if (recoveredUrl) window.history.replaceState(window.history.state, '', recoveredUrl);

export const router = createBrowserRouter(routes);
