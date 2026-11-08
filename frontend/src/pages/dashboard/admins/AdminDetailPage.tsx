import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router';
import { getErrorMessage } from '../../../core/api/apiError';
import { useCurrentSession } from '../../../core/auth/currentSessionContext';
import { type AdminRole, adminRoles, roleLabels } from '../../../core/auth/roles';
import type { AdminUser } from '../../../core/auth/sessionSchema';
import { buttonClassName } from '../../../core/components/buttonStyles';
import { ConfirmDialog } from '../../../core/components/ConfirmDialog';
import { ErrorState } from '../../../core/components/ErrorState';
import { FormField, inputClassName } from '../../../core/components/FormField';
import { describedBy } from '../../../core/components/formFieldUtils';
import { LoadingState } from '../../../core/components/LoadingState';
import { UnsavedChangesGuard } from '../../../core/forms/UnsavedChangesGuard';
import { formatDateTime } from '../../../core/utils/formatDate';
import { AdminStatusBadge } from '../../../modules/admins/components/AdminStatusBadge';
import { PasswordLinkPanel } from '../../../modules/admins/components/PasswordLinkPanel';
import { useAdmin, useAdminMutations } from '../../../modules/admins/hooks/useAdmins';
import {
  type AdminProfileFormValues,
  adminProfileFormSchema,
} from '../../../modules/admins/schemas/adminSchema';

const sectionClassName = 'space-y-4 rounded-xl border border-forest/10 bg-white p-5 sm:p-6';

function MutationError({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
      {getErrorMessage(error)}
    </p>
  );
}

function ProfileSection({
  admin,
  mutations,
}: {
  admin: AdminUser;
  mutations: ReturnType<typeof useAdminMutations>;
}) {
  const { updateProfile } = mutations;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<AdminProfileFormValues>({
    resolver: zodResolver(adminProfileFormSchema),
    values: { fullName: admin.fullName, email: admin.email },
  });

  const onSubmit = handleSubmit((values) =>
    updateProfile.mutate(values, {
      onSuccess: (updated) => reset({ fullName: updated.fullName, email: updated.email }),
    }),
  );

  return (
    <section aria-labelledby="profile-title" className={sectionClassName}>
      <UnsavedChangesGuard when={isDirty && !updateProfile.isPending} />
      <h2 id="profile-title" className="text-lg font-bold">
        Informations
      </h2>
      <MutationError error={updateProfile.error} />
      {updateProfile.isSuccess && !isDirty && (
        <p role="status" className="text-sm text-forest">
          Modifications enregistrées.
        </p>
      )}
      <form onSubmit={(event) => void onSubmit(event)} noValidate className="space-y-4">
        <FormField id="detail-full-name" label="Nom complet" error={errors.fullName?.message}>
          <input
            id="detail-full-name"
            className={inputClassName}
            aria-invalid={errors.fullName ? true : undefined}
            aria-describedby={describedBy('detail-full-name', errors.fullName?.message)}
            {...register('fullName')}
          />
        </FormField>
        <FormField id="detail-email" label="Adresse email" error={errors.email?.message}>
          <input
            id="detail-email"
            type="email"
            className={inputClassName}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={describedBy('detail-email', errors.email?.message)}
            {...register('email')}
          />
        </FormField>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={!isDirty || updateProfile.isPending}
            onClick={() => reset()}
            className={buttonClassName('secondary')}
          >
            Annuler les modifications
          </button>
          <button
            type="submit"
            disabled={!isDirty || updateProfile.isPending}
            className={buttonClassName('primary')}
          >
            {updateProfile.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </section>
  );
}

function AccessSection({
  admin,
  isSelf,
  mutations,
}: {
  admin: AdminUser;
  isSelf: boolean;
  mutations: ReturnType<typeof useAdminMutations>;
}) {
  const { changeRole, changeStatus, issuePasswordLink } = mutations;
  const [selectedRole, setSelectedRole] = useState<AdminRole>(admin.role);
  const [confirm, setConfirm] = useState<'role' | 'disable' | null>(null);
  const isDisabled = admin.status === 'disabled';

  const closeConfirm = () => setConfirm(null);

  return (
    <section aria-labelledby="access-title" className={sectionClassName}>
      <h2 id="access-title" className="text-lg font-bold">
        Accès
      </h2>
      <MutationError error={changeRole.error ?? changeStatus.error ?? issuePasswordLink.error} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <FormField id="detail-role" label="Rôle">
            <select
              id="detail-role"
              value={selectedRole}
              onChange={(event) => setSelectedRole(event.target.value as AdminRole)}
              className={inputClassName}
            >
              {adminRoles.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
          </FormField>
        </div>
        <button
          type="button"
          disabled={selectedRole === admin.role || changeRole.isPending}
          onClick={() => setConfirm('role')}
          className={buttonClassName('secondary')}
        >
          Modifier le rôle
        </button>
      </div>

      <div className="flex flex-col gap-3 border-t border-forest/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-charcoal/75">
          {isDisabled
            ? 'Compte désactivé : aucune connexion possible.'
            : 'La désactivation déconnecte immédiatement toutes les sessions du compte.'}
        </p>
        {isDisabled ? (
          <button
            type="button"
            disabled={changeStatus.isPending}
            onClick={() => changeStatus.mutate('active')}
            className={buttonClassName('primary')}
          >
            {changeStatus.isPending ? 'Réactivation…' : 'Réactiver le compte'}
          </button>
        ) : (
          <button
            type="button"
            disabled={changeStatus.isPending}
            onClick={() => setConfirm('disable')}
            className={buttonClassName('secondary', 'border-red-200 text-red-700 hover:bg-red-50')}
          >
            Désactiver le compte
          </button>
        )}
      </div>

      {!isDisabled && (
        <div className="space-y-3 border-t border-forest/10 pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-charcoal/75">
              {admin.status === 'pending'
                ? 'Invitation non acceptée : générez un nouveau lien si nécessaire.'
                : 'Mot de passe oublié : générez un lien de réinitialisation à usage unique.'}
            </p>
            <button
              type="button"
              disabled={issuePasswordLink.isPending}
              onClick={() => issuePasswordLink.mutate()}
              className={buttonClassName('secondary')}
            >
              {admin.status === 'pending'
                ? 'Nouveau lien d’invitation'
                : 'Lien de réinitialisation'}
            </button>
          </div>
          {issuePasswordLink.data && <PasswordLinkPanel link={issuePasswordLink.data} />}
        </div>
      )}

      <ConfirmDialog
        open={confirm === 'role'}
        title="Modifier le rôle"
        description={`${admin.fullName} deviendra « ${roleLabels[selectedRole]} ».${isSelf ? ' Vous modifiez votre propre compte.' : ''}`}
        confirmLabel="Confirmer"
        pending={changeRole.isPending}
        onCancel={closeConfirm}
        onConfirm={() => changeRole.mutate(selectedRole, { onSettled: closeConfirm })}
      />
      <ConfirmDialog
        open={confirm === 'disable'}
        title="Désactiver le compte"
        description={`${admin.fullName} sera déconnecté immédiatement et ne pourra plus se connecter.${isSelf ? ' Vous serez vous-même déconnecté.' : ''}`}
        confirmLabel="Désactiver"
        tone="danger"
        pending={changeStatus.isPending}
        onCancel={closeConfirm}
        onConfirm={() => changeStatus.mutate('disabled', { onSettled: closeConfirm })}
      />
    </section>
  );
}

export function AdminDetailPage() {
  const { id = '' } = useParams();
  const { user } = useCurrentSession();
  const admin = useAdmin(id);
  const mutations = useAdminMutations(id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        to=".."
        relative="path"
        className="inline-flex items-center gap-2 text-sm font-semibold text-forest"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Administrateurs
      </Link>

      {admin.isPending ? (
        <LoadingState label="Chargement du compte…" />
      ) : admin.isError ? (
        <ErrorState message={getErrorMessage(admin.error)} onRetry={() => void admin.refetch()} />
      ) : (
        <>
          <div>
            <h1 className="text-2xl font-extrabold text-forest">
              {admin.data.fullName}
              {admin.data.id === user.id && (
                <span className="text-base font-normal text-charcoal/60"> (vous)</span>
              )}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-charcoal/70">
              <AdminStatusBadge status={admin.data.status} />
              <span>{roleLabels[admin.data.role]}</span>
              <span>Dernière connexion : {formatDateTime(admin.data.lastLoginAt, 'jamais')}</span>
            </div>
          </div>
          <ProfileSection admin={admin.data} mutations={mutations} />
          <AccessSection
            key={`${admin.data.role}-${admin.data.status}`}
            admin={admin.data}
            isSelf={admin.data.id === user.id}
            mutations={mutations}
          />
        </>
      )}
    </div>
  );
}
