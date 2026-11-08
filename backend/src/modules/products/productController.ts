import type { RequestHandler } from 'express';
import { sendSuccess } from '../../core/http/apiResponse.js';
import {
  idOrSlugParamsSchema,
  idParamsSchema,
  publicationBodySchema,
} from '../../core/http/commonSchema.js';
import { parseInput } from '../../core/http/validation.js';
import { getAuth, isAdminView } from '../auth/authMiddleware.js';
import {
  createProductBodySchema,
  listProductsQuerySchema,
  updateProductBodySchema,
} from './productSchema.js';
import * as productService from './productService.js';

export const listProducts: RequestHandler = async (req, res) => {
  const query = parseInput(listProductsQuerySchema, req.query);
  const { items, meta } = isAdminView(req)
    ? await productService.listAdminProducts(query)
    : await productService.listPublicProducts(query);
  sendSuccess(res, items, { meta: { ...meta } });
};

export const getProduct: RequestHandler = async (req, res) => {
  const { idOrSlug } = parseInput(idOrSlugParamsSchema, req.params);
  const data = isAdminView(req)
    ? await productService.getAdminProduct(idOrSlug)
    : await productService.getPublicProduct(idOrSlug);
  sendSuccess(res, data);
};

export const createProduct: RequestHandler = async (req, res) => {
  const input = parseInput(createProductBodySchema, req.body);
  sendSuccess(res, await productService.createProduct(getAuth(req).userId, input), {
    statusCode: 201,
  });
};

export const updateProduct: RequestHandler = async (req, res) => {
  const { id } = parseInput(idParamsSchema, req.params);
  sendSuccess(
    res,
    await productService.updateProduct(id, parseInput(updateProductBodySchema, req.body)),
  );
};

export const setPublication: RequestHandler = async (req, res) => {
  const { id } = parseInput(idParamsSchema, req.params);
  const { published } = parseInput(publicationBodySchema, req.body);
  sendSuccess(res, await productService.setProductPublication(id, published));
};

export const archiveProduct: RequestHandler = async (req, res) => {
  const { id } = parseInput(idParamsSchema, req.params);
  sendSuccess(res, await productService.archiveProduct(id));
};

export const restoreProduct: RequestHandler = async (req, res) => {
  const { id } = parseInput(idParamsSchema, req.params);
  sendSuccess(res, await productService.restoreProduct(id));
};
