import { randomBytes, scrypt, type ScryptOptions, timingSafeEqual } from 'node:crypto';

/**
 * Hachage scrypt (paramètres OWASP : N=2^15, r=8, p=3), sel aléatoire par mot de passe.
 * Format stocké : scrypt$N$r$p$sel$empreinte (base64url), paramètres relus à la vérification.
 */
const DEFAULT_PARAMS = { N: 2 ** 15, r: 8, p: 3 } as const;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const MAX_MEMORY = 128 * 1024 * 1024;
// Bornes refusant des paramètres altérés en base qui provoqueraient un déni de service.
const MAX_N = 2 ** 17;
const MAX_P = 16;

function derive(password: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password.normalize('NFKC'),
      salt,
      KEY_LENGTH,
      { ...options, maxmem: MAX_MEMORY },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(password, salt, DEFAULT_PARAMS);
  const { N, r, p } = DEFAULT_PARAMS;
  return ['scrypt', N, r, p, salt.toString('base64url'), key.toString('base64url')].join('$');
}

interface ParsedHash {
  params: { N: number; r: number; p: number };
  salt: Buffer;
  key: Buffer;
}

function parseHash(stored: string): ParsedHash | null {
  const [algorithm, n, r, p, salt, key] = stored.split('$');
  if (algorithm !== 'scrypt' || !n || !r || !p || !salt || !key) return null;
  const params = { N: Number(n), r: Number(r), p: Number(p) };
  const validParams =
    Number.isInteger(params.N) &&
    params.N > 1 &&
    params.N <= MAX_N &&
    Number.isInteger(params.r) &&
    params.r >= 1 &&
    params.r <= 16 &&
    Number.isInteger(params.p) &&
    params.p >= 1 &&
    params.p <= MAX_P;
  if (!validParams) return null;
  return { params, salt: Buffer.from(salt, 'base64url'), key: Buffer.from(key, 'base64url') };
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parsed = parseHash(stored);
  if (!parsed || parsed.key.length !== KEY_LENGTH) return false;
  const candidate = await derive(password, parsed.salt, parsed.params);
  return timingSafeEqual(candidate, parsed.key);
}

let dummyHash: Promise<string> | undefined;

/** Vérification factice pour un compte inexistant : temps de réponse comparable, résultat toujours faux. */
export async function verifyAgainstDummyHash(password: string): Promise<false> {
  dummyHash ??= hashPassword(randomBytes(32).toString('base64url'));
  await verifyPassword(password, await dummyHash);
  return false;
}
