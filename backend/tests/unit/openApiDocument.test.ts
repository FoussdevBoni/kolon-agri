import { describe, expect, it } from 'vitest';
import { buildOpenApiDocument } from '../../src/app/openApiDocument.js';

describe('buildOpenApiDocument', () => {
  it('produit un document OpenAPI 3.1 décrivant /health', () => {
    const document = buildOpenApiDocument();
    expect(document.openapi).toBe('3.1.0');
    expect(document.servers).toEqual([{ url: '/api/v1' }]);
    const health = document.paths['/health'].get;
    expect(Object.keys(health.responses)).toEqual(['200', '503']);
    expect(JSON.stringify(health.responses['200'])).toContain('uptimeSeconds');
  });
});
