import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import { MessageSquareText } from 'lucide-react';
import { useState } from 'react';
import { getErrorMessage } from '../../../core/api/apiError';
import { useCurrentSession } from '../../../core/auth/currentSessionContext';
import { buttonClassName } from '../../../core/components/buttonStyles';
import { ConfirmDialog } from '../../../core/components/ConfirmDialog';
import { ErrorState } from '../../../core/components/ErrorState';
import { FormField, inputClassName } from '../../../core/components/FormField';
import { LoadingState } from '../../../core/components/LoadingState';
import {
  type Activity,
  type Assignee,
  statusLabel,
  type TrackedType,
} from '../../../core/requests/requestSchema';
import { formatDateTime } from '../../../core/utils/formatDate';
import { useAssignableAdmins } from '../hooks/useRequests';

const card = 'space-y-4 rounded-xl border border-forest/10 bg-white p-5';

interface ProcessingProps {
  type?: TrackedType;
  status: string;
  allowedTransitions: readonly string[];
  assignee: Assignee;
  changeStatus: UseMutationResult<unknown, Error, string>;
  assign: UseMutationResult<unknown, Error, string | null>;
  onReload: () => void;
}

/** Statut (transitions autorisées uniquement) et responsable unique facultatif. */
export function RequestProcessingPanel({
  type,
  status,
  allowedTransitions,
  assignee,
  changeStatus,
  assign,
  onReload,
}: ProcessingProps) {
  const { user } = useCurrentSession();
  const admins = useAssignableAdmins();
  const [target, setTarget] = useState<string | null>(null);
  const error = changeStatus.error ?? assign.error;
  const conflict = error && 'code' in error && error.code === 'CONCURRENT_UPDATE';

  return (
    <section aria-labelledby="processing-title" className={card}>
      <h2 id="processing-title" className="text-lg font-bold">
        Traitement
      </h2>
      {error && (
        <div role="alert" className="space-y-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          <p>{getErrorMessage(error)}</p>
          {conflict && (
            <button type="button" onClick={onReload} className={buttonClassName('secondary')}>
              Recharger
            </button>
          )}
        </div>
      )}
      <div>
        <p className="text-sm font-medium">Changer le statut</p>
        {allowedTransitions.length === 0 ? (
          <p className="mt-1 text-sm text-charcoal/60">
            Statut final : aucune autre étape possible.
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {allowedTransitions.map((next) => (
              <button
                key={next}
                type="button"
                disabled={changeStatus.isPending}
                onClick={() => setTarget(next)}
                className={buttonClassName(
                  next === 'rejected' || next === 'closed' ? 'secondary' : 'primary',
                  'min-h-10 px-3',
                )}
              >
                {statusLabel(next, type)}
              </button>
            ))}
          </div>
        )}
      </div>
      <FormField id="request-assignee" label="Responsable">
        <select
          id="request-assignee"
          value={assignee?.id ?? ''}
          disabled={assign.isPending || admins.isPending}
          onChange={(event) => assign.mutate(event.target.value || null)}
          className={inputClassName}
        >
          <option value="">Non affectée</option>
          {assignee && !admins.data?.some((admin) => admin.id === assignee.id) && (
            <option value={assignee.id}>{assignee.fullName}</option>
          )}
          {admins.data?.map((admin) => (
            <option key={admin.id} value={admin.id}>
              {admin.fullName}
              {admin.id === user.id ? ' (moi)' : ''}
            </option>
          ))}
        </select>
      </FormField>
      <ConfirmDialog
        open={target !== null}
        title="Changer le statut"
        description={`${type === 'contact' ? 'Le message passera' : 'La demande passera'} de « ${statusLabel(status, type)} » à « ${target ? statusLabel(target, type) : ''} ».`}
        confirmLabel="Confirmer"
        tone={target === 'rejected' || target === 'closed' ? 'danger' : 'default'}
        pending={changeStatus.isPending}
        onCancel={() => setTarget(null)}
        onConfirm={() => {
          if (target) changeStatus.mutate(target, { onSettled: () => setTarget(null) });
        }}
      />
    </section>
  );
}

function describe(activity: Activity, type?: TrackedType): string {
  const data = activity.data;
  const name = (value: unknown) =>
    value && typeof value === 'object' && 'fullName' in value && typeof value.fullName === 'string'
      ? value.fullName
      : 'personne';
  switch (activity.type) {
    case 'created':
      return type === 'contact' ? 'Message reçu depuis le site' : 'Demande reçue depuis le site';
    case 'statusChanged':
      return `Statut : ${statusLabel(String(data['from']), type)} → ${statusLabel(String(data['to']), type)}`;
    case 'assignmentChanged':
      return data['reason'] === 'accountDisabled'
        ? 'Affectation retirée (compte désactivé)'
        : `Responsable : ${name(data['from'])} → ${name(data['to'])}`;
    case 'note':
      return 'Note interne';
    case 'partnerAssociated':
      return `Partenaire associé : ${typeof data['partnerName'] === 'string' ? data['partnerName'] : ''}`;
    case 'partnerAssociationUpdated':
      return 'Association mise à jour';
    case 'partnerAssociationRemoved':
      return 'Association retirée';
  }
}

/** Historique interne et notes : jamais exposés publiquement. */
export function ActivityTimeline({
  type,
  activities,
  addNote,
}: {
  type?: TrackedType;
  activities: UseQueryResult<Activity[]>;
  addNote: UseMutationResult<unknown, Error, string>;
}) {
  const [note, setNote] = useState('');
  return (
    <section aria-labelledby="history-title" className={card}>
      <h2 id="history-title" className="text-lg font-bold">
        Historique et notes internes
      </h2>
      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!note.trim()) return;
          addNote.mutate(note.trim(), { onSuccess: () => setNote('') });
        }}
      >
        <FormField id="request-note" label="Ajouter une note interne">
          <textarea
            id="request-note"
            rows={3}
            maxLength={5000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className={`${inputClassName} py-2`}
          />
        </FormField>
        {addNote.isError && (
          <p role="alert" className="text-sm text-red-700">
            {getErrorMessage(addNote.error)}
          </p>
        )}
        <button
          type="submit"
          disabled={!note.trim() || addNote.isPending}
          className={buttonClassName('secondary')}
        >
          <MessageSquareText aria-hidden="true" className="size-4" />
          {addNote.isPending ? 'Ajout…' : 'Ajouter la note'}
        </button>
      </form>
      {activities.isPending ? (
        <LoadingState label="Chargement de l’historique…" />
      ) : activities.isError ? (
        <ErrorState
          message={getErrorMessage(activities.error)}
          onRetry={() => void activities.refetch()}
        />
      ) : (
        <ol className="space-y-3 border-l-2 border-forest/10 pl-4">
          {[...activities.data].reverse().map((activity) => (
            <li key={activity.id} className="text-sm">
              <p className="font-medium">{describe(activity, type)}</p>
              {activity.type === 'note' && typeof activity.data['content'] === 'string' && (
                <p className="mt-1 whitespace-pre-line rounded-lg bg-ivory px-3 py-2">
                  {activity.data['content']}
                </p>
              )}
              <p className="text-xs text-charcoal/60">
                {formatDateTime(activity.createdAt)} · {activity.actor?.fullName ?? 'Site public'}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
