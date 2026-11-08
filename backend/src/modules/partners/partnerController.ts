import type { RequestHandler } from 'express';
import { sendSuccess } from '../../core/http/apiResponse.js';
import { idParamsSchema } from '../../core/http/commonSchema.js';
import { getRequestMeta } from '../../core/http/requestMeta.js';
import { parseInput } from '../../core/http/validation.js';
import { getAuth } from '../auth/authMiddleware.js';
import {
  createPartnerBodySchema,
  listPartnersQuerySchema,
  partnerStatusBodySchema,
  updatePartnerBodySchema,
} from './partnerSchema.js';
import * as partnerService from './partnerService.js';

export const listPartners: RequestHandler = async (req, res) => {
  const { items, meta } = await partnerService.listPartners(
    parseInput(listPartnersQuerySchema, req.query),
  );
  sendSuccess(res, items, { meta: { ...meta } });
};

export const getPartner: RequestHandler = async (req, res) => {
  const { id } = parseInput(idParamsSchema, req.params);
  sendSuccess(res, await partnerService.getPartner(id));
};

export const createPartner: RequestHandler = async (req, res) => {
  const input = parseInput(createPartnerBodySchema, req.body);
  sendSuccess(
    res,
    await partnerService.createPartner(getAuth(req).userId, input, getRequestMeta(req)),
    {
      statusCode: 201,
    },
  );
};

export const updatePartner: RequestHandler = async (req, res) => {
  const { id } = parseInput(idParamsSchema, req.params);
  sendSuccess(
    res,
    await partnerService.updatePartner(id, parseInput(updatePartnerBodySchema, req.body)),
  );
};

export const setStatus: RequestHandler = async (req, res) => {
  const { id } = parseInput(idParamsSchema, req.params);
  const { status } = parseInput(partnerStatusBodySchema, req.body);
  sendSuccess(
    res,
    await partnerService.setPartnerStatus(getAuth(req).userId, id, status, getRequestMeta(req)),
  );
};

export const archivePartner: RequestHandler = async (req, res) => {
  const { id } = parseInput(idParamsSchema, req.params);
  sendSuccess(
    res,
    await partnerService.archivePartner(getAuth(req).userId, id, getRequestMeta(req)),
  );
};
