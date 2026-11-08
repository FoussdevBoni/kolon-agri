import type { RequestHandler } from 'express';
import { sendSuccess } from '../../core/http/apiResponse.js';
import { checkHealth } from './healthService.js';

export const getHealth: RequestHandler = async (_req, res) => {
  const health = await checkHealth();
  res.setHeader('Cache-Control', 'no-store');
  sendSuccess(res, health);
};
