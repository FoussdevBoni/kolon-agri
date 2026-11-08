import { randomUUID } from 'node:crypto';
import { pinoHttp } from 'pino-http';
import { logger } from '../logger/logger.js';

const REQUEST_ID_PATTERN = /^[\w-]{1,100}$/;

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const header = req.headers['x-request-id'];
    const requestId =
      typeof header === 'string' && REQUEST_ID_PATTERN.test(header) ? header : randomUUID();
    res.setHeader('X-Request-Id', requestId);
    return requestId;
  },
  customLogLevel: (_req, res, error) => {
    if (error || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  autoLogging: { ignore: (req) => req.url === '/api/v1/health' },
});
