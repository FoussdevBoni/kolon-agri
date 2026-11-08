import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AppError } from '../../src/core/errors/appError.js';
import { parseInput } from '../../src/core/http/validation.js';

const schema = z.object({
  name: z.string().min(2),
  items: z.array(z.object({ quantity: z.number().int().positive() })),
});

describe('parseInput', () => {
  it('retourne les données validées', () => {
    expect(parseInput(schema, { name: 'Mil', items: [{ quantity: 2 }] })).toEqual({
      name: 'Mil',
      items: [{ quantity: 2 }],
    });
  });

  it('lève une AppError 422 avec les chemins des champs invalides', () => {
    let caught: unknown;
    try {
      parseInput(schema, { name: 'M', items: [{ quantity: 0 }] });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(AppError);
    const appError = caught as AppError;
    expect(appError.statusCode).toBe(422);
    expect(appError.code).toBe('VALIDATION_ERROR');
    expect(appError.details).toEqual({
      issues: [
        { path: 'name', message: expect.any(String) as unknown },
        { path: 'items.0.quantity', message: expect.any(String) as unknown },
      ],
    });
  });
});
