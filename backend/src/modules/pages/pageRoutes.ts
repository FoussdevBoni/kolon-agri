import { Router } from 'express';
import { noStore } from '../../core/middlewares/noStore.js';
import { publicCache } from '../../core/middlewares/publicCache.js';
import { requireAuth } from '../auth/authMiddleware.js';
import * as pageController from './pageController.js';

/**
 * CMS : brouillon, sections, SEO, publication et versions réservés aux admins ;
 * seule la version publiée d'une page est lisible publiquement (`GET /pages/:key`).
 */
export const pageRoutes = Router();

pageRoutes.get('/', noStore, requireAuth, pageController.listPages);
pageRoutes.get('/:id/draft', noStore, requireAuth, pageController.getDraft);
pageRoutes.patch('/:id/seo', requireAuth, pageController.updateSeo);
pageRoutes.post('/:id/sections', requireAuth, pageController.addSection);
pageRoutes.put('/:id/sections/order', requireAuth, pageController.reorderSections);
pageRoutes.patch('/:id/sections/:sectionId', requireAuth, pageController.updateSection);
pageRoutes.delete('/:id/sections/:sectionId', requireAuth, pageController.deleteSection);
pageRoutes.post('/:id/publish', requireAuth, pageController.publishPage);
pageRoutes.post('/:id/unpublish', requireAuth, pageController.unpublishPage);
pageRoutes.post('/:id/versions/:number/restore', requireAuth, pageController.restoreVersion);
pageRoutes.get('/sitemap.xml', publicCache(3600), pageController.getSitemap);
pageRoutes.get('/:key', publicCache(), pageController.getPublishedPage);
