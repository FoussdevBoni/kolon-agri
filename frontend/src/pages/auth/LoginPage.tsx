import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useSearchParams } from 'react-router';
import { getErrorMessage } from '../../core/api/apiError';
import { SESSION_EXPIRED_REASON } from '../../core/auth/RequireAuth';
import { useSessionState } from '../../core/auth/sessionQuery';
import { buttonClassName } from '../../core/components/buttonStyles';
import { FormField, inputClassName } from '../../core/components/FormField';
import { describedBy } from '../../core/components/formFieldUtils';
import { LoadingState } from '../../core/components/LoadingState';
import { useLogin } from '../../modules/auth/hooks/useAuthMutations';
import {
  type LoginFormValues,
  loginFormSchema,
  safeDashboardRedirect,
} from '../../modules/auth/schemas/authFormSchema';

const notices: Record<string, string> = {
  [SESSION_EXPIRED_REASON]: 'Votre session a expiré. Veuillez vous reconnecter.',
  deconnexion: 'Vous avez été déconnecté.',
};

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const sessionState = useSessionState();
  const login = useLogin();
  const redirectTo = safeDashboardRedirect(searchParams.get('redirect'));
  const notice = notices[searchParams.get('raison') ?? ''];

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  });

  if (sessionState.isPending) return <LoadingState label="Vérification de la session…" />;
  // Déjà connecté, ou connexion réussie : la session mise en cache déclenche la redirection.
  if (sessionState.data?.status === 'authenticated') {
    return <Navigate to={redirectTo} replace />;
  }

  const onSubmit = handleSubmit((values) => login.mutate(values));

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-forest">Connexion</h1>
      <p className="mt-1 text-sm text-charcoal/70">Espace réservé à l’équipe Kolon Agri.</p>

      {notice && !login.isError && (
        <p role="status" className="mt-5 rounded-lg bg-sand/50 px-4 py-3 text-sm">
          {notice}
        </p>
      )}
      {login.isError && (
        <p role="alert" className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {getErrorMessage(login.error)}
        </p>
      )}

      <form onSubmit={(event) => void onSubmit(event)} noValidate className="mt-6 space-y-5">
        <FormField id="login-email" label="Adresse email" error={errors.email?.message}>
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            inputMode="email"
            className={inputClassName}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={describedBy('login-email', errors.email?.message)}
            {...register('email')}
          />
        </FormField>
        <FormField id="login-password" label="Mot de passe" error={errors.password?.message}>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            className={inputClassName}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={describedBy('login-password', errors.password?.message)}
            {...register('password')}
          />
        </FormField>
        <button
          type="submit"
          disabled={login.isPending}
          className={buttonClassName('primary', 'w-full')}
        >
          {login.isPending ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
      <p className="mt-6 text-sm">
        <Link to="/mot-de-passe-oublie" className="font-semibold text-forest hover:underline">
          Mot de passe oublié ?
        </Link>
      </p>
    </div>
  );
}
