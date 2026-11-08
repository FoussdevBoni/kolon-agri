import { Outlet } from 'react-router';
import { MAIN_CONTENT_ID } from '../core/components/SkipLink';
import { useNoIndex } from '../core/hooks/useDocumentMeta';

/** Mise en page des écrans d'authentification (routes ajoutées au lot 2). */
export function AuthLayout() {
  useNoIndex('Espace administrateur');
  return (
    <div className="flex min-h-dvh items-center justify-center bg-ivory px-4 py-12 [color-scheme:light]">
      <main id={MAIN_CONTENT_ID} className="w-full max-w-md">
        <p className="mb-8 text-center font-display text-2xl font-extrabold text-forest">
          Kolon Agri
        </p>
        <div className="rounded-2xl border border-forest/10 bg-white p-6 shadow-sm sm:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
