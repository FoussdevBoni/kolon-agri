import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'dotenv';
import { defineConfig } from 'vitest/config';

// Lecture seule de backend/.env : les variables du processus (CI) restent prioritaires.
const envFilePath = resolve(import.meta.dirname, '.env');
const fileEnv = existsSync(envFilePath) ? parse(readFileSync(envFilePath)) : {};

const testDatabaseUri = process.env.MONGODB_TEST_URI ?? fileEnv.MONGODB_TEST_URI ?? '';
const developmentDatabaseUri = process.env.MONGODB_URI ?? fileEnv.MONGODB_URI ?? '';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    pool: 'forks',
    // Les fichiers d'intégration partagent la base de test : exécution séquentielle.
    fileParallelism: false,
    hookTimeout: 30_000,
    // Base Atlas distante : plusieurs allers-retours réseau par test.
    testTimeout: 60_000,
    env: {
      NODE_ENV: 'test',
      // Valeur neutre, jamais connectée implicitement : seule connectTestDatabase() ouvre une
      // connexion, après validation de MONGODB_TEST_URI par les garde-fous.
      MONGODB_URI: 'mongodb://127.0.0.1:27017/kolon_agri_unconnected_test',
      MONGODB_TEST_URI: testDatabaseUri,
      // Utilisée uniquement par les garde-fous pour refuser la base de développement.
      DEVELOPMENT_MONGODB_URI: developmentDatabaseUri,
      CORS_ORIGINS: 'http://localhost:5173',
      LOG_LEVEL: 'silent',
      // Disponibilité réelle de la base Atlas distante : délai adapté à sa latence, une panne
      // effective (base injoignable, ping en échec) reste détectée et fait échouer le test.
      MONGODB_PING_TIMEOUT_MS: '15000',
      // Jamais d'envoi réel pendant les tests : la clé de backend/.env est neutralisée.
      RESEND_API_KEY: '',
      RESEND_FROM: 'Kolon Agri Test <test@example.com>',
      // Aucun appel réel à Cloudinary : les tests utilisent un stockage simulé.
      CLOUDINARY_CLOUD_NAME: '',
      CLOUDINARY_API_KEY: '',
      CLOUDINARY_API_SECRET: '',
    },
  },
});
