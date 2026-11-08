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
  contactStatusBodySchema,
  createContactMessageBodySchema,
  listContactMessagesQuerySchema,
} from './contactMessageSchema.js';
import * as contactService from './contactMessageService.js';

export const submitMessage: RequestHandler = async (req, res) => {
  const key = parseIdempotencyKey(req.get(IDEMPOTENCY_HEADER));
  const input = parseInput(createContactMessageBodySchema, req.body);
  const result = await contactService.submitContactMessage(input, key, getRequestMeta(req));
  if (result.replayed) res.setHeader('Idempotent-Replayed', 'true');
  sendSuccess(res, result.body, { statusCode: result.statusCode });
};

export const listMessages: RequestHandler = async (req, res) => {
  const query = parseInput(listContactMessagesQuerySchema, req.query);
  const { items, meta } = await contactService.listContactMessages(query, getAuth(req).userId);
  sendSuccess(res, items, { meta: { ...meta } });
};

export const getMessage: RequestHandler = async (req, res) => {
  const { id } = parseInput(idParamsSchema, req.params);
  sendSuccess(res, await contactService.getContactMessage(id));
};

export const workflowHandlers = createWorkflowHandlers({
  workflow: contactService.contactWorkflow,
  statusBodySchema: contactStatusBodySchema,
  getActorId: (req) => getAuth(req).userId,
  getDetail: contactService.getContactMessage,
});
