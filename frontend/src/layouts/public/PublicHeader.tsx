import { Menu, X } from 'lucide-react';
import { useId, useState } from 'react';
import { Link, NavLink } from 'react-router';
import { publicNavItems } from '../../core/navigation/publicNavigation';
import { cn } from '../../core/utils/cn';
import { QuotationCartLink } from '../../modules/quotations/components/QuotationCartLink';

function navLinkClassName({ isActive }: { isActive: boolean }): string {
  return cn(
    'rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'text-forest' : 'text-charcoal/75 hover:text-forest',
  );
}

export function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-forest/10 bg-ivory/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="font-display text-xl font-extrabold text-forest"
          onClick={closeMenu}
        >
          Kolon Agri
        </Link>

        <nav aria-label="Navigation principale" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {publicNavItems.map((item) => (
              <li key={item.path}>
                <NavLink to={item.path} end={item.path === '/'} className={navLinkClassName}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <QuotationCartLink className="hidden sm:inline-flex" />
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-lg text-forest hover:bg-forest/5 lg:hidden"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? (
              <X aria-hidden="true" className="size-6" />
            ) : (
              <Menu aria-hidden="true" className="size-6" />
            )}
          </button>
        </div>
      </div>

      <nav
        id={menuId}
        aria-label="Navigation principale mobile"
        hidden={!menuOpen}
        className="border-t border-forest/10 bg-ivory px-4 pb-6 lg:hidden"
      >
        <ul className="flex flex-col py-2">
          {publicNavItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  cn(navLinkClassName({ isActive }), 'block py-3 text-base')
                }
                onClick={closeMenu}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <QuotationCartLink className="w-full" onClick={closeMenu} />
      </nav>
    </header>
  );
}
