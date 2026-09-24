import express, { type ErrorRequestHandler } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { DB } from './db';
import type { Mailer } from './mailer';
import { HttpError, sessionMiddleware } from './auth';
import { authRoutes } from './routes/auth';
import { oauthRoutes } from './routes/oauth';
import { dataRoutes } from './routes/data';
import { adminRoutes } from './routes/admin';
import { errorRef } from './security';

export function createApp({ db, mail, staticDir }: { db: DB; mail: Mailer; staticDir?: string }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        'default-src': ["'self'"],
        'img-src': ["'self'", 'data:'],
        'style-src': ["'self'", "'unsafe-inline'"],
        'font-src': ["'self'", 'data:'],
        'connect-src': ["'self'"],
        'form-action': ["'self'", 'https://accounts.google.com', 'https://appleid.apple.com'],
      },
    },
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  }));
  app.use(compression());
  app.use(cookieParser());

  const api = express.Router();
  api.use(express.json({ limit: '200kb' }));
  // JSON-only writes plus SameSite=Lax cookies keep cross-site form posts out.
  api.use((req, _res, next) => {
    const write = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    if (write && !req.path.startsWith('/auth/oauth/') && !req.is('application/json') && req.headers['content-length'] !== '0' && req.headers['content-length'] !== undefined) {
      throw new HttpError(415, 'send JSON.');
    }
    next();
  });
  api.use(sessionMiddleware(db));
  api.get('/health', (_req, res) => { res.json({ ok: true }); });
  api.use('/auth', oauthRoutes(db));
  api.use('/auth', authRoutes(db, mail));
  api.use('/admin', adminRoutes(db));
  api.use(dataRoutes(db));
  api.use((_req, _res) => { throw new HttpError(404, 'not found.'); });

  const onError: ErrorRequestHandler = (err, req, res, _next) => {
    void _next;
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message, status: err.status, ...err.extra });
      return;
    }
    if ((err as { type?: string }).type === 'entity.parse.failed') {
      res.status(400).json({ error: 'invalid JSON.', status: 400 });
      return;
    }
    const ref = errorRef();
    console.error(`[error ${ref}] ${req.method} ${req.originalUrl}`, err);
    res.status(500).json({ error: 'something went wrong on our side.', status: 500, ref });
  };
  api.use(onError);
  app.use('/api', api);

  if (staticDir && existsSync(staticDir)) {
    const root = resolve(staticDir);
    app.use(express.static(root, {
      index: false,
      setHeaders: (res, path) => {
        if (path.includes('/assets/')) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        else res.setHeader('Cache-Control', 'no-cache');
      },
    }));
    // Client-side routes all resolve to the app shell.
    app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(resolve(root, 'index.html')));
  }
  return app;
}
