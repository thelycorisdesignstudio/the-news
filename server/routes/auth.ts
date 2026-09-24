import { Router } from 'express';
import { z } from 'zod';
import type { DB } from '../db';
import type { Mailer } from '../mailer';
import { resetEmail, verificationEmail } from '../mailer';
import { config } from '../config';
import { EMAIL_RE, isValidPassword, PASSWORD_RULE } from '../../shared/domain';
import { HttpError, createSession, destroySession, findUserByEmail, findUserById, requireUser, toUser } from '../auth';
import { hashPassword, newId, newToken, rateLimiter, sha256, sixDigitCode, verifyPassword } from '../security';

export const MAX_LOGIN_ATTEMPTS = 3;
export const LOCK_MINUTES = 15;
export const CODE_TTL_MS = 10 * 60_000;
export const RESEND_COOLDOWN_S = 30;
const RESET_TTL_MS = 30 * 60_000;

const email = z.string().trim().max(254).regex(EMAIL_RE, 'enter a full email address, like name@example.com.');
const password = z.string().max(200).refine(isValidPassword, PASSWORD_RULE);

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const r = schema.safeParse(body);
  if (!r.success) {
    const fields: Record<string, string> = {};
    for (const i of r.error.issues) fields[String(i.path[0] ?? 'form')] ??= i.message;
    throw new HttpError(400, Object.values(fields)[0] ?? 'check the form and try again.', { fields });
  }
  return r.data;
}

export function authRoutes(db: DB, mail: Mailer) {
  const r = Router();
  const ipLimit = rateLimiter(60, 10 * 60_000);
  r.use((req, _res, next) => {
    // Only credential-bearing writes count; GET /me runs on every launch.
    if (req.method === 'GET') return next();
    const wait = ipLimit(req.ip ?? 'unknown');
    if (wait) throw new HttpError(429, `too many requests. try again in ${Math.ceil(wait / 60)} minutes.`, { retryAfter: wait });
    next();
  });

  /** In demo mode the code travels back in the response so testing needs no inbox. */
  async function sendCode(addr: string): Promise<string> {
    const code = sixDigitCode();
    const now = Date.now();
    db.prepare(`INSERT INTO email_codes (email, code_hash, expires_at, sent_at, attempts) VALUES (?, ?, ?, ?, 0)
      ON CONFLICT(email) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, sent_at = excluded.sent_at, attempts = 0`)
      .run(addr, sha256(code), now + CODE_TTL_MS, now);
    await mail({ to: addr, ...verificationEmail(code) });
    return code;
  }
  const dev = (extra: Record<string, unknown>) => (config.demoAuth ? extra : {});

  r.post('/signup', async (req, res) => {
    const body = parse(z.object({
      name: z.string().trim().min(1, 'enter your name.').max(80),
      email,
      password,
      terms: z.literal(true, { message: 'agree to the Terms and Privacy Policy to continue.' }),
    }), req.body);
    const existing = findUserByEmail(db, body.email);
    if (existing?.verified) {
      throw new HttpError(409, 'an account with this email already exists. log in instead.', { fields: { email: 'an account with this email already exists. log in instead.' } });
    }
    const hash = await hashPassword(body.password);
    if (existing) {
      db.prepare('UPDATE users SET name = ?, password_hash = ? WHERE id = ?').run(body.name, hash, existing.id);
    } else {
      db.prepare('INSERT INTO users (id, name, email, password_hash, verified, created_at) VALUES (?, ?, ?, ?, 0, ?)')
        .run(newId(), body.name, body.email, hash, new Date().toISOString());
    }
    const code = await sendCode(body.email);
    res.status(201).json({ pending: true, email: body.email, resendIn: RESEND_COOLDOWN_S, ...dev({ devCode: code }) });
  });

  r.post('/verify', (req, res) => {
    const body = parse(z.object({ email, code: z.string().regex(/^\d{6}$/, 'enter the 6-digit code.') }), req.body);
    const row = db.prepare('SELECT * FROM email_codes WHERE email = ?').get(body.email) as
      { code_hash: string; expires_at: number; attempts: number } | undefined;
    const user = findUserByEmail(db, body.email);
    if (!row || !user) throw new HttpError(400, 'that code has expired. send a new one.', { code: 'code_expired' });
    if (row.expires_at < Date.now()) throw new HttpError(400, 'that code has expired. send a new one.', { code: 'code_expired' });
    if (row.attempts >= 5) throw new HttpError(429, 'too many wrong codes. send a new one.', { code: 'code_locked' });
    if (row.code_hash !== sha256(body.code)) {
      db.prepare('UPDATE email_codes SET attempts = attempts + 1 WHERE email = ?').run(body.email);
      throw new HttpError(400, "that code isn't right. check the email and try again.", { code: 'code_wrong' });
    }
    db.prepare('DELETE FROM email_codes WHERE email = ?').run(body.email);
    db.prepare('UPDATE users SET verified = 1 WHERE id = ?').run(user.id);
    createSession(db, res, user.id);
    res.json({ user: toUser({ ...user, verified: 1 }) });
  });

  r.post('/resend', async (req, res) => {
    const body = parse(z.object({ email }), req.body);
    const row = db.prepare('SELECT sent_at FROM email_codes WHERE email = ?').get(body.email) as { sent_at: number } | undefined;
    const since = row ? (Date.now() - row.sent_at) / 1000 : Infinity;
    if (since < RESEND_COOLDOWN_S) {
      throw new HttpError(429, 'wait a moment before sending another code.', { resendIn: Math.ceil(RESEND_COOLDOWN_S - since) });
    }
    const user = findUserByEmail(db, body.email);
    const code = user && !user.verified ? await sendCode(body.email) : undefined;
    res.json({ ok: true, resendIn: RESEND_COOLDOWN_S, ...dev(code ? { devCode: code } : {}) });
  });

  r.post('/login', async (req, res) => {
    const body = parse(z.object({ email, password: z.string().min(1, 'enter your password.').max(200) }), req.body);
    const now = Date.now();
    const att = db.prepare('SELECT failed, locked_until FROM login_attempts WHERE email = ?').get(body.email) as
      { failed: number; locked_until: number } | undefined;
    if (att && att.locked_until > now) {
      const mins = Math.ceil((att.locked_until - now) / 60_000);
      throw new HttpError(423, `too many attempts. try again in ${mins} minute${mins === 1 ? '' : 's'}, or reset your password.`, {
        code: 'locked', retryAfter: Math.ceil((att.locked_until - now) / 1000),
      });
    }
    const user = findUserByEmail(db, body.email);
    const ok = await verifyPassword(body.password, user?.password_hash ?? null);
    if (!user || !ok) {
      const failed = (att?.failed ?? 0) + 1;
      const locked = failed >= MAX_LOGIN_ATTEMPTS ? now + LOCK_MINUTES * 60_000 : 0;
      db.prepare(`INSERT INTO login_attempts (email, failed, locked_until) VALUES (?, ?, ?)
        ON CONFLICT(email) DO UPDATE SET failed = excluded.failed, locked_until = excluded.locked_until`)
        .run(body.email, locked ? 0 : failed, locked);
      if (locked) {
        throw new HttpError(423, `too many attempts. try again in ${LOCK_MINUTES} minutes, or reset your password.`, { code: 'locked', retryAfter: LOCK_MINUTES * 60 });
      }
      const left = MAX_LOGIN_ATTEMPTS - failed;
      throw new HttpError(401, "that email and password don't match. check them and try again.", {
        code: 'bad_credentials',
        attemptsLeft: left,
        fields: { password: `incorrect password. ${left} attempt${left === 1 ? '' : 's'} left before a ${LOCK_MINUTES}-minute pause.` },
      });
    }
    db.prepare('DELETE FROM login_attempts WHERE email = ?').run(body.email);
    if (!user.verified) {
      const code = await sendCode(user.email);
      throw new HttpError(403, 'confirm your email to finish signing in.', { code: 'needs_verification', email: user.email, resendIn: RESEND_COOLDOWN_S, ...dev({ devCode: code }) });
    }
    createSession(db, res, user.id);
    res.json({ user: toUser(user) });
  });

  r.post('/forgot', async (req, res) => {
    const body = parse(z.object({ email }), req.body);
    const user = findUserByEmail(db, body.email);
    let link: string | undefined;
    if (user) {
      const token = newToken();
      db.prepare('INSERT INTO reset_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(sha256(token), user.id, Date.now() + RESET_TTL_MS);
      link = `/reset-password?token=${token}`;
      await mail({ to: user.email, ...resetEmail(`${config.appOrigin}${link}`) });
    }
    // Same answer either way so the endpoint can't be used to discover accounts (demo mode aside).
    res.json({ ok: true, ...dev(link ? { devLink: link } : {}) });
  });

  r.post('/reset', async (req, res) => {
    const body = parse(z.object({ token: z.string().min(10).max(200), password }), req.body);
    const row = db.prepare('SELECT * FROM reset_tokens WHERE token_hash = ?').get(sha256(body.token)) as
      { user_id: string; expires_at: number; used: number } | undefined;
    if (!row || row.used || row.expires_at < Date.now()) {
      throw new HttpError(400, 'this reset link has expired. request a new one.', { code: 'token_expired' });
    }
    const user = findUserById(db, row.user_id);
    if (!user) throw new HttpError(400, 'this reset link has expired. request a new one.', { code: 'token_expired' });
    const hash = await hashPassword(body.password);
    db.transaction(() => {
      db.prepare('UPDATE reset_tokens SET used = 1 WHERE user_id = ?').run(user.id);
      db.prepare('UPDATE users SET password_hash = ?, verified = 1 WHERE id = ?').run(hash, user.id);
      // Signing out every other device is the point of a reset.
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
      db.prepare('DELETE FROM login_attempts WHERE email = ?').run(user.email);
    })();
    createSession(db, res, user.id);
    res.json({ user: toUser({ ...user, verified: 1 }) });
  });

  /** Demo mode only: one tap signs in as a ready-made reader (stands in for Apple/Google while testing). */
  r.post('/demo', (_req, res) => {
    if (!config.demoAuth) throw new HttpError(404, 'not found.');
    const email = 'demo@thenews.app';
    let user = findUserByEmail(db, email);
    if (!user) {
      db.prepare('INSERT INTO users (id, name, email, verified, created_at) VALUES (?, ?, ?, 1, ?)').run(newId(), 'Demo Reader', email, new Date().toISOString());
      user = findUserByEmail(db, email)!;
    }
    createSession(db, res, user.id);
    res.json({ user: toUser(user) });
  });

  r.post('/logout', (req, res) => {
    destroySession(db, req, res);
    res.json({ ok: true });
  });

  r.get('/me', (req, res) => {
    res.json({ user: req.user ?? null, sessionExpired: !!req.sessionExpired });
  });

  r.delete('/me', requireUser, (req, res) => {
    db.prepare('DELETE FROM users WHERE id = ?').run(req.user!.id);
    destroySession(db, req, res);
    res.json({ ok: true });
  });

  return r;
}
