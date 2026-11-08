import { Router } from 'express';
import { accompanimentRequestRoutes } from '../modules/accompanimentRequests/accompanimentRequestRoutes.js';
import { adminRoutes } from '../modules/admins/adminRoutes.js';
import { authRoutes } from '../modules/auth/authRoutes.js';
import { categoryRoutes } from '../modules/categories/categoryRoutes.js';
import { contactMessageRoutes } from '../modules/contactMessages/contactMessageRoutes.js';
import { dashboardRoutes } from '../modules/dashboard/dashboardRoutes.js';
import { healthRoutes } from '../modules/health/healthRoutes.js';
import { matchingRequestRoutes } from '../modules/matchingRequests/matchingRequestRoutes.js';
import { mediaRoutes } from '../modules/media/mediaRoutes.js';
import { notificationRoutes } from '../modules/notifications/notificationRoutes.js';
import { pageRoutes } from '../modules/pages/pageRoutes.js';
import { partnerRoutes } from '../modules/partners/partnerRoutes.js';
import { productRoutes } from '../modules/products/productRoutes.js';
import { quotationRoutes } from '../modules/quotations/quotationRoutes.js';
import { serviceRoutes } from '../modules/services/serviceRoutes.js';

/** Point de montage unique des domaines sous /api/v1/{domain}. */
export function createApiRoutes(): Router {
  const router = Router();
  router.use('/health', healthRoutes);
  router.use('/auth', authRoutes);
  router.use('/admins', adminRoutes);
  router.use('/media', mediaRoutes);
  router.use('/categories', categoryRoutes);
  router.use('/products', productRoutes);
  router.use('/services', serviceRoutes);
  router.use('/pages', pageRoutes);
  router.use('/quotations', quotationRoutes);
  router.use('/accompaniment-requests', accompanimentRequestRoutes);
  router.use('/matching-requests', matchingRequestRoutes);
  router.use('/partners', partnerRoutes);
  router.use('/contact-messages', contactMessageRoutes);
  router.use('/notifications', notificationRoutes);
  router.use('/dashboard', dashboardRoutes);
  return router;
}
