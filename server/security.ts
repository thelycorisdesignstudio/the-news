import { createHash, randomBytes, randomInt, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;
const PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, 64, PARAMS);
  return `scrypt$${PARAMS.N}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(pw: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const [alg, n, saltB64, keyB64] = stored.split('$');
  if (alg !== 'scrypt') return false;
  const key = Buffer.from(keyB64, 'base64');
  const got = await scrypt(pw, Buffer.from(saltB64, 'base64'), key.length, { ...PARAMS, N: Number(n) });
  return timingSafeEqual(key, got);
}

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
export const newToken = (bytes = 32) => randomBytes(bytes).toString('base64url');
export const newId = () => randomBytes(12).toString('base64url');
export const sixDigitCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

/** Short, readable reference shown with server errors, e.g. 7F2K-91. */
export function errorRef() {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const pick = (n: number) => Array.from({ length: n }, () => a[randomInt(0, a.length)]).join('');
  return `${pick(4)}-${pick(2)}`;
}

/** Tiny fixed-window limiter, per key. Good enough for a single instance; swap for Redis when scaling out. */
export function rateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, { n: number; reset: number }>();
  return (key: string): number => {
    const now = Date.now();
    let h = hits.get(key);
    if (!h || h.reset < now) {
      h = { n: 0, reset: now + windowMs };
      hits.set(key, h);
      if (hits.size > 10_000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    }
    h.n++;
    return h.n > limit ? Math.ceil((h.reset - now) / 1000) : 0;
  };
}
