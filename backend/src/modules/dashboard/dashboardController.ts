import type { RequestHandler } from 'express';
import { sendSuccess } from '../../core/http/apiResponse.js';
import { parseInput } from '../../core/http/validation.js';
import { getAuth } from '../auth/authMiddleware.js';
import { listRequestsQuerySchema } from './dashboardSchema.js';
import { recentActivitiesQuerySchema, requestStatsQuerySchema } from './dashboardStatsSchema.js';
import * as statsService from './dashboardStatsService.js';
import * as dashboardService from './dashboardService.js';

export const listRequests: RequestHandler = async (req, res) => {
  const query = parseInput(listRequestsQuerySchema, req.query);
  const { items, meta } = await dashboardService.listAllRequests(query, getAuth(req).userId);
  sendSuccess(res, items, { meta: { ...meta } });
};

export const getOverview: RequestHandler = async (req, res) => {
  sendSuccess(res, await statsService.getOverview(getAuth(req).userId));
};

export const getRequestStats: RequestHandler = async (req, res) => {
  const { period } = parseInput(requestStatsQuerySchema, req.query);
  sendSuccess(res, await statsService.getRequestStats(period));
};

export const getRecentActivities: RequestHandler = async (req, res) => {
  const { limit } = parseInput(recentActivitiesQuerySchema, req.query);
  sendSuccess(res, await statsService.getRecentActivities(limit));
};
