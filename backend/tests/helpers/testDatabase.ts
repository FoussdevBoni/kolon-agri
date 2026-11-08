import mongoose from 'mongoose';
import { connectDatabase } from '../../src/core/database/databaseConnection.js';

/** Suffixe obligatoire du nom de la base de test isolée. */
export const TEST_DATABASE_SUFFIX = '_test';

const MONGO_URI_PATTERN = /^mongodb(?:\+srv)?:\/\/(?:[^@/]*@)?([^/?]+)\/([^?]*)/;

export interface MongoUriParts {
  hosts: string;
  databaseName: string;
}

/** Extrait les hôtes et le nom de base d'une URI MongoDB, sans jamais exposer les identifiants. */
export function parseMongoUri(uri: string): MongoUriParts | null {
  const match = MONGO_URI_PATTERN.exec(uri.trim());
  if (!match?.[1]) return null;
  return { hosts: match[1].toLowerCase(), databaseName: decodeURIComponent(match[2] ?? '') };
}

export interface TestDatabaseContext {
  nodeEnv: string | undefined;
  testUri: string | undefined;
  developmentUri: string | undefined;
}

/**
 * Refuse toute connexion de test qui pourrait viser une autre base que la base de test isolée.
 * Les messages ne contiennent jamais l'URI (identifiants Atlas).
 */
export function assertSafeTestDatabase({
  nodeEnv,
  testUri,
  developmentUri,
}: TestDatabaseContext): string {
  if (nodeEnv !== 'test') {
    throw new Error('Connexion de test refusée : NODE_ENV doit valoir « test ».');
  }
  if (!testUri) {
    throw new Error('Connexion de test refusée : MONGODB_TEST_URI n’est pas définie.');
  }
  const test = parseMongoUri(testUri);
  if (!test) {
    throw new Error(
      'Connexion de test refusée : MONGODB_TEST_URI n’est pas une URI MongoDB valide.',
    );
  }
  if (!test.databaseName) {
    throw new Error(
      'Connexion de test refusée : MONGODB_TEST_URI doit nommer explicitement la base (ex. /kolon_agri_test).',
    );
  }
  if (!test.databaseName.endsWith(TEST_DATABASE_SUFFIX)) {
    throw new Error(
      `Connexion de test refusée : le nom de la base de test doit se terminer par « ${TEST_DATABASE_SUFFIX} ».`,
    );
  }
  if (developmentUri) {
    const development = parseMongoUri(developmentUri);
    if (
      testUri.trim() === developmentUri.trim() ||
      development?.databaseName === test.databaseName
    ) {
      throw new Error(
        'Connexion de test refusée : la base de test doit être distincte de la base de développement (MONGODB_URI).',
      );
    }
  }
  return testUri;
}

/** Vérifie la base effectivement servie par la connexion, avant toute opération de test. */
export function assertConnectedToTestDatabase(): void {
  const databaseName = mongoose.connection.name;
  if (!databaseName.endsWith(TEST_DATABASE_SUFFIX)) {
    throw new Error(
      'Opération de test refusée : la connexion active ne vise pas une base de test.',
    );
  }
}

/** Indique si les tests d'intégration MongoDB doivent s'exécuter (toujours en CI). */
export function isTestDatabaseConfigured(): boolean {
  return Boolean(process.env['MONGODB_TEST_URI']) || Boolean(process.env['CI']);
}

export async function connectTestDatabase(): Promise<void> {
  const uri = assertSafeTestDatabase({
    nodeEnv: process.env['NODE_ENV'],
    testUri: process.env['MONGODB_TEST_URI'],
    developmentUri: process.env['DEVELOPMENT_MONGODB_URI'],
  });
  await connectDatabase(uri);
  assertConnectedToTestDatabase();
}

/**
 * Vide des collections de la base de test, entre deux tests. Seule opération destructive
 * autorisée : la base active est revérifiée avant chaque suppression.
 */
export async function clearTestCollections(names: readonly string[]): Promise<void> {
  assertConnectedToTestDatabase();
  const { db } = mongoose.connection;
  if (!db) throw new Error('Aucune connexion MongoDB active.');
  for (const name of names) {
    assertConnectedToTestDatabase();
    await db.collection(name).deleteMany({});
  }
}
