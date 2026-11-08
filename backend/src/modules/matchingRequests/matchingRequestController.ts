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
  associatePartnerBodySchema,
  associationParamsSchema,
  createMatchingBodySchema,
  listMatchingQuerySchema,
  matchingStatusBodySchema,
  updateAssociationBodySchema,
} from './matchingRequestSchema.js';
import * as matchingService from './matchingRequestService.js';

export const submitRequest: RequestHandler = async (req, res) => {
  const key = parseIdempotencyKey(req.get(IDEMPOTENCY_HEADER));
  const input = parseInput(createMatchingBodySchema, req.body);
  const result = await matchingService.submitMatchingRequest(input, key, getRequestMeta(req));
  if (result.replayed) res.setHeader('Idempotent-Replayed', 'true');
  sendSuccess(res, result.body, { statusCode: result.statusCode });
};

export const listRequests: RequestHandler = async (req, res) => {
  const query = parseInput(listMatchingQuerySchema, req.query);
  const { items, meta } = await matchingService.listMatchingRequests(query, getAuth(req).userId);
  sendSuccess(res, items, { meta: { ...meta } });
};

export const getRequest: RequestHandler = async (req, res) => {
  const { id } = parseInput(idParamsSchema, req.params);
  sendSuccess(res, await matchingService.getMatchingRequest(id));
};

export const listAssociations: RequestHandler = async (req, res) => {
  const { id } = parseInput(idParamsSchema, req.params);
  sendSuccess(res, await matchingService.listAssociations(id));
};

export const associatePartner: RequestHandler = async (req, res) => {
  const { id } = parseInput(idParamsSchema, req.params);
  const input = parseInput(associatePartnerBodySchema, req.body);
  sendSuccess(res, await matchingService.associatePartner(getAuth(req).userId, id, input), {
    statusCode: 201,
  });
};

export const updateAssociation: RequestHandler = async (req, res) => {
  const { id, assignmentId } = parseInput(associationParamsSchema, req.params);
  const input = parseInput(updateAssociationBodySchema, req.body);
  sendSuccess(
    res,
    await matchingService.updateAssociation(getAuth(req).userId, id, assignmentId, input),
  );
};

export const removeAssociation: RequestHandler = async (req, res) => {
  const { id, assignmentId } = parseInput(associationParamsSchema, req.params);
  sendSuccess(res, await matchingService.removeAssociation(getAuth(req).userId, id, assignmentId));
};

export const workflowHandlers = createWorkflowHandlers({
  workflow: matchingService.matchingWorkflow,
  statusBodySchema: matchingStatusBodySchema,
  getActorId: (req) => getAuth(req).userId,
  getDetail: matchingService.getMatchingRequest,
});
