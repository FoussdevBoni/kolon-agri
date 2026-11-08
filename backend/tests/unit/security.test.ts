import { Writable } from 'node:stream';
import { pino } from 'pino';
import { describe, expect, it } from 'vitest';
import { parseEnv } from '../../src/core/config/env.js';
import { parseCookies } from '../../src/core/http/cookies.js';
import { baseLoggerOptions } from '../../src/core/logger/logger.js';
import { AttemptLimiter } from '../../src/core/security/attemptLimiter.js';
import {
  hashPassword,
  verifyAgainstDummyHash,
  verifyPassword,
} from '../../src/core/security/passwordHasher.js';
import { generateToken, hashToken, safeEqual } from '../../src/core/security/tokens.js';
import {
  evaluateSession,
  getIdleExpiresAt,
  SESSION_IDLE_TIMEOUT_MS,
  shouldTouchSession,
} from '../../src/modules/auth/sessionPolicy.js';

const HOUR = 60 * 60 * 1000;

describe('hachage des mots de passe', () => {
  it('produit un hachage salé, vérifiable et distinct à chaque appel', async () => {
    const first = await hashPassword('Mot-De-Passe-Correct-1');
    const second = await hashPassword('Mot-De-Passe-Correct-1');

    expect(first).toMatch(/^scrypt\$32768\$8\$3\$/);
    expect(first).not.toBe(second);
    expect(first).not.toContain('Mot-De-Passe');
    await expect(verifyPassword('Mot-De-Passe-Correct-1', first)).resolves.toBe(true);
    await expect(verifyPassword('mot-de-passe-correct-1', first)).resolves.toBe(false);
  });

  it('rejette les empreintes malformées ou aux paramètres abusifs', async () => {
    await expect(verifyPassword('x', 'bcrypt$abc')).resolves.toBe(false);
    await expect(verifyPassword('x', 'scrypt$1073741824$8$1$c2Fs$a2V5')).resolves.toBe(false);
    await expect(verifyAgainstDummyHash('x')).resolves.toBe(false);
  });
});

describe('jetons', () => {
  it('génère des jetons aléatoires et compare en temps constant', () => {
    const token = generateToken();
    expect(token).toMatch(/^[\w-]{43}$/);
    expect(generateToken()).not.toBe(token);
    expect(hashToken(token)).toMatch(/^[a-f\d]{64}$/);
    expect(safeEqual(token, token)).toBe(true);
    expect(safeEqual(token, `${token}x`)).toBe(false);
  });
});

describe('politique de session', () => {
  const now = new Date('2026-11-06T12:00:00Z');

  it('applique 24 h d’inactivité et 7 jours maximum', () => {
    const fresh = { lastActivityAt: now, expiresAt: new Date(now.getTime() + 7 * 24 * HOUR) };
    expect(evaluateSession(fresh, now)).toBe('active');
    expect(evaluateSession(fresh, new Date(now.getTime() + SESSION_IDLE_TIMEOUT_MS))).toBe(
      'idleExpired',
    );
    expect(evaluateSession({ ...fresh, expiresAt: now }, now)).toBe('expired');
  });

  it('borne l’expiration d’inactivité par l’expiration absolue', () => {
    const nearEnd = { lastActivityAt: now, expiresAt: new Date(now.getTime() + HOUR) };
    expect(getIdleExpiresAt(nearEnd).getTime()).toBe(now.getTime() + HOUR);
  });

  it('limite les écritures d’activité', () => {
    expect(shouldTouchSession(new Date(now.getTime() - 60_000), now)).toBe(false);
    expect(shouldTouchSession(new Date(now.getTime() - 10 * 60_000), now)).toBe(true);
  });
});

describe('AttemptLimiter', () => {
  it('bloque après le seuil puis libère à la fin de la fenêtre', () => {
    let clock = 0;
    const limiter = new AttemptLimiter({ maxAttempts: 2, windowMs: 1000 }, () => clock);
    limiter.registerFailure('ip');
    expect(limiter.getRetryAfterMs('ip')).toBe(0);
    limiter.registerFailure('ip');
    expect(limiter.getRetryAfterMs('ip')).toBe(1000);
    clock = 1000;
    expect(limiter.getRetryAfterMs('ip')).toBe(0);
  });

  it('borne le nombre de clés suivies', () => {
    const limiter = new AttemptLimiter({ maxAttempts: 1, windowMs: 1000, maxEntries: 2 }, () => 0);
    limiter.registerFailure('a');
    limiter.registerFailure('b');
    limiter.registerFailure('c');
    expect(limiter.getRetryAfterMs('a')).toBe(0);
    expect(limiter.getRetryAfterMs('c')).toBe(1000);
  });
});

describe('parseCookies', () => {
  it('décode les cookies et conserve la première occurrence', () => {
    const cookies = parseCookies(
      'a=1; kolon_session=abc%2Dd; kolon_session=pirate; b="x"; mal=%E0',
    );
    expect(cookies.get('kolon_session')).toBe('abc-d');
    expect(cookies.get('b')).toBe('x');
    expect(cookies.has('mal')).toBe(false);
  });
});

describe('configuration des cookies', () => {
  const base = { MONGODB_URI: 'mongodb://127.0.0.1:27017/kolon_agri' };

  it('active Secure par défaut en production et l’exige', () => {
    const production = {
      ...base,
      NODE_ENV: 'production',
      APP_PUBLIC_URL: 'https://kolon-agri.ml',
      CORS_ORIGINS: 'https://kolon-agri.ml',
    };
    expect(parseEnv(production).COOKIE_SECURE).toBe(true);
    expect(parseEnv(base).COOKIE_SECURE).toBe(false);
    expect(() => parseEnv({ ...production, COOKIE_SECURE: 'false' })).toThrow(/COOKIE_SECURE/);
  });

  it('refuse SameSite=None sans Secure', () => {
    expect(() => parseEnv({ ...base, SESSION_COOKIE_SAMESITE: 'none' })).toThrow(/SameSite/);
  });
});

describe('journalisation', () => {
  it('masque cookies, jetons CSRF et mots de passe', () => {
    const lines: string[] = [];
    const stream = new Writable({
      write(chunk: Buffer, _encoding, callback) {
        lines.push(chunk.toString());
        callback();
      },
    });
    const logger = pino({ ...baseLoggerOptions, level: 'info' }, stream);

    logger.info({
      req: { headers: { cookie: 'kolon_session=secret-session', 'x-csrf-token': 'secret-csrf' } },
      body: { password: 'secret-password', token: 'secret-token' },
    });

    const output = lines.join('');
    expect(output).not.toMatch(/secret-(session|csrf|password|token)/);
    expect(output).toContain('[masqué]');
  });
});
