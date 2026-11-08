import type { RequestHandler } from 'express';
import { sendSuccess } from '../../core/http/apiResponse.js';
import { idParamsSchema } from '../../core/http/commonSchema.js';
import { getRequestMeta } from '../../core/http/requestMeta.js';
import { parseInput } from '../../core/http/validation.js';
import {
  IDEMPOTENCY_HEADER,
  parseIdempotencyKey,
} from '../../core/idempotency/idempotencyService.js';
import { createWorkflowHandlers } from '../../core/requests/requestHandlers.js';
import { getAuth } from '../auth/authMiddleware.js';
import {
  createQuotationBodySchema,
  listQuotationsQuerySchema,
  quotationStatusBodySchema,
} from './quotationSchema.js';
import * as quotationService from './quotationService.js';

/** Soumission publique : seule la référence est renvoyée, jamais de donnée interne. */
export const submitQuotation: RequestHandler = async (req, res) => {
  const key = parseIdempotencyKey(req.get(IDEMPOTENCY_HEADER));
  const input = parseInput(createQuotationBodySchema, req.body);
  const result = await quotationService.submitQuotation(input, key, getRequestMeta(req));
  if (result.replayed) res.setHeader('Idempotent-Replayed', 'true');
  sendSuccess(res, result.body, { statusCode: result.statusCode });
};

export const listQuotations: RequestHandler = async (req, res) => {
  const query = parseInput(listQuotationsQuerySchema, req.query);
  const { items, meta } = await quotationService.listQuotations(query, getAuth(req).userId);
  sendSuccess(res, items, { meta: { ...meta } });
};

export const getQuotation: RequestHandler = async (req, res) => {
  const { id } = parseInput(idParamsSchema, req.params);
  sendSuccess(res, await quotationService.getQuotation(id));
};

export const workflowHandlers = createWorkflowHandlers({
  workflow: quotationService.quotationWorkflow,
  statusBodySchema: quotationStatusBodySchema,
  getActorId: (req) => getAuth(req).userId,
  getDetail: quotationService.getQuotation,
});
