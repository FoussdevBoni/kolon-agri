import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import {
  DASHBOARD_ROOT,
  type DashboardNavGroup,
  dashboardNavGroupLabels,
  findActiveNavItem,
  getVisibleNavItems,
} from '../../core/navigation/dashboardNavigation';
import type { AdminRole } from '../../core/auth/roles';
import { cn } from '../../core/utils/cn';
import { UnreadBadge } from '../../modules/notifications/components/UnreadBadge';
import { LogoutButton } from './LogoutButton';

interface DashboardSidebarProps {
  role: AdminRole;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

const groups = Object.keys(dashboardNavGroupLabels) as DashboardNavGroup[];

/** Sidebar : compacte sur tablette, complète et repliable sur desktop, masquée sur mobile. */
export function DashboardSidebar({ role, collapsed, onToggleCollapsed }: DashboardSidebarProps) {
  const { pathname } = useLocation();
  const activeItem = findActiveNavItem(pathname);
  const labelClassName = collapsed ? 'sr-only' : 'sr-only lg:not-sr-only';
  const visibleItems = getVisibleNavItems(role);

  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-forest/10 bg-white md:flex md:w-20',
        !collapsed && 'lg:w-64',
      )}
    >
      <div className="flex h-16 items-center justify-center border-b border-forest/10 px-4 lg:justify-between">
        <Link to={DASHBOARD_ROOT} className="font-display text-lg font-extrabold text-forest">
          <span aria-hidden="true" className={cn(!collapsed && 'lg:hidden')}>
            KA
          </span>
          <span className={labelClassName}>Kolon Agri</span>
        </Link>
      </div>

      <nav aria-label="Navigation du dashboard" className="flex-1 overflow-y-auto px-3 py-4">
        {groups.map((group) => {
          const items = visibleItems.filter((item) => item.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group} className="mb-4">
              <p
                className={cn(
                  'mb-1 px-3 text-xs font-semibold tracking-wide text-charcoal/50 uppercase',
                  labelClassName,
                )}
              >
                {dashboardNavGroupLabels[group]}
              </p>
              <ul className="space-y-1">
                {items.map((item) => {
                  const isActive = activeItem?.id === item.id;
                  return (
                    <li key={item.id}>
                      <Link
                        to={item.path}
                        title={item.label}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                          'flex min-h-11 items-center justify-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                          !collapsed && 'lg:justify-start',
                          isActive
                            ? 'bg-forest text-ivory'
                            : 'text-charcoal/75 hover:bg-forest/5 hover:text-forest',
                        )}
                      >
                        <span className="relative shrink-0">
                          <item.icon aria-hidden="true" className="size-5" />
                          {item.id === 'notifications' && (
                            <UnreadBadge className="absolute -top-2 -right-3" />
                          )}
                        </span>
                        <span className={labelClassName}>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-forest/10 p-3">
        <LogoutButton
          className={cn('w-full', !collapsed && 'lg:justify-start')}
          labelClassName={labelClassName}
        />
        <button
          type="button"
          onClick={onToggleCollapsed}
          className={cn(
            'hidden min-h-11 w-full items-center justify-center gap-3 rounded-lg px-3 text-sm text-charcoal/70 hover:bg-forest/5 lg:flex',
            !collapsed && 'lg:justify-start',
          )}
        >
          {collapsed ? (
            <PanelLeftOpen aria-hidden="true" className="size-5" />
          ) : (
            <PanelLeftClose aria-hidden="true" className="size-5" />
          )}
          <span className={labelClassName}>
            {collapsed ? 'Déplier le menu' : 'Replier le menu'}
          </span>
        </button>
      </div>
    </aside>
  );
}
