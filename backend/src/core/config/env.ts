import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

/** Booléen d'environnement ; une valeur vide (`COOKIE_SECURE=`) applique la valeur par défaut. */
const booleanString = z
  .enum(['true', 'false', ''])
  .optional()
  .transform((value) => (value === 'true' ? true : value === 'false' ? false : undefined));

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    HOST: z.string().min(1).default('0.0.0.0'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
    MONGODB_URI: z
      .string()
      .regex(/^mongodb(\+srv)?:\/\/.+/, 'MONGODB_URI doit être une URI MongoDB valide'),
    MONGODB_SERVER_SELECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
    CORS_ORIGINS: z
      .string()
      .default('http://localhost:5173')
      .transform((value) =>
        value
          .split(',')
          .map((origin) => origin.trim())
          .filter((origin) => origin.length > 0),
      )
      .pipe(z.array(z.url()).min(1)),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    JSON_BODY_LIMIT: z.string().min(1).default('1mb'),
    /** URL publique du frontend, utilisée pour construire les liens d'invitation. */
    APP_PUBLIC_URL: z.url().default('http://localhost:5173'),
    /** Nombre de proxys de confiance devant l'API (adresse IP réelle pour la limitation). */
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    SESSION_COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    /** Par défaut : true en production, false sinon. */
    COOKIE_SECURE: booleanString,
    AUDIT_LOG_RETENTION_DAYS: z.coerce.number().int().min(1).default(365),
    /** Cloudinary : facultatif en développement ; sans configuration, le téléversement répond 503. */
    CLOUDINARY_CLOUD_NAME: z.string().trim().default(''),
    CLOUDINARY_API_KEY: z.string().trim().default(''),
    CLOUDINARY_API_SECRET: z.string().trim().default(''),
    CLOUDINARY_FOLDER: z.string().trim().min(1).default('kolon-agri'),
    MEDIA_MAX_BYTES: z.coerce
      .number()
      .int()
      .min(100 * 1024)
      .max(20 * 1024 * 1024)
      .default(5 * 1024 * 1024),
    /** Délai maximal du ping MongoDB du contrôle de santé. */
    MONGODB_PING_TIMEOUT_MS: z.coerce.number().int().min(100).max(60_000).default(2000),
    /** Resend : sans clé, aucun email n'est envoyé (les liens sont affichés au superAdmin). */
    RESEND_API_KEY: z.string().trim().default(''),
    RESEND_FROM: z.string().trim().min(3).default('Kolon Agri <no-reply@example.com>'),
    /** Intervalle de traitement de la file d'emails. */
    EMAIL_WORKER_INTERVAL_MS: z.coerce.number().int().min(1000).max(3_600_000).default(15_000),
  })
  .transform((values) => ({
    ...values,
    COOKIE_SECURE: values.COOKIE_SECURE ?? values.NODE_ENV === 'production',
  }))
  .superRefine((values, context) => {
    // Isolation des environnements : un processus de test n'a jamais de clé Resend réelle, et
    // un serveur de développement ou de production ne se connecte jamais à une base de test.
    if (values.NODE_ENV === 'test' && values.RESEND_API_KEY) {
      context.addIssue({
        code: 'custom',
        path: ['RESEND_API_KEY'],
        message: 'RESEND_API_KEY doit être vide en test : aucun email réel ne doit partir',
      });
    }
    const databaseName = databaseNameOf(values.MONGODB_URI);
    if (values.NODE_ENV !== 'test' && databaseName?.endsWith(TEST_DATABASE_SUFFIX)) {
      context.addIssue({
        code: 'custom',
        path: ['MONGODB_URI'],
        message: `La base « ${databaseName} » est réservée aux tests : utilisez une autre base hors NODE_ENV=test`,
      });
    }
    if (values.NODE_ENV === 'production') {
      if (!values.APP_PUBLIC_URL.startsWith('https://')) {
        context.addIssue({
          code: 'custom',
          path: ['APP_PUBLIC_URL'],
          message: 'APP_PUBLIC_URL doit être en https en production (liens envoyés par email)',
        });
      }
      if (values.CORS_ORIGINS.some((origin) => !origin.startsWith('https://'))) {
        context.addIssue({
          code: 'custom',
          path: ['CORS_ORIGINS'],
          message: 'Les origines autorisées doivent être en https en production',
        });
      }
    }
    if (values.NODE_ENV === 'production' && !values.COOKIE_SECURE) {
      context.addIssue({
        code: 'custom',
        path: ['COOKIE_SECURE'],
        message: 'COOKIE_SECURE doit valoir true en production',
      });
    }
    if (values.SESSION_COOKIE_SAMESITE === 'none' && !values.COOKIE_SECURE) {
      context.addIssue({
        code: 'custom',
        path: ['SESSION_COOKIE_SAMESITE'],
        message: 'SameSite=None exige COOKIE_SECURE=true',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

/** Nom de la base dans une URI MongoDB (segment de chemin), ou null s'il est absent. */
export function databaseNameOf(uri: string): string | null {
  const match = /^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]*)/.exec(uri);
  const name = match?.[1] ? decodeURIComponent(match[1]) : '';
  return name || null;
}

/** Suffixe réservé aux bases de test isolées (voir tests/helpers/testDatabase.ts). */
export const TEST_DATABASE_SUFFIX = '_test';

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Configuration d’environnement invalide :\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export const env = parseEnv(process.env);
