import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { env } from '../core/config/env.js';
import { errorHandler } from '../core/middlewares/errorHandler.js';
import { notFoundHandler } from '../core/middlewares/notFoundHandler.js';
import { createOriginGuard } from '../core/middlewares/originGuard.js';
import { requestLogger } from '../core/middlewares/requestLogger.js';
import { createApiRoutes } from './apiRoutes.js';

export const API_PREFIX = '/api/v1';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  // Adresse IP réelle derrière un proxy (limitation des tentatives, audit).
  app.set('trust proxy', env.TRUST_PROXY);
  app.use(requestLogger);
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
  app.use(createOriginGuard(env.CORS_ORIGINS));
  app.use(express.json({ limit: env.JSON_BODY_LIMIT }));

  app.use(API_PREFIX, createApiRoutes());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
