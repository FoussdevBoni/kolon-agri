import { Router } from 'express';
import { noStore } from '../../core/middlewares/noStore.js';
import { requireAuth } from '../auth/authMiddleware.js';
import * as partnerController from './partnerController.js';

/** Annuaire privé des partenaires : aucune route publique, administrateurs uniquement. */
export const partnerRoutes = Router();

partnerRoutes.use(noStore, requireAuth);

partnerRoutes.get('/', partnerController.listPartners);
partnerRoutes.post('/', partnerController.createPartner);
partnerRoutes.get('/:id', partnerController.getPartner);
partnerRoutes.patch('/:id', partnerController.updatePartner);
partnerRoutes.patch('/:id/status', partnerController.setStatus);
partnerRoutes.post('/:id/archive', partnerController.archivePartner);
