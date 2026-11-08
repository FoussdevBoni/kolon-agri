import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notificationService';

/** Rafraîchissement périodique raisonnable (sans WebSocket), suspendu onglet masqué. */
export const NOTIFICATION_POLL_MS = 60_000;

export const notificationKeys = {
  all: ['notifications'] as const,
  unread: ['notifications', 'unread-count'] as const,
  list: (page: number, unread: boolean) => ['notifications', 'list', page, unread] as const,
};

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: notificationKeys.unread,
    queryFn: ({ signal }) => fetchUnreadCount(signal),
    refetchInterval: NOTIFICATION_POLL_MS,
    refetchIntervalInBackground: false,
    staleTime: 30_000,
  });
}

export function useNotificationList(page: number, unread: boolean) {
  return useQuery({
    queryKey: notificationKeys.list(page, unread),
    queryFn: ({ signal }) => fetchNotifications({ page, unread }, signal),
    placeholderData: keepPreviousData,
    refetchInterval: NOTIFICATION_POLL_MS,
  });
}

export function useNotificationActions() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: notificationKeys.all });
  return {
    markRead: useMutation({ mutationFn: markNotificationRead, onSuccess: refresh }),
    markAllRead: useMutation({ mutationFn: markAllNotificationsRead, onSuccess: refresh }),
  };
}
