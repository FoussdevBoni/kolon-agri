import type { RequestHandler } from 'express';
import { sendSuccess } from '../../core/http/apiResponse.js';
import { idParamsSchema } from '../../core/http/commonSchema.js';
import { parseInput } from '../../core/http/validation.js';
import { getAuth } from '../auth/authMiddleware.js';
import { listNotificationsQuerySchema } from './notificationSchema.js';
import * as notificationService from './notificationService.js';

export const listNotifications: RequestHandler = async (req, res) => {
  const query = parseInput(listNotificationsQuerySchema, req.query);
  const { items, meta } = await notificationService.listNotifications(getAuth(req).userId, query);
  sendSuccess(res, items, { meta: { ...meta } });
};

export const getUnreadCount: RequestHandler = async (req, res) => {
  sendSuccess(res, { unreadCount: await notificationService.countUnread(getAuth(req).userId) });
};

export const markAsRead: RequestHandler = async (req, res) => {
  const { id } = parseInput(idParamsSchema, req.params);
  sendSuccess(res, await notificationService.markAsRead(getAuth(req).userId, id));
};

export const markAllAsRead: RequestHandler = async (req, res) => {
  const updated = await notificationService.markAllAsRead(getAuth(req).userId);
  sendSuccess(res, { updated, unreadCount: 0 });
};
