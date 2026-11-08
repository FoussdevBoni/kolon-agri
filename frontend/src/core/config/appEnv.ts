import { z } from 'zod';

const appEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().min(1).default('/api/v1'),
  /** URL publique du site (canonical, Open Graph) ; à défaut, l'origine courante. */
  VITE_SITE_URL: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.url().optional(),
  ),
});

export const appEnv = appEnvSchema.parse(import.meta.env);
