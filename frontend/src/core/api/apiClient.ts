import type { z } from 'zod';
import { appEnv } from '../config/appEnv';
import { ApiError, clientErrorCodes, defaultMessageForStatus } from './apiError';
import { apiErrorEnvelopeSchema, apiSuccessEnvelopeSchema, type ApiResult } from './apiTypes';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions<T> {
  /** Schéma Zod validant `data` : aucune réponse serveur n'est utilisée sans validation. */
  schema: z.ZodType<T>;
  method?: HttpMethod;
  query?: Record<string, QueryValue>;
  body?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal;
  /** Clé UUID réutilisée lors des nouvelles tentatives d'une même soumission. */
  idempotencyKey?: string;
}

export type MethodOptions<T> = Omit<RequestOptions<T>, 'schema' | 'method'>;

export interface ApiClientConfig {
  baseUrl: string;
  fetchFn?: typeof fetch;
  /** Point d'extension (ex. jeton CSRF) appliqué avant chaque requête. */
  prepareHeaders?: (headers: Headers, context: { method: HttpMethod }) => void;
}

function buildUrl(baseUrl: string, path: string, query?: Record<string, QueryValue>): string {
  const url = `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) params.append(key, String(value));
  }
  const search = params.toString();
  return search ? `${url}?${search}` : url;
}

/**
 * Annulation : signal de l'appelant interrompu, ou erreur nommée AbortError.
 * On évite `instanceof DOMException`, dont la classe varie selon l'environnement (navigateur, jsdom, undici).
 */
function isCancellation(error: unknown, signal: AbortSignal | undefined): boolean {
  if (signal?.aborted) return true;
  return (
    typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError'
  );
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function invalidResponse(status: number): ApiError {
  return new ApiError({
    status,
    code: clientErrorCodes.invalidResponse,
    message: 'La réponse du serveur est inattendue. Veuillez réessayer.',
  });
}

export function createApiClient(initialConfig: ApiClientConfig) {
  let config = initialConfig;

  async function request<T>(path: string, options: RequestOptions<T>): Promise<ApiResult<T>> {
    const method = options.method ?? 'GET';
    const headers = new Headers(options.headers);
    headers.set('Accept', 'application/json');

    let body: BodyInit | undefined;
    if (options.body instanceof FormData) {
      body = options.body;
    } else if (options.body instanceof Blob) {
      // Fichier binaire (téléversement) : son type MIME devient le Content-Type.
      headers.set('Content-Type', options.body.type || 'application/octet-stream');
      body = options.body;
    } else if (options.body !== undefined) {
      headers.set('Content-Type', 'application/json');
      body = JSON.stringify(options.body);
    }
    if (options.idempotencyKey) headers.set('Idempotency-Key', options.idempotencyKey);
    config.prepareHeaders?.(headers, { method });

    const fetchFn = config.fetchFn ?? globalThis.fetch;
    let response: Response;
    try {
      response = await fetchFn(buildUrl(config.baseUrl, path, options.query), {
        method,
        headers,
        body,
        signal: options.signal,
        credentials: 'include',
      });
    } catch (error) {
      if (isCancellation(error, options.signal)) throw error;
      throw new ApiError({
        status: 0,
        code: clientErrorCodes.networkError,
        message: 'Impossible de joindre le serveur. Vérifiez votre connexion internet.',
      });
    }

    const payload = await readJson(response);

    if (!response.ok) {
      const failure = apiErrorEnvelopeSchema.safeParse(payload);
      if (failure.success) {
        throw new ApiError({ status: response.status, ...failure.data.error });
      }
      throw new ApiError({
        status: response.status,
        code: clientErrorCodes.httpError,
        message: defaultMessageForStatus(response.status),
      });
    }

    const rawData = response.status === 204 ? { success: true, data: undefined } : payload;
    const envelope = apiSuccessEnvelopeSchema.safeParse(rawData);
    if (!envelope.success) throw invalidResponse(response.status);

    const data = options.schema.safeParse(envelope.data.data);
    if (!data.success) throw invalidResponse(response.status);

    return { data: data.data, meta: envelope.data.meta };
  }

  return {
    request,
    get: <T>(path: string, schema: z.ZodType<T>, options?: MethodOptions<T>) =>
      request(path, { ...options, schema, method: 'GET' }),
    post: <T>(path: string, schema: z.ZodType<T>, options?: MethodOptions<T>) =>
      request(path, { ...options, schema, method: 'POST' }),
    put: <T>(path: string, schema: z.ZodType<T>, options?: MethodOptions<T>) =>
      request(path, { ...options, schema, method: 'PUT' }),
    patch: <T>(path: string, schema: z.ZodType<T>, options?: MethodOptions<T>) =>
      request(path, { ...options, schema, method: 'PATCH' }),
    delete: <T>(path: string, schema: z.ZodType<T>, options?: MethodOptions<T>) =>
      request(path, { ...options, schema, method: 'DELETE' }),
    configure(partial: Partial<ApiClientConfig>) {
      config = { ...config, ...partial };
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

export const apiClient = createApiClient({ baseUrl: appEnv.VITE_API_BASE_URL });
