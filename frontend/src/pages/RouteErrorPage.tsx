import { isRouteErrorResponse, useRouteError } from 'react-router';
import { ErrorState } from '../core/components/ErrorState';
import { NotFoundPage } from './NotFoundPage';

/** Filet de sécurité des routes : erreurs de rendu ou de chargement de module. */
export function RouteErrorPage() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundPage />;
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-ivory px-4">
      <div className="w-full max-w-lg">
        <ErrorState
          title="Cette page ne peut pas s’afficher"
          message="Une erreur inattendue est survenue. Rechargez la page ou réessayez plus tard."
          onRetry={() => window.location.reload()}
        />
      </div>
    </main>
  );
}
