import { Outlet } from 'react-router';
import { MAIN_CONTENT_ID, SkipLink } from '../core/components/SkipLink';
import { PublicFooter } from './public/PublicFooter';
import { PublicHeader } from './public/PublicHeader';

export function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-ivory text-charcoal">
      <SkipLink />
      <PublicHeader />
      <main id={MAIN_CONTENT_ID} className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}
