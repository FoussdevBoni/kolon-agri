import { Router } from 'express';
import { publicCache } from '../../core/middlewares/publicCache.js';
import { requireAuth, requireAuthForAdminView } from '../auth/authMiddleware.js';
import * as categoryController from './categoryController.js';

/** Lecture publique des catégories visibles ; `?view=admin` et écritures réservées aux admins. */
export const categoryRoutes = Router();

categoryRoutes.get('/', publicCache(), requireAuthForAdminView, categoryController.listCategories);
categoryRoutes.put('/order', requireAuth, categoryController.reorderCategories);
categoryRoutes.get(
  '/:idOrSlug',
  publicCache(),
  requireAuthForAdminView,
  categoryController.getCategory,
);
categoryRoutes.post('/', requireAuth, categoryController.createCategory);
categoryRoutes.patch('/:id', requireAuth, categoryController.updateCategory);
categoryRoutes.delete('/:id', requireAuth, categoryController.deleteCategory);
