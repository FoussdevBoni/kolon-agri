import { LogOut } from 'lucide-react';
import { useLogout } from '../../modules/auth/hooks/useAuthMutations';
import { cn } from '../../core/utils/cn';

interface LogoutButtonProps {
  className?: string;
  labelClassName?: string;
}

export function LogoutButton({ className, labelClassName }: LogoutButtonProps) {
  const logout = useLogout();
  return (
    <button
      type="button"
      title="Se déconnecter"
      disabled={logout.isPending}
      onClick={() => logout.mutate()}
      className={cn(
        'flex min-h-11 items-center justify-center gap-3 rounded-lg px-3 text-sm font-medium text-charcoal/75 hover:bg-forest/5 hover:text-forest disabled:opacity-60',
        className,
      )}
    >
      <LogOut aria-hidden="true" className="size-5 shrink-0" />
      <span className={labelClassName}>{logout.isPending ? 'Déconnexion…' : 'Se déconnecter'}</span>
    </button>
  );
}
