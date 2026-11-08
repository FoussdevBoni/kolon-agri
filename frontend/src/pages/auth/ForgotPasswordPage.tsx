import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { getErrorMessage } from '../../core/api/apiError';
import { LOGIN_PATH } from '../../core/auth/RequireAuth';
import { buttonClassName } from '../../core/components/buttonStyles';
import { FormField, inputClassName } from '../../core/components/FormField';
import { describedBy } from '../../core/components/formFieldUtils';
import { useForgotPassword } from '../../modules/auth/hooks/useAuthMutations';
import {
  type ForgotPasswordFormValues,
  forgotPasswordFormSchema,
} from '../../modules/auth/schemas/authFormSchema';

/** Demande de lien de réinitialisation : message identique que le compte existe ou non. */
export function ForgotPasswordPage() {
  const forgot = useForgotPassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: { email: '' },
  });

  const backLink = (
    <Link
      to={LOGIN_PATH}
      className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-forest hover:underline"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      Retour à la connexion
    </Link>
  );

  if (forgot.isSuccess) {
    return (
      <div role="status">
        <MailCheck aria-hidden="true" className="size-10 text-leaf" />
        <h1 className="mt-4 text-2xl font-extrabold text-forest">Vérifiez votre messagerie</h1>
        <p className="mt-2 text-sm text-charcoal/75">
          Si un compte actif correspond à cette adresse, un lien de réinitialisation vient de lui
          être envoyé. Il est valable 24 heures et ne peut servir qu’une fois.
        </p>
        <p className="mt-2 text-sm text-charcoal/75">
          Rien reçu après quelques minutes ? Vérifiez les courriers indésirables ou contactez un
          super-administrateur.
        </p>
        {backLink}
      </div>
    );
  }

  const onSubmit = handleSubmit((values) => forgot.mutate(values.email));

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-forest">Mot de passe oublié</h1>
      <p className="mt-1 text-sm text-charcoal/70">
        Indiquez l’adresse de votre compte : nous vous enverrons un lien pour choisir un nouveau mot
        de passe.
      </p>
      {forgot.isError && (
        <p role="alert" className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {getErrorMessage(forgot.error)}
        </p>
      )}
      <form onSubmit={(event) => void onSubmit(event)} noValidate className="mt-6 space-y-5">
        <FormField id="forgot-email" label="Adresse email" error={errors.email?.message}>
          <input
            id="forgot-email"
            type="email"
            autoComplete="username"
            inputMode="email"
            className={inputClassName}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={describedBy('forgot-email', errors.email?.message)}
            {...register('email')}
          />
        </FormField>
        <button
          type="submit"
          disabled={forgot.isPending}
          className={buttonClassName('primary', 'w-full')}
        >
          {forgot.isPending ? 'Envoi…' : 'Recevoir un lien'}
        </button>
      </form>
      {backLink}
    </div>
  );
}
