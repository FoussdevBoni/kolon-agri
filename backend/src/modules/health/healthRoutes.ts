import { Router } from 'express';
import { getHealth } from './healthController.js';

export const healthRoutes = Router();

healthRoutes.get('/', getHealth);
