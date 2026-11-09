import { Menu, Search, X } from 'lucide-react';
import { useId, useState } from 'react';
import { Link, NavLink } from 'react-router';
import { publicNavItems } from '../../core/navigation/publicNavigation';
import { cn } from '../../core/utils/cn';
import { QuotationCartLink } from '../../modules/quotations/components/QuotationCartLink';

function navLinkClassName({ isActive }: { isActive: boolean }): string {
  return cn(
    'rounded-md px-2 py-2 text-sm font-medium whitespace-nowrap transition-colors',
    isActive
      ? 'text-forest underline decoration-leaf decoration-2 underline-offset-8'
      : 'text-charcoal/75 hover:text-forest',
  );
}

export function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-forest/10 bg-white">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2 font-display text-xl font-extrabold whitespace-nowrap text-forest"
          onClick={closeMenu}
        >
          <img src="/images/logo.jpg" alt="" width={44} height={44} className="size-11" />
          Kolon Agri
        </Link>

        <nav aria-label="Navigation principale" className="hidden xl:block">
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
          <Link
            to="/catalogue"
            aria-label="Rechercher dans le catalogue"
            className="hidden size-11 shrink-0 items-center justify-center rounded-lg border border-forest/20 text-forest hover:bg-sand/40 2xl:inline-flex"
          >
            <Search aria-hidden="true" className="size-5" />
          </Link>
          <span className="hidden sm:block">
            <QuotationCartLink className="whitespace-nowrap" />
          </span>
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-lg text-forest hover:bg-forest/5 xl:hidden"
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
        className="border-t border-forest/10 bg-white px-4 pb-6 xl:hidden"
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
