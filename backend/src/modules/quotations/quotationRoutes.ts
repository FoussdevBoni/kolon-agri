import { Router } from 'express';
import { noStore } from '../../core/middlewares/noStore.js';
import { requireAuth } from '../auth/authMiddleware.js';
import * as quotationController from './quotationController.js';

const { listActivities, changeStatus, assign, addNote } = quotationController.workflowHandlers;

/** Soumission publique ; consultation et traitement réservés aux administrateurs. */
export const quotationRoutes = Router();

quotationRoutes.post('/', quotationController.submitQuotation);

quotationRoutes.use(noStore, requireAuth);
quotationRoutes.get('/', quotationController.listQuotations);
quotationRoutes.get('/:id', quotationController.getQuotation);
quotationRoutes.get('/:id/activities', listActivities);
quotationRoutes.patch('/:id/status', changeStatus);
quotationRoutes.patch('/:id/assignment', assign);
quotationRoutes.post('/:id/notes', addNote);
