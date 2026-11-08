import type { z } from 'zod';
import { AppError, coreErrorCodes } from '../errors/appError.js';

export interface ValidationIssue {
  path: string;
  message: string;
}

/** Valide une entrée (body, query, params) et lève une erreur 422 normalisée en cas d'échec. */
export function parseInput<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const issues: ValidationIssue[] = result.error.issues.map((issue) => ({
      path: issue.path.map(String).join('.'),
      message: issue.message,
    }));
    throw new AppError({
      statusCode: 422,
      code: coreErrorCodes.validationError,
      message: 'Certaines données transmises sont invalides.',
      details: { issues },
    });
  }
  return result.data;
}
