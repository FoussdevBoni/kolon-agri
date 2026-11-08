import { Router } from 'express';
import { noStore } from '../../core/middlewares/noStore.js';
import { requireAuth } from '../auth/authMiddleware.js';
import * as controller from './contactMessageController.js';

const { listActivities, changeStatus, assign, addNote } = controller.workflowHandlers;

/** Envoi public ; consultation et traitement réservés aux administrateurs. */
export const contactMessageRoutes = Router();

contactMessageRoutes.post('/', controller.submitMessage);

contactMessageRoutes.use(noStore, requireAuth);
contactMessageRoutes.get('/', controller.listMessages);
contactMessageRoutes.get('/:id', controller.getMessage);
contactMessageRoutes.get('/:id/activities', listActivities);
contactMessageRoutes.patch('/:id/status', changeStatus);
contactMessageRoutes.patch('/:id/assignment', assign);
contactMessageRoutes.post('/:id/notes', addNote);
