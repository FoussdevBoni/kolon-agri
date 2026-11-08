import { describe, expect, it } from 'vitest';
import { databaseNameOf, parseEnv } from '../../src/core/config/env.js';
import {
  assertEmailWorkerAllowed,
  EmailWorkerConfigurationError,
} from '../../src/core/email/emailWorker.js';
import { getEmailProvider } from '../../src/core/email/emailProvider.js';

const devUri = 'mongodb+srv://cluster.example.net/kolon_agri?retryWrites=true';
const testUri = 'mongodb+srv://cluster.example.net/kolon_agri_test?retryWrites=true';

describe('isolation des environnements', () => {
  it('extrait le nom de base d’une URI MongoDB', () => {
    expect(databaseNameOf(devUri)).toBe('kolon_agri');
    expect(databaseNameOf('mongodb://127.0.0.1:27017/kolon_agri_test')).toBe('kolon_agri_test');
    expect(databaseNameOf('mongodb://127.0.0.1:27017')).toBeNull();
  });

  it('refuse une clé Resend dans un processus de test', () => {
    expect(() =>
      parseEnv({ NODE_ENV: 'test', MONGODB_URI: testUri, RESEND_API_KEY: 're_reelle' }),
    ).toThrow(/RESEND_API_KEY doit être vide en test/);
    expect(parseEnv({ NODE_ENV: 'test', MONGODB_URI: testUri, RESEND_API_KEY: '' }).NODE_ENV).toBe(
      'test',
    );
  });

  it('refuse une base de test hors NODE_ENV=test', () => {
    expect(() => parseEnv({ NODE_ENV: 'development', MONGODB_URI: testUri })).toThrow(
      /réservée aux tests/,
    );
    expect(parseEnv({ NODE_ENV: 'development', MONGODB_URI: devUri }).MONGODB_URI).toBe(devUri);
  });

  it('exige https pour les liens et origines en production', () => {
    const production = {
      NODE_ENV: 'production',
      MONGODB_URI: devUri,
      COOKIE_SECURE: 'true',
      CORS_ORIGINS: 'https://kolon-agri.ml',
    };
    expect(() => parseEnv({ ...production, APP_PUBLIC_URL: 'http://kolon-agri.ml' })).toThrow(
      /APP_PUBLIC_URL/,
    );
    expect(() =>
      parseEnv({
        ...production,
        APP_PUBLIC_URL: 'https://kolon-agri.ml',
        CORS_ORIGINS: 'http://kolon-agri.ml',
      }),
    ).toThrow(/CORS_ORIGINS/);
    expect(parseEnv({ ...production, APP_PUBLIC_URL: 'https://kolon-agri.ml' }).NODE_ENV).toBe(
      'production',
    );
  });

  it('interdit au worker d’emails de démarrer en test ou sur une base de test', () => {
    expect(() => assertEmailWorkerAllowed('test', 'kolon_agri')).toThrow(
      EmailWorkerConfigurationError,
    );
    expect(() => assertEmailWorkerAllowed('development', 'kolon_agri_test')).toThrow(
      /réservée aux tests/,
    );
    expect(() => assertEmailWorkerAllowed('development', 'kolon_agri')).not.toThrow();
  });

  it('n’active aucun fournisseur réel dans le processus de test', () => {
    expect(getEmailProvider()).toBeNull();
  });
});
