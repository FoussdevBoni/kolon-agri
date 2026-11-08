import { Bell, CheckCheck, ChevronRight } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';
import { getErrorMessage } from '../../core/api/apiError';
import { buttonClassName } from '../../core/components/buttonStyles';
import { EmptyState } from '../../core/components/EmptyState';
import { ErrorState } from '../../core/components/ErrorState';
import { LoadingState } from '../../core/components/LoadingState';
import { Pagination } from '../../core/components/Pagination';
import { trackedDetailPath, trackedTypeLabels } from '../../core/requests/requestSchema';
import { cn } from '../../core/utils/cn';
import { formatDateTime } from '../../core/utils/formatDate';
import {
  useNotificationActions,
  useNotificationList,
} from '../../modules/notifications/hooks/useNotifications';
import type { AppNotification } from '../../modules/notifications/services/notificationService';

const kindLabels: Record<AppNotification['kind'], string> = {
  requestCreated: 'Nouveau',
  assigned: 'Affectation',
  requestUpdated: 'Mise à jour',
};

/** Centre de notifications : lecture, marquage et accès direct à l'élément concerné. */
export function NotificationsPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const unreadOnly = params.get('filtre') === 'non-lues';
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);
  const list = useNotificationList(page, unreadOnly);
  const { markRead, markAllRead } = useNotificationActions();

  const open = (notification: AppNotification) => {
    const path = trackedDetailPath[notification.target.type](notification.target.id);
    if (notification.readAt) {
      void navigate(path);
      return;
    }
    // La navigation n'attend pas : un échec du marquage n'empêche pas d'ouvrir la fiche.
    markRead.mutate(notification.id);
    void navigate(path);
  };

  const setFilter = (unread: boolean) => {
    const next = new URLSearchParams();
    if (unread) next.set('filtre', 'non-lues');
    setParams(next);
  };

  const unreadCount = list.data?.meta.unreadCount ?? 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-forest">Notifications</h1>
          <p className="mt-1 text-sm text-charcoal/70">
            {unreadCount === 0
              ? 'Tout est lu.'
              : `${String(unreadCount)} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}.`}
          </p>
        </div>
        <button
          type="button"
          disabled={unreadCount === 0 || markAllRead.isPending}
          onClick={() => markAllRead.mutate()}
          className={buttonClassName('secondary')}
        >
          <CheckCheck aria-hidden="true" className="size-4" />
          Tout marquer comme lu
        </button>
      </div>

      <div className="flex gap-2" role="group" aria-label="Filtre">
        {[
          { unread: false, label: 'Toutes' },
          { unread: true, label: 'Non lues' },
        ].map((option) => (
          <button
            key={option.label}
            type="button"
            aria-pressed={unreadOnly === option.unread}
            onClick={() => setFilter(option.unread)}
            className={buttonClassName(
              unreadOnly === option.unread ? 'primary' : 'secondary',
              'min-h-10 px-4',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {(markRead.isError || markAllRead.isError) && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {getErrorMessage(markRead.error ?? markAllRead.error)}
        </p>
      )}

      {list.isPending ? (
        <LoadingState label="Chargement des notifications…" />
      ) : list.isError ? (
        <ErrorState message={getErrorMessage(list.error)} onRetry={() => void list.refetch()} />
      ) : list.data.items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={unreadOnly ? 'Aucune notification non lue' : 'Aucune notification'}
          description="Vous serez notifié des nouvelles demandes, des affectations et des mises à jour de vos demandes."
        />
      ) : (
        <>
          <ul className="divide-y divide-forest/10 overflow-hidden rounded-xl border border-forest/10 bg-white">
            {list.data.items.map((notification) => {
              const unread = notification.readAt === null;
              return (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => open(notification)}
                    className={cn(
                      'flex w-full items-start gap-3 px-4 py-4 text-left hover:bg-ivory',
                      unread && 'bg-sand/25',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'mt-1.5 size-2.5 shrink-0 rounded-full',
                        unread ? 'bg-forest' : 'bg-transparent',
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2 text-xs text-charcoal/60">
                        <span className="font-semibold text-forest">
                          {kindLabels[notification.kind]}
                        </span>
                        <span>{trackedTypeLabels[notification.target.type]}</span>
                        <span>{formatDateTime(notification.createdAt)}</span>
                        {unread && <span className="sr-only">Non lue</span>}
                      </span>
                      <span className={cn('mt-1 block', unread && 'font-semibold')}>
                        {notification.title}
                      </span>
                      {notification.body && (
                        <span className="mt-0.5 block text-sm text-charcoal/70">
                          {notification.body}
                        </span>
                      )}
                    </span>
                    <ChevronRight aria-hidden="true" className="mt-1 size-5 text-charcoal/40" />
                  </button>
                </li>
              );
            })}
          </ul>
          <Pagination
            meta={list.data.meta}
            itemLabel={['notification', 'notifications']}
            onPageChange={(next) => {
              const nextParams = new URLSearchParams(params);
              nextParams.set('page', String(next));
              setParams(nextParams);
            }}
          />
        </>
      )}
    </div>
  );
}
