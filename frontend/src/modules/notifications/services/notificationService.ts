import { z } from 'zod';
import { apiClient } from '../../../core/api/apiClient';
import { paginationMetaSchema } from '../../../core/api/paginationSchema';
import { trackedTypes } from '../../../core/requests/requestSchema';

export const notificationSchema = z.object({
  id: z.string(),
  kind: z.enum(['requestCreated', 'assigned', 'requestUpdated']),
  title: z.string(),
  body: z.string(),
  reference: z.string(),
  target: z.object({ type: z.enum(trackedTypes), id: z.string() }),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});
export type AppNotification = z.infer<typeof notificationSchema>;

const listMetaSchema = paginationMetaSchema.extend({ unreadCount: z.number().int() });
export type NotificationListMeta = z.infer<typeof listMetaSchema>;

export async function fetchNotifications(
  query: { page: number; unread: boolean },
  signal?: AbortSignal,
): Promise<{ items: AppNotification[]; meta: NotificationListMeta }> {
  const response = await apiClient.get('/notifications', z.array(notificationSchema), {
    signal,
    query: { page: query.page, limit: 20, unread: query.unread ? 'true' : undefined },
  });
  return { items: response.data, meta: listMetaSchema.parse(response.meta) };
}

export async function fetchUnreadCount(signal?: AbortSignal): Promise<number> {
  const { data } = await apiClient.get(
    '/notifications/unread-count',
    z.object({ unreadCount: z.number().int() }),
    { signal },
  );
  return data.unreadCount;
}

export async function markNotificationRead(id: string): Promise<AppNotification> {
  return (
    await apiClient.patch(`/notifications/${encodeURIComponent(id)}/read`, notificationSchema)
  ).data;
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.patch(
    '/notifications/read-all',
    z.object({ updated: z.number(), unreadCount: z.number() }),
  );
}
