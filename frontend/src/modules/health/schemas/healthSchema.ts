import { z } from 'zod';

export const healthStatusSchema = z.object({
  status: z.literal('ok'),
  service: z.string(),
  database: z.literal('up'),
  timestamp: z.string(),
  uptimeSeconds: z.number().int().nonnegative(),
});

export type HealthStatus = z.infer<typeof healthStatusSchema>;
