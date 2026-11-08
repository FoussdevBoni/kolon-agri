import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router';
import { buttonClassName } from './buttonStyles';
import { EmptyState } from './EmptyState';

export function AccessDeniedState() {
  return (
    <div className="mx-auto max-w-3xl">
      <EmptyState
        icon={ShieldAlert}
        title="Accès refusé"
        description="Cet espace est réservé aux super-administrateurs."
        action={
          <Link to="/dashboard" className={buttonClassName('secondary')}>
            Retour au tableau de bord
          </Link>
        }
      />
    </div>
  );
}
