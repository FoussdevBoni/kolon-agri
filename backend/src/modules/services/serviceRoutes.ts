import { Router } from 'express';
import { publicCache } from '../../core/middlewares/publicCache.js';
import { requireAuth, requireAuthForAdminView } from '../auth/authMiddleware.js';
import * as serviceController from './serviceController.js';

/** Lecture publique des services publiés ; `?view=admin` et écritures réservées aux admins. */
export const serviceRoutes = Router();

serviceRoutes.get('/', publicCache(), requireAuthForAdminView, serviceController.listServices);
serviceRoutes.put('/order', requireAuth, serviceController.reorderServices);
serviceRoutes.get(
  '/:idOrSlug',
  publicCache(),
  requireAuthForAdminView,
  serviceController.getService,
);
serviceRoutes.post('/', requireAuth, serviceController.createService);
serviceRoutes.patch('/:id', requireAuth, serviceController.updateService);
serviceRoutes.patch('/:id/publication', requireAuth, serviceController.setPublication);
serviceRoutes.delete('/:id', requireAuth, serviceController.deleteService);
