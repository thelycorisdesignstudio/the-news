import { readFileSync, existsSync } from 'node:fs';

// Minimal .env loader so `npm run dev` works without extra tooling. Real environment variables win.
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
  }
}

const env = process.env;
const production = env.NODE_ENV === 'production';

export const config = {
  production,
  port: Number(env.PORT || 8787),
  appOrigin: (env.APP_ORIGIN || 'http://localhost:5173').replace(/\/$/, ''),
  databasePath: env.DATABASE_PATH || './data/the-news.db',
  /** Bundled demo stories. Off by default once live news is on, so real and demo stories never mix. */
  seedDemo: env.SEED_DEMO ? env.SEED_DEMO === '1' : env.LIVE_NEWS === '0',
  /**
   * Real-time ingestion: RSS/Atom from Yahoo Finance, tech and business desks, wires via Google News and city papers, read in full
   * through Jina Reader (agent-reach's web channel) and written up by Claude. LIVE_NEWS=0 turns it off.
   */
  news: {
    live: env.LIVE_NEWS !== '0',
    /** Newest items written up per cycle, so a cold start or a backlog can't run up a bill. */
    maxPerCycle: Math.max(1, Number(env.INGEST_MAX_PER_CYCLE || 40)),
    /** Extra feeds, comma-separated `name|url` or bare urls. */
    extraFeeds: env.NEWS_FEEDS || '',
    anthropicKey: env.ANTHROPIC_API_KEY || '',
    model: env.NEWS_MODEL || 'claude-opus-5',
    readerUrl: (env.READER_URL || 'https://r.jina.ai/').replace(/\/?$/, '/'),
    readerKey: env.JINA_API_KEY || '',
    reader: env.READER !== '0',
    /** Optional: path to the agent-reach CLI; its `doctor --json` report is merged into /api/admin/sources. */
    agentReachBin: env.AGENT_REACH_BIN || '',
  },
  adminToken: env.ADMIN_TOKEN || '',
  /**
   * Dummy auth for testing: verification codes and reset links come back in API responses, and
   * Apple/Google (when not configured) sign you in as a demo reader. Set DEMO_AUTH=0 in production.
   */
  demoAuth: env.DEMO_AUTH !== '0',
  smtpUrl: env.SMTP_URL || '',
  mailFrom: env.MAIL_FROM || 'The News <hello@thenews.app>',
  google: { clientId: env.GOOGLE_CLIENT_ID || '', clientSecret: env.GOOGLE_CLIENT_SECRET || '' },
  apple: {
    clientId: env.APPLE_CLIENT_ID || '',
    teamId: env.APPLE_TEAM_ID || '',
    keyId: env.APPLE_KEY_ID || '',
    privateKey: (env.APPLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  },
  vapid: { publicKey: env.VAPID_PUBLIC_KEY || '', privateKey: env.VAPID_PRIVATE_KEY || '', subject: env.VAPID_SUBJECT || 'mailto:hello@thenews.app' },
  /** How far back the daily queue reaches. */
  feedWindowHours: Number(env.FEED_WINDOW_HOURS || 36),
  sessionDays: 60,
};
