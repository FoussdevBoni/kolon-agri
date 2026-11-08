import { z } from 'zod';

export const apiErrorBodySchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export function createSuccessBodySchema<T extends z.ZodType>(dataSchema: T) {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
    meta: z.record(z.string(), z.unknown()).optional(),
  });
}
