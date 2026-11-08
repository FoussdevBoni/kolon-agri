import { describe, expect, it } from 'vitest';
import { parseEnv } from '../../src/core/config/env.js';

const baseEnv = { MONGODB_URI: 'mongodb://127.0.0.1:27017/kolon_agri' };

describe('parseEnv', () => {
  it('applique les valeurs par défaut', () => {
    const env = parseEnv(baseEnv);
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(4000);
    expect(env.CORS_ORIGINS).toEqual(['http://localhost:5173']);
  });

  it('découpe la liste blanche CORS', () => {
    const env = parseEnv({
      ...baseEnv,
      CORS_ORIGINS: 'https://kolon-agri.ml, https://www.kolon-agri.ml ,',
    });
    expect(env.CORS_ORIGINS).toEqual(['https://kolon-agri.ml', 'https://www.kolon-agri.ml']);
  });

  it('accepte une URI mongodb+srv', () => {
    const env = parseEnv({ MONGODB_URI: 'mongodb+srv://cluster.example.net/kolon' });
    expect(env.MONGODB_URI).toBe('mongodb+srv://cluster.example.net/kolon');
  });

  it('refuse une URI MongoDB absente ou invalide', () => {
    expect(() => parseEnv({})).toThrow(/MONGODB_URI/);
    expect(() => parseEnv({ MONGODB_URI: 'http://localhost' })).toThrow(/MONGODB_URI/);
  });

  it('refuse un port hors limites et une origine CORS invalide', () => {
    expect(() => parseEnv({ ...baseEnv, PORT: '70000' })).toThrow(/PORT/);
    expect(() => parseEnv({ ...baseEnv, CORS_ORIGINS: 'pas-une-url' })).toThrow(/CORS_ORIGINS/);
  });
});
