import { Router } from 'express';
import { noStore } from '../../core/middlewares/noStore.js';
import * as authController from './authController.js';
import { requireAuth } from './authMiddleware.js';

export const authRoutes = Router();

authRoutes.use(noStore);

authRoutes.post('/login', authController.login);
authRoutes.post('/forgot-password', authController.forgotPassword);
authRoutes.post('/reset-password', authController.resetPassword);

authRoutes.post('/logout', requireAuth, authController.logout);
authRoutes.get('/me', requireAuth, authController.getMe);
authRoutes.get('/sessions', requireAuth, authController.listSessions);
authRoutes.delete('/sessions/:id', requireAuth, authController.revokeSession);
authRoutes.patch('/password', requireAuth, authController.changePassword);
