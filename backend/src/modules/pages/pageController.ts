import type { RequestHandler } from 'express';
import { sendSuccess } from '../../core/http/apiResponse.js';
import { getRequestMeta } from '../../core/http/requestMeta.js';
import { parseInput } from '../../core/http/validation.js';
import { getAuth } from '../auth/authMiddleware.js';
import {
  addSectionBodySchema,
  expectedRevisionBodySchema,
  expectedRevisionQuerySchema,
  pageIdParamsSchema,
  pageKeyParamsSchema,
  reorderSectionsBodySchema,
  sectionParamsSchema,
  updateSectionBodySchema,
  updateSeoBodySchema,
  versionParamsSchema,
} from './pageSchema.js';
import * as pageService from './pageService.js';
import { buildSitemapXml } from './sitemapService.js';

const actor = (req: Parameters<RequestHandler>[0]) => getAuth(req).userId;

export const getPublishedPage: RequestHandler = async (req, res) => {
  const { key } = parseInput(pageKeyParamsSchema, req.params);
  sendSuccess(res, await pageService.getPublishedPage(key));
};

/** Plan du site XML (exposé à la racine du site par une réécriture /sitemap.xml). */
export const getSitemap: RequestHandler = async (_req, res) => {
  res.type('application/xml');
  res.send(await buildSitemapXml());
};

export const listPages: RequestHandler = async (_req, res) => {
  sendSuccess(res, await pageService.listPages());
};

export const getDraft: RequestHandler = async (req, res) => {
  const { id } = parseInput(pageIdParamsSchema, req.params);
  sendSuccess(res, await pageService.getPageDraft(id));
};

export const addSection: RequestHandler = async (req, res) => {
  const { id } = parseInput(pageIdParamsSchema, req.params);
  const input = parseInput(addSectionBodySchema, req.body);
  sendSuccess(res, await pageService.addSection(actor(req), id, input), { statusCode: 201 });
};

export const updateSection: RequestHandler = async (req, res) => {
  const { id, sectionId } = parseInput(sectionParamsSchema, req.params);
  const input = parseInput(updateSectionBodySchema, req.body);
  sendSuccess(res, await pageService.updateSection(actor(req), id, sectionId, input));
};

export const deleteSection: RequestHandler = async (req, res) => {
  const { id, sectionId } = parseInput(sectionParamsSchema, req.params);
  const { expectedRevision } = parseInput(expectedRevisionQuerySchema, req.query);
  sendSuccess(res, await pageService.deleteSection(actor(req), id, sectionId, expectedRevision));
};

export const reorderSections: RequestHandler = async (req, res) => {
  const { id } = parseInput(pageIdParamsSchema, req.params);
  const input = parseInput(reorderSectionsBodySchema, req.body);
  sendSuccess(res, await pageService.reorderSections(actor(req), id, input));
};

export const updateSeo: RequestHandler = async (req, res) => {
  const { id } = parseInput(pageIdParamsSchema, req.params);
  const input = parseInput(updateSeoBodySchema, req.body);
  sendSuccess(res, await pageService.updatePageSeo(actor(req), id, input));
};

export const publishPage: RequestHandler = async (req, res) => {
  const { id } = parseInput(pageIdParamsSchema, req.params);
  const { expectedRevision } = parseInput(expectedRevisionBodySchema, req.body);
  sendSuccess(
    res,
    await pageService.publishPage(actor(req), id, expectedRevision, getRequestMeta(req)),
  );
};

export const unpublishPage: RequestHandler = async (req, res) => {
  const { id } = parseInput(pageIdParamsSchema, req.params);
  sendSuccess(res, await pageService.unpublishPage(actor(req), id, getRequestMeta(req)));
};

export const restoreVersion: RequestHandler = async (req, res) => {
  const { id, number } = parseInput(versionParamsSchema, req.params);
  const { expectedRevision } = parseInput(expectedRevisionBodySchema, req.body);
  sendSuccess(res, await pageService.restorePageVersion(actor(req), id, number, expectedRevision));
};
