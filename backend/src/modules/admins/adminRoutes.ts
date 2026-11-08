import { Router } from 'express';
import { noStore } from '../../core/middlewares/noStore.js';
import { requireAuth, requireRole } from '../auth/authMiddleware.js';
import * as adminController from './adminController.js';

/** Gestion des comptes administrateurs : réservée aux superAdmins actifs. */
export const adminRoutes = Router();

// Administrateurs assignables : lecture minimale (id, nom) ouverte à tout administrateur.
adminRoutes.get('/assignable', noStore, requireAuth, adminController.listAssignable);

adminRoutes.use(noStore, requireAuth, requireRole('superAdmin'));

adminRoutes.get('/', adminController.listAdmins);
adminRoutes.post('/', adminController.createAdmin);
adminRoutes.get('/:id', adminController.getAdmin);
adminRoutes.patch('/:id', adminController.updateAdmin);
adminRoutes.patch('/:id/role', adminController.changeRole);
adminRoutes.patch('/:id/status', adminController.changeStatus);
adminRoutes.post('/:id/password-reset', adminController.issuePasswordLink);
