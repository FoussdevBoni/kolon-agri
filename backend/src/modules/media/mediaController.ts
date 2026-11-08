import type { RequestHandler } from 'express';
import { sendSuccess } from '../../core/http/apiResponse.js';
import { idParamsSchema } from '../../core/http/commonSchema.js';
import { getRequestMeta } from '../../core/http/requestMeta.js';
import { parseInput } from '../../core/http/validation.js';
import { getAuth } from '../auth/authMiddleware.js';
import {
  listMediaQuerySchema,
  updateMediaBodySchema,
  uploadMediaQuerySchema,
} from './mediaSchema.js';
import * as mediaService from './mediaService.js';

export const uploadMedia: RequestHandler = async (req, res) => {
  const query = parseInput(uploadMediaQuerySchema, req.query);
  const file = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  const media = await mediaService.uploadMedia(
    getAuth(req).userId,
    { file, declaredType: req.get('content-type'), filename: query.filename, alt: query.alt },
    getRequestMeta(req),
  );
  sendSuccess(res, media, { statusCode: 201 });
};

export const listMedia: RequestHandler = async (req, res) => {
  const { items, meta } = await mediaService.listMedia(parseInput(listMediaQuerySchema, req.query));
  sendSuccess(res, items, { meta: { ...meta } });
};

export const getMedia: RequestHandler = async (req, res) => {
  const { id } = parseInput(idParamsSchema, req.params);
  sendSuccess(res, await mediaService.getMedia(id));
};

export const updateMedia: RequestHandler = async (req, res) => {
  const { id } = parseInput(idParamsSchema, req.params);
  const { alt } = parseInput(updateMediaBodySchema, req.body);
  sendSuccess(res, await mediaService.updateMediaAlt(id, alt));
};

export const deleteMedia: RequestHandler = async (req, res) => {
  const { id } = parseInput(idParamsSchema, req.params);
  await mediaService.deleteMedia(getAuth(req).userId, id, getRequestMeta(req));
  sendSuccess(res, null);
};
