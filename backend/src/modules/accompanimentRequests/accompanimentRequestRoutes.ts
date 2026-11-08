import { Router } from 'express';
import { noStore } from '../../core/middlewares/noStore.js';
import { requireAuth } from '../auth/authMiddleware.js';
import * as controller from './accompanimentRequestController.js';

const { listActivities, changeStatus, assign, addNote } = controller.workflowHandlers;

/** Soumission publique ; consultation et traitement réservés aux administrateurs. */
export const accompanimentRequestRoutes = Router();

accompanimentRequestRoutes.post('/', controller.submitRequest);

accompanimentRequestRoutes.use(noStore, requireAuth);
accompanimentRequestRoutes.get('/', controller.listRequests);
accompanimentRequestRoutes.get('/:id', controller.getRequest);
accompanimentRequestRoutes.get('/:id/activities', listActivities);
accompanimentRequestRoutes.patch('/:id/status', changeStatus);
accompanimentRequestRoutes.patch('/:id/assignment', assign);
accompanimentRequestRoutes.post('/:id/notes', addNote);
