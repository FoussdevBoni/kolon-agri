import { describe, expect, it } from 'vitest';
import { assertSafeTestDatabase, parseMongoUri } from '../helpers/testDatabase.js';

const testUri =
  'mongodb+srv://user:secret@cluster0.example.mongodb.net/kolon_agri_test?retryWrites=true';
const developmentUri =
  'mongodb+srv://user:secret@cluster0.example.mongodb.net/kolon_agri?retryWrites=true';

describe('parseMongoUri', () => {
  it('extrait hôtes et base sans identifiants, y compris en multi-hôtes', () => {
    expect(parseMongoUri(testUri)).toEqual({
      hosts: 'cluster0.example.mongodb.net',
      databaseName: 'kolon_agri_test',
    });
    expect(parseMongoUri('mongodb://h1:27017,h2:27017/kolon_agri_test?replicaSet=rs0')).toEqual({
      hosts: 'h1:27017,h2:27017',
      databaseName: 'kolon_agri_test',
    });
    expect(parseMongoUri('mongodb://h1:27017')).toBeNull();
  });
});

describe('assertSafeTestDatabase', () => {
  const safe = { nodeEnv: 'test', testUri, developmentUri };

  it('accepte une base de test distincte suffixée _test', () => {
    expect(assertSafeTestDatabase(safe)).toBe(testUri);
  });

  it('refuse hors NODE_ENV=test', () => {
    expect(() => assertSafeTestDatabase({ ...safe, nodeEnv: 'development' })).toThrow(/NODE_ENV/);
  });

  it('refuse une URI absente, invalide ou sans nom de base explicite', () => {
    expect(() => assertSafeTestDatabase({ ...safe, testUri: undefined })).toThrow(
      /n’est pas définie/,
    );
    expect(() => assertSafeTestDatabase({ ...safe, testUri: 'http://x/kolon_agri_test' })).toThrow(
      /URI MongoDB valide/,
    );
    expect(() =>
      assertSafeTestDatabase({
        ...safe,
        testUri: 'mongodb+srv://u:p@cluster0.example.mongodb.net/',
      }),
    ).toThrow(/nommer explicitement/);
  });

  it('refuse une base dont le nom ne se termine pas par _test', () => {
    expect(() => assertSafeTestDatabase({ ...safe, testUri: developmentUri })).toThrow(/_test/);
  });

  it('refuse la base de développement, même désignée par une autre URI', () => {
    const sameDatabase = 'mongodb+srv://other:pwd@cluster1.example.mongodb.net/kolon_agri_test';
    expect(() => assertSafeTestDatabase({ ...safe, developmentUri: sameDatabase })).toThrow(
      /distincte/,
    );
  });

  it('n’inclut jamais l’URI ni les identifiants dans les messages', () => {
    expect.assertions(2);
    try {
      assertSafeTestDatabase({ ...safe, testUri: developmentUri });
    } catch (error) {
      expect(String(error)).not.toContain('secret');
      expect(String(error)).not.toContain('cluster0');
    }
  });
});
