import type { RequestHandler } from 'express';
import { sendSuccess } from '../../core/http/apiResponse.js';
import { idParamsSchema } from '../../core/http/commonSchema.js';
import { getRequestMeta } from '../../core/http/requestMeta.js';
import { parseInput } from '../../core/http/validation.js';
import { getAuth } from '../auth/authMiddleware.js';
import {
  changeRoleBodySchema,
  changeStatusBodySchema,
  createAdminBodySchema,
  listAdminsQuerySchema,
  updateAdminBodySchema,
} from './adminSchema.js';
import * as adminService from './adminService.js';
import { listAssignableAdmins } from '../auth/userDirectory.js';

export const listAssignable: RequestHandler = async (_req, res) => {
  sendSuccess(res, await listAssignableAdmins());
};

export const listAdmins: RequestHandler = async (req, res) => {
  const query = parseInput(listAdminsQuerySchema, req.query);
  const { items, meta } = await adminService.listAdmins(query);
  sendSuccess(res, items, { meta: { ...meta } });
};

export const getAdmin: RequestHandler = async (req, res) => {
  const { id } = parseInput(idParamsSchema, req.params);
  sendSuccess(res, await adminService.getAdmin(id));
};

export const createAdmin: RequestHandler = async (req, res) => {
  const input = parseInput(createAdminBodySchema, req.body);
  const created = await adminService.createAdmin(getAuth(req), input, getRequestMeta(req));
  sendSuccess(res, created, { statusCode: 201 });
};

export const updateAdmin: RequestHandler = async (req, res) => {
  const { id } = parseInput(idParamsSchema, req.params);
  const input = parseInput(updateAdminBodySchema, req.body);
  sendSuccess(res, await adminService.updateAdmin(getAuth(req), id, input, getRequestMeta(req)));
};

export const changeRole: RequestHandler = async (req, res) => {
  const { id } = parseInput(idParamsSchema, req.params);
  const { role } = parseInput(changeRoleBodySchema, req.body);
  sendSuccess(res, await adminService.changeAdminRole(getAuth(req), id, role, getRequestMeta(req)));
};

export const changeStatus: RequestHandler = async (req, res) => {
  const { id } = parseInput(idParamsSchema, req.params);
  const { status } = parseInput(changeStatusBodySchema, req.body);
  sendSuccess(
    res,
    await adminService.changeAdminStatus(getAuth(req), id, status, getRequestMeta(req)),
  );
};

export const issuePasswordLink: RequestHandler = async (req, res) => {
  const { id } = parseInput(idParamsSchema, req.params);
  const link = await adminService.issueAdminPasswordLink(getAuth(req), id, getRequestMeta(req));
  sendSuccess(res, link, { statusCode: 201 });
};
