import express, { Router } from 'express';
import { env } from '../../core/config/env.js';
import { noStore } from '../../core/middlewares/noStore.js';
import { requireAuth } from '../auth/authMiddleware.js';
import * as mediaController from './mediaController.js';

/** Médiathèque : réservée aux administrateurs authentifiés. */
export const mediaRoutes = Router();

mediaRoutes.use(noStore, requireAuth);

// Corps binaire brut (Content-Type image/*), lu seulement après authentification et CSRF.
mediaRoutes.post(
  '/',
  express.raw({ type: () => true, limit: env.MEDIA_MAX_BYTES }),
  mediaController.uploadMedia,
);
mediaRoutes.get('/', mediaController.listMedia);
mediaRoutes.get('/:id', mediaController.getMedia);
mediaRoutes.patch('/:id', mediaController.updateMedia);
mediaRoutes.delete('/:id', mediaController.deleteMedia);
