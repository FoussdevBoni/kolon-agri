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
  accompanimentStatusBodySchema,
  createAccompanimentBodySchema,
  listAccompanimentQuerySchema,
} from './accompanimentRequestSchema.js';
import * as accompanimentService from './accompanimentRequestService.js';

export const submitRequest: RequestHandler = async (req, res) => {
  const key = parseIdempotencyKey(req.get(IDEMPOTENCY_HEADER));
  const input = parseInput(createAccompanimentBodySchema, req.body);
  const result = await accompanimentService.submitAccompanimentRequest(
    input,
    key,
    getRequestMeta(req),
  );
  if (result.replayed) res.setHeader('Idempotent-Replayed', 'true');
  sendSuccess(res, result.body, { statusCode: result.statusCode });
};

export const listRequests: RequestHandler = async (req, res) => {
  const query = parseInput(listAccompanimentQuerySchema, req.query);
  const { items, meta } = await accompanimentService.listAccompanimentRequests(
    query,
    getAuth(req).userId,
  );
  sendSuccess(res, items, { meta: { ...meta } });
};

export const getRequest: RequestHandler = async (req, res) => {
  const { id } = parseInput(idParamsSchema, req.params);
  sendSuccess(res, await accompanimentService.getAccompanimentRequest(id));
};

export const workflowHandlers = createWorkflowHandlers({
  workflow: accompanimentService.accompanimentWorkflow,
  statusBodySchema: accompanimentStatusBodySchema,
  getActorId: (req) => getAuth(req).userId,
  getDetail: accompanimentService.getAccompanimentRequest,
});
