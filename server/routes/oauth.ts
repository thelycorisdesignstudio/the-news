import { Router, urlencoded } from 'express';
import { createPrivateKey, sign } from 'node:crypto';
import type { Request, Response } from 'express';
import type { DB } from '../db';
import { config } from '../config';
import { createSession } from '../auth';
import { newId, newToken } from '../security';

type Provider = 'google' | 'apple';
const STATE_COOKIE = 'tn_oauth_state';

const enabled = (p: Provider) =>
  p === 'google' ? !!(config.google.clientId && config.google.clientSecret)
    : !!(config.apple.clientId && config.apple.teamId && config.apple.keyId && config.apple.privateKey);

const redirectUri = (p: Provider) => `${config.appOrigin}/api/auth/oauth/${p}/callback`;

const b64url = (b: Buffer | string) => Buffer.from(b).toString('base64url');

/** Apple wants a short-lived ES256 JWT as the client secret. */
function appleClientSecret() {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: config.apple.keyId }));
  const payload = b64url(JSON.stringify({ iss: config.apple.teamId, iat: now, exp: now + 300, aud: 'https://appleid.apple.com', sub: config.apple.clientId }));
  const sig = sign('sha256', Buffer.from(`${header}.${payload}`), { key: createPrivateKey(config.apple.privateKey), dsaEncoding: 'ieee-p1363' });
  return `${header}.${payload}.${b64url(sig)}`;
}

// The id_token arrives straight from the provider's token endpoint over TLS, so its claims can be
// read without re-verifying the signature (OpenID Connect Core §3.1.3.7).
function claims(idToken: string) {
  return JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString()) as {
    sub: string; email?: string; email_verified?: boolean | string; name?: string;
  };
}

export function oauthRoutes(db: DB) {
  const r = Router();

  r.get('/providers', (_req, res) => {
    res.json({ google: enabled('google'), apple: enabled('apple') });
  });

  r.get('/oauth/:provider/start', (req, res) => {
    const p = req.params.provider as Provider;
    if (p !== 'google' && p !== 'apple') return res.status(404).end();
    if (!enabled(p)) return res.redirect(`/welcome?oauth_error=${p}_unavailable`);
    const state = newToken(16);
    res.cookie(STATE_COOKIE, state, {
      httpOnly: true, maxAge: 10 * 60_000, path: '/api/auth/oauth',
      // Apple posts the callback cross-site, which only carries SameSite=None cookies.
      sameSite: config.production ? 'none' : 'lax', secure: config.production,
    });
    const u = p === 'google' ? new URL('https://accounts.google.com/o/oauth2/v2/auth') : new URL('https://appleid.apple.com/auth/authorize');
    u.search = new URLSearchParams(p === 'google'
      ? { client_id: config.google.clientId, redirect_uri: redirectUri(p), response_type: 'code', scope: 'openid email profile', state, prompt: 'select_account' }
      : { client_id: config.apple.clientId, redirect_uri: redirectUri(p), response_type: 'code', response_mode: 'form_post', scope: 'name email', state },
    ).toString();
    res.redirect(u.toString());
  });

  async function callback(p: Provider, req: Request, res: Response) {
    const src = (p === 'apple' ? req.body : req.query) as Record<string, string | undefined>;
    const fail = (why: string) => res.redirect(`/welcome?oauth_error=${encodeURIComponent(why)}`);
    if (!src.code || !src.state || src.state !== req.cookies?.[STATE_COOKIE]) return fail('state');
    res.clearCookie(STATE_COOKIE, { path: '/api/auth/oauth' });

    const tokenRes = await fetch(p === 'google' ? 'https://oauth2.googleapis.com/token' : 'https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code', code: src.code, redirect_uri: redirectUri(p),
        client_id: p === 'google' ? config.google.clientId : config.apple.clientId,
        client_secret: p === 'google' ? config.google.clientSecret : appleClientSecret(),
      }),
    });
    if (!tokenRes.ok) return fail('exchange');
    const { id_token } = (await tokenRes.json()) as { id_token?: string };
    if (!id_token) return fail('exchange');
    const c = claims(id_token);
    const verifiedEmail = c.email && (c.email_verified === true || c.email_verified === 'true') ? c.email : undefined;

    // Apple only sends the name once, on the very first sign-in.
    let name = c.name;
    if (p === 'apple' && src.user) {
      try {
        const u = JSON.parse(src.user) as { name?: { firstName?: string; lastName?: string } };
        name = [u.name?.firstName, u.name?.lastName].filter(Boolean).join(' ') || name;
      } catch { /* ignore malformed user payload */ }
    }

    const col = p === 'google' ? 'google_sub' : 'apple_sub';
    let user = db.prepare(`SELECT id FROM users WHERE ${col} = ?`).get(c.sub) as { id: string } | undefined;
    if (!user && verifiedEmail) {
      user = db.prepare('SELECT id FROM users WHERE email = ?').get(verifiedEmail) as { id: string } | undefined;
      if (user) db.prepare(`UPDATE users SET ${col} = ?, verified = 1 WHERE id = ?`).run(c.sub, user.id);
    }
    if (!user) {
      if (!verifiedEmail) return fail('email');
      const id = newId();
      db.prepare(`INSERT INTO users (id, name, email, verified, ${col}, created_at) VALUES (?, ?, ?, 1, ?, ?)`)
        .run(id, name || verifiedEmail.split('@')[0], verifiedEmail, c.sub, new Date().toISOString());
      user = { id };
    }
    createSession(db, res, user.id);
    res.redirect('/auth/complete');
  }

  r.get('/oauth/google/callback', (req, res) => callback('google', req, res));
  r.post('/oauth/apple/callback', urlencoded({ extended: false }), (req, res) => callback('apple', req, res));

  return r;
}
