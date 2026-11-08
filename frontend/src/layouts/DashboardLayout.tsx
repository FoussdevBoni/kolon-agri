import { useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { useCurrentSession } from '../core/auth/currentSessionContext';
import { roleLabels } from '../core/auth/roles';
import { MAIN_CONTENT_ID, SkipLink } from '../core/components/SkipLink';
import { useNoIndex } from '../core/hooks/useDocumentMeta';
import { findActiveNavItem } from '../core/navigation/dashboardNavigation';
import { DashboardBottomNav } from './dashboard/DashboardBottomNav';
import { DashboardSidebar } from './dashboard/DashboardSidebar';

/** Dashboard en thème clair uniquement, rendu sous RequireAuth. */
export function DashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { pathname } = useLocation();
  const activeItem = findActiveNavItem(pathname);
  useNoIndex(`${activeItem?.label ?? 'Tableau de bord'} · Administration`);
  const { user } = useCurrentSession();

  return (
    <div className="min-h-dvh bg-ivory text-charcoal [color-scheme:light] md:flex">
      <SkipLink />
      <DashboardSidebar
        role={user.role}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((collapsed) => !collapsed)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-forest/10 bg-white/95 px-4 backdrop-blur md:px-8">
          <p className="truncate font-display text-lg font-bold">
            <span className="text-forest md:hidden">Kolon Agri · </span>
            {activeItem?.label ?? 'Tableau de bord'}
          </p>
          <div className="hidden min-w-0 text-right sm:block">
            <p className="truncate text-sm font-semibold">{user.fullName}</p>
            <p className="text-xs text-charcoal/60">{roleLabels[user.role]}</p>
          </div>
        </header>
        <main
          id={MAIN_CONTENT_ID}
          className="flex-1 px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-8 md:pb-10"
        >
          <Outlet />
        </main>
      </div>
      <DashboardBottomNav role={user.role} />
    </div>
  );
}
