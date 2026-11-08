import type { RequestHandler } from 'express';
import { sendSuccess } from '../../core/http/apiResponse.js';
import {
  idOrSlugParamsSchema,
  idParamsSchema,
  orderBodySchema,
} from '../../core/http/commonSchema.js';
import { parseInput } from '../../core/http/validation.js';
import { isAdminView } from '../auth/authMiddleware.js';
import {
  createCategoryBodySchema,
  listCategoriesQuerySchema,
  updateCategoryBodySchema,
} from './categorySchema.js';
import * as categoryService from './categoryService.js';

export const listCategories: RequestHandler = async (req, res) => {
  const query = parseInput(listCategoriesQuerySchema, req.query);
  const data = isAdminView(req)
    ? await categoryService.listAdminCategories(query)
    : await categoryService.listPublicCategories();
  sendSuccess(res, data);
};

export const getCategory: RequestHandler = async (req, res) => {
  const { idOrSlug } = parseInput(idOrSlugParamsSchema, req.params);
  const data = isAdminView(req)
    ? await categoryService.getAdminCategory(idOrSlug)
    : await categoryService.getPublicCategory(idOrSlug);
  sendSuccess(res, data);
};

export const createCategory: RequestHandler = async (req, res) => {
  const input = parseInput(createCategoryBodySchema, req.body);
  sendSuccess(res, await categoryService.createCategory(input), { statusCode: 201 });
};

export const updateCategory: RequestHandler = async (req, res) => {
  const { id } = parseInput(idParamsSchema, req.params);
  const input = parseInput(updateCategoryBodySchema, req.body);
  sendSuccess(res, await categoryService.updateCategory(id, input));
};

export const reorderCategories: RequestHandler = async (req, res) => {
  const { ids } = parseInput(orderBodySchema, req.body);
  sendSuccess(res, await categoryService.reorderCategories(ids));
};

export const deleteCategory: RequestHandler = async (req, res) => {
  const { id } = parseInput(idParamsSchema, req.params);
  await categoryService.deleteCategory(id);
  sendSuccess(res, null);
};
