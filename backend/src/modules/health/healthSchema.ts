import { z } from 'zod';

export const healthStatusSchema = z
  .object({
    status: z.literal('ok'),
    service: z.string(),
    database: z.literal('up'),
    timestamp: z.iso.datetime(),
    uptimeSeconds: z.number().int().nonnegative(),
  })
  .meta({ description: 'État de l’API et de sa base de données' });

export type HealthStatus = z.infer<typeof healthStatusSchema>;
