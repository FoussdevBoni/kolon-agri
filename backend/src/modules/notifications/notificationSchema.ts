import { z } from 'zod';
import { paginationQuerySchema } from '../../core/http/commonSchema.js';
import { trackedTypes } from '../../core/requests/requestActivityModel.js';
import { notificationKinds } from './notificationModel.js';

export const listNotificationsQuerySchema = paginationQuerySchema.extend({
  unread: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;

export const notificationDtoSchema = z.object({
  id: z.string(),
  kind: z.enum(notificationKinds),
  title: z.string(),
  body: z.string(),
  reference: z.string(),
  target: z.object({ type: z.enum(trackedTypes), id: z.string() }),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});
export type NotificationDto = z.infer<typeof notificationDtoSchema>;

export const unreadCountSchema = z.object({ unreadCount: z.number().int().min(0) });
