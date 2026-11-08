import type { Response } from 'express';

export type ApiMeta = Record<string, unknown>;

export interface ApiSuccessBody<T> {
  success: true;
  data: T;
  meta?: ApiMeta;
}

export interface ApiErrorBody {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  options: { statusCode?: number; meta?: ApiMeta } = {},
): void {
  const body: ApiSuccessBody<T> = { success: true, data };
  if (options.meta) body.meta = options.meta;
  res.status(options.statusCode ?? 200).json(body);
}

export function buildErrorBody(code: string, message: string, details?: unknown): ApiErrorBody {
  return {
    success: false,
    error: details === undefined ? { code, message } : { code, message, details },
  };
}
