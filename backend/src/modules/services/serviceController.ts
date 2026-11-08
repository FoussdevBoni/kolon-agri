import type { RequestHandler } from 'express';
import { sendSuccess } from '../../core/http/apiResponse.js';
import {
  idOrSlugParamsSchema,
  idParamsSchema,
  orderBodySchema,
  publicationBodySchema,
} from '../../core/http/commonSchema.js';
import { parseInput } from '../../core/http/validation.js';
import { isAdminView } from '../auth/authMiddleware.js';
import {
  createServiceBodySchema,
  listServicesQuerySchema,
  updateServiceBodySchema,
} from './serviceSchema.js';
import * as serviceService from './serviceService.js';

export const listServices: RequestHandler = async (req, res) => {
  const query = parseInput(listServicesQuerySchema, req.query);
  const data = isAdminView(req)
    ? await serviceService.listAdminServices(query)
    : await serviceService.listPublicServices();
  sendSuccess(res, data);
};

export const getService: RequestHandler = async (req, res) => {
  const { idOrSlug } = parseInput(idOrSlugParamsSchema, req.params);
  const data = isAdminView(req)
    ? await serviceService.getAdminService(idOrSlug)
    : await serviceService.getPublicService(idOrSlug);
  sendSuccess(res, data);
};

export const createService: RequestHandler = async (req, res) => {
  const input = parseInput(createServiceBodySchema, req.body);
  sendSuccess(res, await serviceService.createService(input), { statusCode: 201 });
};

export const updateService: RequestHandler = async (req, res) => {
  const { id } = parseInput(idParamsSchema, req.params);
  sendSuccess(
    res,
    await serviceService.updateService(id, parseInput(updateServiceBodySchema, req.body)),
  );
};

export const setPublication: RequestHandler = async (req, res) => {
  const { id } = parseInput(idParamsSchema, req.params);
  const { published } = parseInput(publicationBodySchema, req.body);
  sendSuccess(res, await serviceService.setServicePublication(id, published));
};

export const reorderServices: RequestHandler = async (req, res) => {
  const { ids } = parseInput(orderBodySchema, req.body);
  sendSuccess(res, await serviceService.reorderServices(ids));
};

export const deleteService: RequestHandler = async (req, res) => {
  const { id } = parseInput(idParamsSchema, req.params);
  await serviceService.deleteService(id);
  sendSuccess(res, null);
};
