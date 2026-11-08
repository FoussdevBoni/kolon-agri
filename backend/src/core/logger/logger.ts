import { pino, type LoggerOptions } from 'pino';
import { env } from '../config/env.js';

/** Chemins masqués : cookies de session, jetons CSRF, en-têtes d'autorisation et secrets éventuels. */
export const redactedPaths = [
  'req.headers.cookie',
  'req.headers.authorization',
  'req.headers["x-csrf-token"]',
  'res.headers["set-cookie"]',
  '*.password',
  '*.currentPassword',
  '*.newPassword',
  '*.token',
  '*.csrfToken',
];

export const baseLoggerOptions: LoggerOptions = {
  level: env.LOG_LEVEL,
  base: { service: 'kolon-agri-api' },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: { paths: redactedPaths, censor: '[masqué]' },
};

export const logger = pino({
  ...baseLoggerOptions,
  ...(env.NODE_ENV === 'development'
    ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
    : {}),
});
