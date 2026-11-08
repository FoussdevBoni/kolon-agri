import { Router } from 'express';
import { noStore } from '../../core/middlewares/noStore.js';
import { requireAuth } from '../auth/authMiddleware.js';
import * as notificationController from './notificationController.js';

/** Notifications du compte connecté uniquement (filtre systématique sur le destinataire). */
export const notificationRoutes = Router();

notificationRoutes.use(noStore, requireAuth);

notificationRoutes.get('/', notificationController.listNotifications);
notificationRoutes.get('/unread-count', notificationController.getUnreadCount);
notificationRoutes.patch('/read-all', notificationController.markAllAsRead);
notificationRoutes.patch('/:id/read', notificationController.markAsRead);
