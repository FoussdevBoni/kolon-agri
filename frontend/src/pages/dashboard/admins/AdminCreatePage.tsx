import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { getErrorMessage } from '../../../core/api/apiError';
import { adminRoles, roleLabels } from '../../../core/auth/roles';
import { buttonClassName } from '../../../core/components/buttonStyles';
import { FormField, inputClassName } from '../../../core/components/FormField';
import { describedBy } from '../../../core/components/formFieldUtils';
import { UnsavedChangesGuard } from '../../../core/forms/UnsavedChangesGuard';
import { PasswordLinkPanel } from '../../../modules/admins/components/PasswordLinkPanel';
import { useCreateAdmin } from '../../../modules/admins/hooks/useAdmins';
import {
  type CreateAdminFormValues,
  createAdminFormSchema,
} from '../../../modules/admins/schemas/adminSchema';

export function AdminCreatePage() {
  const createAdmin = useCreateAdmin();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<CreateAdminFormValues>({
    resolver: zodResolver(createAdminFormSchema),
    defaultValues: { fullName: '', email: '', role: 'admin' },
  });

  const onSubmit = handleSubmit((values) =>
    createAdmin.mutate(values, { onSuccess: () => reset(values) }),
  );

  if (createAdmin.isSuccess) {
    const { admin, invitation } = createAdmin.data;
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-extrabold text-forest">Compte créé</h1>
        <p className="text-charcoal/75">
          Le compte de <strong>{admin.fullName}</strong> ({admin.email}) est en attente
          d’activation. Transmettez-lui le lien ci-dessous pour qu’il définisse son mot de passe.
        </p>
        <PasswordLinkPanel link={invitation} />
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link to={`../${admin.id}`} relative="path" className={buttonClassName('primary')}>
            Voir le compte
          </Link>
          <Link to=".." relative="path" className={buttonClassName('secondary')}>
            Retour à la liste
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <UnsavedChangesGuard when={isDirty && !createAdmin.isPending} />
      <Link
        to=".."
        relative="path"
        className="inline-flex items-center gap-2 text-sm font-semibold text-forest"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Administrateurs
      </Link>
      <h1 className="text-2xl font-extrabold text-forest">Nouvel administrateur</h1>

      {createAdmin.isError && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {getErrorMessage(createAdmin.error)}
        </p>
      )}

      <form
        onSubmit={(event) => void onSubmit(event)}
        noValidate
        className="space-y-5 rounded-xl border border-forest/10 bg-white p-5 sm:p-6"
      >
        <FormField id="admin-full-name" label="Nom complet" error={errors.fullName?.message}>
          <input
            id="admin-full-name"
            autoComplete="off"
            className={inputClassName}
            aria-invalid={errors.fullName ? true : undefined}
            aria-describedby={describedBy('admin-full-name', errors.fullName?.message)}
            {...register('fullName')}
          />
        </FormField>
        <FormField id="admin-email" label="Adresse email" error={errors.email?.message}>
          <input
            id="admin-email"
            type="email"
            autoComplete="off"
            className={inputClassName}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={describedBy('admin-email', errors.email?.message)}
            {...register('email')}
          />
        </FormField>
        <FormField id="admin-role" label="Rôle" error={errors.role?.message}>
          <select id="admin-role" className={inputClassName} {...register('role')}>
            {adminRoles.map((role) => (
              <option key={role} value={role}>
                {roleLabels[role]}
              </option>
            ))}
          </select>
        </FormField>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={createAdmin.isPending}
            className={buttonClassName('primary', 'w-full sm:w-auto')}
          >
            {createAdmin.isPending ? 'Création…' : 'Créer et générer l’invitation'}
          </button>
        </div>
      </form>
    </div>
  );
}
