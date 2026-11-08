import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** Jeton opaque aléatoire (256 bits par défaut), encodé en base64url. */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Empreinte SHA-256 stockée à la place du jeton : une fuite de la base n'expose aucun jeton utilisable. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  return left.length === right.length && timingSafeEqual(left, right);
}
