import { Link } from 'react-router';
import { buttonClassName } from '../core/components/buttonStyles';

export function NotFoundPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-ivory px-4 text-center">
      <p className="text-sm font-semibold text-leaf">Erreur 404</p>
      <h1 className="mt-2 text-3xl font-extrabold text-forest">Page introuvable</h1>
      <p className="mt-3 max-w-md text-charcoal/75">
        La page demandée n’existe pas ou a été déplacée.
      </p>
      <Link to="/" className={buttonClassName('primary', 'mt-8')}>
        Retour à l’accueil
      </Link>
    </main>
  );
}
