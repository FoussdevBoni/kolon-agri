import { Router } from 'express';
import { publicCache } from '../../core/middlewares/publicCache.js';
import { requireAuth, requireAuthForAdminView } from '../auth/authMiddleware.js';
import * as productController from './productController.js';

/** Lecture publique des produits publiés ; `?view=admin` et écritures réservées aux admins. */
export const productRoutes = Router();

productRoutes.get('/', publicCache(), requireAuthForAdminView, productController.listProducts);
productRoutes.get(
  '/:idOrSlug',
  publicCache(),
  requireAuthForAdminView,
  productController.getProduct,
);
productRoutes.post('/', requireAuth, productController.createProduct);
productRoutes.patch('/:id', requireAuth, productController.updateProduct);
productRoutes.patch('/:id/publication', requireAuth, productController.setPublication);
productRoutes.post('/:id/archive', requireAuth, productController.archiveProduct);
productRoutes.post('/:id/restore', requireAuth, productController.restoreProduct);
