import type { Request, Response, NextFunction } from 'express';
import type { DB } from './db';
import type { User } from '../shared/domain';
import { config } from './config';
import { newToken, sha256 } from './security';

export const SESSION_COOKIE = 'tn_session';

export class HttpError extends Error {
  constructor(public status: number, message: string, public extra: Record<string, unknown> = {}) {
    super(message);
  }
}

interface UserRow { id: string; name: string; email: string; verified: number; created_at: string; password_hash: string | null }

export const toUser = (r: UserRow): User => ({ id: r.id, name: r.name, email: r.email, verified: !!r.verified, createdAt: r.created_at });

export function findUserByEmail(db: DB, email: string) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim()) as UserRow | undefined;
}

export function findUserById(db: DB, id: string) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
}

export function createSession(db: DB, res: Response, userId: string) {
  const token = newToken();
  const now = Date.now();
  const expires = now + config.sessionDays * 86400_000;
  db.prepare('INSERT INTO sessions (id_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(sha256(token), userId, now, expires);
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.production,
    maxAge: config.sessionDays * 86400_000,
    path: '/',
  });
}

export function destroySession(db: DB, req: Request, res: Response) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) db.prepare('DELETE FROM sessions WHERE id_hash = ?').run(sha256(token));
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
    /** True when the request carried a session cookie that is no longer valid. */
    sessionExpired?: boolean;
  }
}

/** Resolves the session cookie to a user; slides the expiry forward once a day. */
export function sessionMiddleware(db: DB) {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.[SESSION_COOKIE];
    if (!token) return next();
    const row = db.prepare(`SELECT s.expires_at, s.id_hash, u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id_hash = ?`)
      .get(sha256(token)) as (UserRow & { expires_at: number; id_hash: string }) | undefined;
    const now = Date.now();
    if (!row || row.expires_at < now) {
      if (row) db.prepare('DELETE FROM sessions WHERE id_hash = ?').run(row.id_hash);
      res.clearCookie(SESSION_COOKIE, { path: '/' });
      req.sessionExpired = true;
      return next();
    }
    const fresh = now + config.sessionDays * 86400_000;
    if (fresh - row.expires_at > 86400_000) {
      db.prepare('UPDATE sessions SET expires_at = ? WHERE id_hash = ?').run(fresh, row.id_hash);
      res.cookie(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: config.production, maxAge: config.sessionDays * 86400_000, path: '/' });
    }
    req.user = toUser(row);
    next();
  };
}

export function requireUser(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    throw new HttpError(401, req.sessionExpired ? "you've been signed out." : 'log in to continue.', { code: req.sessionExpired ? 'session_expired' : 'unauthenticated' });
  }
  next();
}
