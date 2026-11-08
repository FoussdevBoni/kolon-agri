import { zodResolver } from '@hookform/resolvers/zod';
import { CircleCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router';
import { getErrorMessage } from '../../core/api/apiError';
import { LOGIN_PATH } from '../../core/auth/RequireAuth';
import { buttonClassName } from '../../core/components/buttonStyles';
import { FormField, inputClassName } from '../../core/components/FormField';
import { describedBy } from '../../core/components/formFieldUtils';
import { useSetPassword } from '../../modules/auth/hooks/useAuthMutations';
import {
  PASSWORD_MIN_LENGTH,
  readTokenFromHash,
  type SetPasswordFormValues,
  setPasswordFormSchema,
} from '../../modules/auth/schemas/authFormSchema';

const passwordHint = `${PASSWORD_MIN_LENGTH} caractères minimum. Une phrase de passe est recommandée.`;

export function SetPasswordPage() {
  // Lecture via la location du routeur (et non window.location), conservée après nettoyage de l'URL.
  const location = useLocation();
  const navigate = useNavigate();
  const [token] = useState(() => readTokenFromHash(location.hash));
  const setPassword = useSetPassword();

  // Retire le jeton de la barre d'adresse et de l'historique dès sa lecture.
  useEffect(() => {
    if (location.hash) {
      void navigate({ pathname: location.pathname, search: location.search }, { replace: true });
    }
  }, [location.hash, location.pathname, location.search, navigate]);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetPasswordFormValues>({
    resolver: zodResolver(setPasswordFormSchema),
    defaultValues: { password: '', confirmation: '' },
  });

  if (!token) {
    return (
      <div role="alert">
        <h1 className="text-2xl font-extrabold text-forest">Lien invalide</h1>
        <p className="mt-2 text-sm text-charcoal/75">
          Ce lien est incomplet. Demandez un nouveau lien depuis « Mot de passe oublié » ou à un
          super-administrateur.
        </p>
      </div>
    );
  }

  if (setPassword.isSuccess) {
    return (
      <div role="status" className="text-center">
        <CircleCheck aria-hidden="true" className="mx-auto size-10 text-leaf" />
        <h1 className="mt-4 text-2xl font-extrabold text-forest">Mot de passe enregistré</h1>
        <p className="mt-2 text-sm text-charcoal/75">Vous pouvez maintenant vous connecter.</p>
        <Link to={LOGIN_PATH} className={buttonClassName('primary', 'mt-6 w-full')}>
          Se connecter
        </Link>
      </div>
    );
  }

  const onSubmit = handleSubmit(({ password }) => setPassword.mutate({ token, password }));

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-forest">Définir votre mot de passe</h1>
      <p className="mt-1 text-sm text-charcoal/70">Ce lien est à usage unique.</p>
      {setPassword.isError && (
        <p role="alert" className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {getErrorMessage(setPassword.error)}
        </p>
      )}
      <form onSubmit={(event) => void onSubmit(event)} noValidate className="mt-6 space-y-5">
        <FormField
          id="new-password"
          label="Nouveau mot de passe"
          error={errors.password?.message}
          hint={passwordHint}
        >
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            className={inputClassName}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={describedBy('new-password', errors.password?.message, passwordHint)}
            {...register('password')}
          />
        </FormField>
        <FormField
          id="password-confirmation"
          label="Confirmation"
          error={errors.confirmation?.message}
        >
          <input
            id="password-confirmation"
            type="password"
            autoComplete="new-password"
            className={inputClassName}
            aria-invalid={errors.confirmation ? true : undefined}
            aria-describedby={describedBy('password-confirmation', errors.confirmation?.message)}
            {...register('confirmation')}
          />
        </FormField>
        <button
          type="submit"
          disabled={setPassword.isPending}
          className={buttonClassName('primary', 'w-full')}
        >
          {setPassword.isPending ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
        </button>
      </form>
    </div>
  );
}
