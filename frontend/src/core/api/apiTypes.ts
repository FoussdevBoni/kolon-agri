import { z } from 'zod';

export type ApiMeta = Record<string, unknown>;

export interface ApiResult<T> {
  data: T;
  meta: ApiMeta | undefined;
}

export const apiSuccessEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.unknown(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const apiErrorEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    details: z.unknown().optional(),
  }),
});
