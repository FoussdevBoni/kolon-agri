import { createHash } from 'node:crypto';
import { z } from 'zod';
import { env } from '../../core/config/env.js';
import { AppError } from '../../core/errors/appError.js';
import { logger } from '../../core/logger/logger.js';
import type { MediaStorage } from './mediaStorage.js';

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folder: string;
}

const uploadResponseSchema = z.object({
  public_id: z.string(),
  // URL publiée sur le site : uniquement le CDN Cloudinary en https (aucune autre destination).
  secure_url: z.url().refine((url) => url.startsWith('https://res.cloudinary.com/'), {
    message: 'URL Cloudinary inattendue',
  }),
  bytes: z.number().int(),
  width: z.number().int(),
  height: z.number().int(),
  format: z.string(),
});

/** Signature Cloudinary : paramètres triés `k=v&…` suivis du secret, hachés en SHA-1. */
export function signCloudinaryParams(params: Record<string, string>, apiSecret: string): string {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key] ?? ''}`)
    .join('&');
  return createHash('sha1').update(`${payload}${apiSecret}`).digest('hex');
}

const storageUnavailable = () =>
  new AppError({
    statusCode: 503,
    code: 'MEDIA_STORAGE_UNAVAILABLE',
    message: 'Le stockage des médias n’est pas configuré. Contactez l’administrateur technique.',
  });

const storageError = (cause: unknown) =>
  new AppError({
    statusCode: 502,
    code: 'MEDIA_STORAGE_ERROR',
    message: 'Le service de stockage des médias a refusé l’opération. Réessayez plus tard.',
    cause,
  });

/** Intégration Cloudinary centralisée (API REST signée) ; le secret ne quitte jamais l'API. */
export function createCloudinaryStorage(
  config: CloudinaryConfig = {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    apiSecret: env.CLOUDINARY_API_SECRET,
    folder: env.CLOUDINARY_FOLDER,
  },
  fetchFn: typeof fetch = (...args) => fetch(...args),
): MediaStorage {
  const configured = Boolean(config.cloudName && config.apiKey && config.apiSecret);
  const endpoint = (action: string) =>
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/image/${action}`;

  async function post(action: string, params: Record<string, string>, file?: Blob) {
    if (!configured) throw storageUnavailable();
    const form = new FormData();
    const signed = { ...params, timestamp: String(Math.floor(Date.now() / 1000)) };
    for (const [key, value] of Object.entries(signed)) form.append(key, value);
    form.append('api_key', config.apiKey);
    form.append('signature', signCloudinaryParams(signed, config.apiSecret));
    if (file) form.append('file', file);

    let response: Response;
    try {
      response = await fetchFn(endpoint(action), { method: 'POST', body: form });
    } catch (error) {
      throw storageError(error);
    }
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      // Le corps d'erreur Cloudinary ne contient pas de secret ; seul le statut est journalisé.
      logger.warn({ status: response.status, action }, 'Requête Cloudinary refusée');
      throw storageError(new Error(`Cloudinary ${String(response.status)}`));
    }
    return payload;
  }

  return {
    async upload(file, { mimeType }) {
      const payload = await post(
        'upload',
        { folder: config.folder },
        new Blob([new Uint8Array(file)], { type: mimeType }),
      );
      const parsed = uploadResponseSchema.safeParse(payload);
      if (!parsed.success) throw storageError(parsed.error);
      return {
        publicId: parsed.data.public_id,
        url: parsed.data.secure_url,
        bytes: parsed.data.bytes,
        width: parsed.data.width,
        height: parsed.data.height,
        format: parsed.data.format,
      };
    },
    async destroy(publicId) {
      await post('destroy', { public_id: publicId, invalidate: 'true' });
    },
  };
}
