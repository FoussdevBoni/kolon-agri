import { Router } from 'express';
import { noStore } from '../../core/middlewares/noStore.js';
import { requireAuth } from '../auth/authMiddleware.js';
import * as dashboardController from './dashboardController.js';

/** Vues transverses du tableau de bord (administrateurs). */
export const dashboardRoutes = Router();

dashboardRoutes.use(noStore, requireAuth);
dashboardRoutes.get('/requests', dashboardController.listRequests);
dashboardRoutes.get('/overview', dashboardController.getOverview);
dashboardRoutes.get('/request-stats', dashboardController.getRequestStats);
dashboardRoutes.get('/recent-activities', dashboardController.getRecentActivities);
