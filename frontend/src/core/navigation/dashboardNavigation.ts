import {
  Bell,
  BriefcaseBusiness,
  House,
  Images,
  Inbox,
  LayoutTemplate,
  type LucideIcon,
  Mail,
  Package,
  ShieldCheck,
  Tags,
  Users,
} from 'lucide-react';
import { type AdminRole, hasRequiredRole } from '../auth/roles';

export type DashboardNavGroup =
  'overview' | 'requests' | 'catalog' | 'content' | 'network' | 'administration';
export type DashboardMobileTabId = 'home' | 'requests' | 'products' | 'alerts';

export interface DashboardNavItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  group: DashboardNavGroup;
  /** Onglet de la barre mobile mis en évidence lorsque ce module est affiché. */
  mobileTab?: DashboardMobileTabId;
  /** Rôle requis pour afficher le module ; l'autorisation réelle est contrôlée par l'API. */
  requiredRole?: AdminRole;
  /** Autres préfixes d'URL rattachés à ce module (pages de détail). */
  matchPaths?: readonly string[];
}

export interface DashboardMobileTab {
  id: DashboardMobileTabId;
  label: string;
  path: string;
  icon: LucideIcon;
}

export const DASHBOARD_ROOT = '/dashboard';

/** Source unique des menus du dashboard (sidebar, barre mobile, menu « Plus », routes). */
export const dashboardNavItems: readonly DashboardNavItem[] = [
  {
    id: 'home',
    label: 'Accueil',
    path: DASHBOARD_ROOT,
    icon: House,
    group: 'overview',
    mobileTab: 'home',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    path: '/dashboard/notifications',
    icon: Bell,
    group: 'overview',
    mobileTab: 'alerts',
  },
  {
    id: 'requests',
    label: 'Demandes',
    path: '/dashboard/demandes',
    icon: Inbox,
    group: 'requests',
    mobileTab: 'requests',
    // Fiches de détail par type (routes de la doc 06).
    matchPaths: ['/dashboard/quotations', '/dashboard/accompaniment', '/dashboard/matching'],
  },
  {
    id: 'messages',
    label: 'Messages',
    path: '/dashboard/messages',
    icon: Mail,
    group: 'requests',
  },
  {
    id: 'products',
    label: 'Produits',
    path: '/dashboard/products',
    icon: Package,
    group: 'catalog',
    mobileTab: 'products',
  },
  {
    id: 'categories',
    label: 'Catégories',
    path: '/dashboard/categories',
    icon: Tags,
    group: 'catalog',
    mobileTab: 'products',
  },
  { id: 'pages', label: 'Pages', path: '/dashboard/pages', icon: LayoutTemplate, group: 'content' },
  {
    id: 'services',
    label: 'Services',
    path: '/dashboard/services',
    icon: BriefcaseBusiness,
    group: 'content',
  },
  { id: 'media', label: 'Médias', path: '/dashboard/media', icon: Images, group: 'content' },
  {
    id: 'partners',
    label: 'Partenaires',
    path: '/dashboard/partners',
    icon: Users,
    group: 'network',
  },
  {
    id: 'admins',
    label: 'Administrateurs',
    path: '/dashboard/admins',
    icon: ShieldCheck,
    group: 'administration',
    requiredRole: 'superAdmin',
  },
];

export const dashboardNavGroupLabels: Record<DashboardNavGroup, string> = {
  overview: 'Vue d’ensemble',
  requests: 'Demandes',
  catalog: 'Catalogue',
  content: 'Contenus',
  network: 'Réseau',
  administration: 'Administration',
};

export const dashboardMobileTabs: readonly DashboardMobileTab[] = [
  { id: 'home', label: 'Accueil', path: DASHBOARD_ROOT, icon: House },
  { id: 'requests', label: 'Demandes', path: '/dashboard/demandes', icon: Inbox },
  { id: 'products', label: 'Produits', path: '/dashboard/products', icon: Package },
  { id: 'alerts', label: 'Alertes', path: '/dashboard/notifications', icon: Bell },
];

const tabPaths = new Set(dashboardMobileTabs.map((tab) => tab.path));

/** Modules visibles pour un rôle (sidebar, menu « Plus »). */
export function getVisibleNavItems(role: AdminRole): DashboardNavItem[] {
  return dashboardNavItems.filter((item) => hasRequiredRole(role, item.requiredRole));
}

/** Modules secondaires accessibles par l'onglet « Plus » sur mobile. */
export function getMoreItems(role: AdminRole): DashboardNavItem[] {
  return getVisibleNavItems(role).filter((item) => !tabPaths.has(item.path));
}

export function isPathActive(pathname: string, itemPath: string): boolean {
  if (itemPath === DASHBOARD_ROOT)
    return pathname === DASHBOARD_ROOT || pathname === `${DASHBOARD_ROOT}/`;
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

export function findActiveNavItem(pathname: string): DashboardNavItem | undefined {
  return dashboardNavItems
    .filter((item) =>
      [item.path, ...(item.matchPaths ?? [])].some((path) => isPathActive(pathname, path)),
    )
    .sort((a, b) => b.path.length - a.path.length)[0];
}
