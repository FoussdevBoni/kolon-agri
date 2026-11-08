import type { RequestHandler } from 'express';
import { sendSuccess } from '../../core/http/apiResponse.js';
import { getRequestMeta } from '../../core/http/requestMeta.js';
import { parseInput } from '../../core/http/validation.js';
import { clearSessionCookie, setSessionCookie } from './authCookie.js';
import { getAuth } from './authMiddleware.js';
import {
  changePasswordBodySchema,
  forgotPasswordBodySchema,
  loginBodySchema,
  resetPasswordBodySchema,
  sessionIdParamsSchema,
} from './authSchema.js';
import * as authService from './authService.js';

export const login: RequestHandler = async (req, res) => {
  const input = parseInput(loginBodySchema, req.body);
  const { created, dto } = await authService.login(input, getRequestMeta(req));
  setSessionCookie(res, created.token, created.expiresAt);
  sendSuccess(res, dto);
};

export const logout: RequestHandler = async (req, res) => {
  await authService.logout(getAuth(req), getRequestMeta(req));
  clearSessionCookie(res);
  sendSuccess(res, null);
};

export const getMe: RequestHandler = (req, res) => {
  sendSuccess(res, authService.getCurrentSession(getAuth(req)));
};

export const listSessions: RequestHandler = async (req, res) => {
  sendSuccess(res, await authService.listSessions(getAuth(req)));
};

export const revokeSession: RequestHandler = async (req, res) => {
  const { id } = parseInput(sessionIdParamsSchema, req.params);
  const auth = getAuth(req);
  await authService.revokeOwnSession(auth, id, getRequestMeta(req));
  if (id === auth.sessionId) clearSessionCookie(res);
  sendSuccess(res, null);
};

export const changePassword: RequestHandler = async (req, res) => {
  const input = parseInput(changePasswordBodySchema, req.body);
  await authService.changePassword(getAuth(req), input, getRequestMeta(req));
  sendSuccess(res, null);
};

export const resetPassword: RequestHandler = async (req, res) => {
  const input = parseInput(resetPasswordBodySchema, req.body);
  await authService.resetPasswordWithToken(input, getRequestMeta(req));
  sendSuccess(res, null);
};

/** Réponse neutre (202), envoyée avant toute recherche du compte (temps de réponse constant). */
export const forgotPassword: RequestHandler = (req, res) => {
  const input = parseInput(forgotPasswordBodySchema, req.body);
  const { completion } = authService.requestPasswordReset(input, getRequestMeta(req));
  completion.catch((error: unknown) => {
    req.log.error({ err: error }, 'Échec du traitement d’une demande de réinitialisation');
  });
  sendSuccess(res, { accepted: true }, { statusCode: 202 });
};
