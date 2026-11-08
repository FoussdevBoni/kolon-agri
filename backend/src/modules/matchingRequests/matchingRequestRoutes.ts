import { Router } from 'express';
import { noStore } from '../../core/middlewares/noStore.js';
import { requireAuth } from '../auth/authMiddleware.js';
import * as controller from './matchingRequestController.js';

const { listActivities, changeStatus, assign, addNote } = controller.workflowHandlers;

/** Soumission publique du besoin ; traitement et associations réservés aux administrateurs. */
export const matchingRequestRoutes = Router();

matchingRequestRoutes.post('/', controller.submitRequest);

matchingRequestRoutes.use(noStore, requireAuth);
matchingRequestRoutes.get('/', controller.listRequests);
matchingRequestRoutes.get('/:id', controller.getRequest);
matchingRequestRoutes.get('/:id/activities', listActivities);
matchingRequestRoutes.patch('/:id/status', changeStatus);
matchingRequestRoutes.patch('/:id/assignment', assign);
matchingRequestRoutes.post('/:id/notes', addNote);
matchingRequestRoutes.get('/:id/partners', controller.listAssociations);
matchingRequestRoutes.post('/:id/partners', controller.associatePartner);
matchingRequestRoutes.patch('/:id/partners/:assignmentId', controller.updateAssociation);
matchingRequestRoutes.delete('/:id/partners/:assignmentId', controller.removeAssociation);
