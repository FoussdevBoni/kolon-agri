import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { buildOpenApiDocument } from '../app/openApiDocument.js';
import { logger } from '../core/logger/logger.js';

const outputPath = resolve(import.meta.dirname, '../../openapi/openapi.json');

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(buildOpenApiDocument(), null, 2)}\n`, 'utf8');
logger.info({ outputPath }, 'Contrat OpenAPI exporté');
