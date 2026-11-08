import { Ellipsis, X } from 'lucide-react';
import { useId, useRef } from 'react';
import { Link, useLocation } from 'react-router';
import type { AdminRole } from '../../core/auth/roles';
import {
  dashboardMobileTabs,
  findActiveNavItem,
  getMoreItems,
} from '../../core/navigation/dashboardNavigation';
import { cn } from '../../core/utils/cn';
import { UnreadBadge } from '../../modules/notifications/components/UnreadBadge';
import { LogoutButton } from './LogoutButton';

const tabClassName = (isActive: boolean) =>
  cn(
    'flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium',
    isActive ? 'text-forest' : 'text-charcoal/60',
  );

/** Barre de navigation inférieure mobile : Accueil, Demandes, Produits, Alertes, Plus. */
export function DashboardBottomNav({ role }: { role: AdminRole }) {
  const { pathname } = useLocation();
  const activeItem = findActiveNavItem(pathname);
  const activeTab = activeItem?.mobileTab;
  const isMoreActive = activeItem !== undefined && activeTab === undefined;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const closeMore = () => dialogRef.current?.close();

  return (
    <>
      <nav
        aria-label="Navigation mobile"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-forest/10 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="grid grid-cols-5">
          {dashboardMobileTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <li key={tab.id}>
                <Link
                  to={tab.path}
                  aria-current={isActive ? 'page' : undefined}
                  className={tabClassName(isActive)}
                >
                  <span className="relative">
                    <tab.icon aria-hidden="true" className="size-5" />
                    {tab.id === 'alerts' && <UnreadBadge className="absolute -top-2 -right-3" />}
                  </span>
                  {tab.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => dialogRef.current?.showModal()}
              className={cn(tabClassName(isMoreActive), 'w-full')}
            >
              <Ellipsis aria-hidden="true" className="size-5" />
              Plus
            </button>
          </li>
        </ul>
      </nav>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="mx-0 mt-auto mb-0 max-h-[80dvh] w-full max-w-none rounded-t-2xl bg-white p-0 text-charcoal backdrop:bg-charcoal/40 md:hidden"
        onClick={(event) => {
          if (event.target === event.currentTarget) closeMore();
        }}
      >
        <div className="flex items-center justify-between border-b border-forest/10 px-4 py-3">
          <h2 id={titleId} className="text-base font-bold">
            Plus de modules
          </h2>
          <button
            type="button"
            onClick={closeMore}
            aria-label="Fermer"
            className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-forest/5"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <ul className="grid grid-cols-3 gap-2 p-4">
          {getMoreItems(role).map((item) => {
            const isActive = activeItem?.id === item.id;
            return (
              <li key={item.id}>
                <Link
                  to={item.path}
                  onClick={closeMore}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl px-2 text-center text-xs font-medium',
                    isActive ? 'bg-forest text-ivory' : 'bg-ivory text-charcoal hover:bg-sand/50',
                  )}
                >
                  <item.icon aria-hidden="true" className="size-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="border-t border-forest/10 px-4 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
          <LogoutButton className="w-full justify-start" />
        </div>
      </dialog>
    </>
  );
}
