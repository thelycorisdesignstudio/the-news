import { config } from './config';
import { openDb } from './db';
import { createApp } from './app';
import { createMailer } from './mailer';
import { pruneStories, seedDemoStories } from './stories';
import { startDailyPush } from './push';
import { startIngest } from './ingest/pipeline';

// Settings that are fine while testing but must not reach real readers.
if (config.production) {
  const risky = [
    config.dummyAuth && 'DUMMY_AUTH is on: any email and password signs in (set DUMMY_AUTH=0)',
    config.demoAuth && 'DEMO_AUTH is on: codes and reset links appear on screen (set DEMO_AUTH=0)',
    !config.appOrigin.startsWith('https://') && `APP_ORIGIN is ${config.appOrigin}; cookies and OAuth need the public https URL`,
    config.news.live && !config.news.anthropicKey && 'ANTHROPIC_API_KEY is not set: cards use the extractive writer',
  ].filter(Boolean);
  for (const r of risky) console.warn(`⚠ ${r}`);
}

const db = openDb(config.databasePath);
if (config.seedDemo) seedDemoStories(db);

const app = createApp({ db, mail: createMailer(), staticDir: config.production ? 'dist' : undefined });
const stopPush = startDailyPush(db);
const stopIngest = config.news.live ? startIngest(db) : () => {};
// Old stories nobody saved or read leave the database; runs at boot and every six hours.
const prune = () => { try { const n = pruneStories(db, config.retentionDays); if (n) console.log(`[retention] removed ${n} old stories`); } catch (e) { console.error('[retention] failed', e); } };
prune();
const pruneTimer = setInterval(prune, 6 * 3600_000);
pruneTimer.unref();
if (config.news.live) console.log(`Live news on: ${config.news.anthropicKey ? `write-ups by ${config.news.model}` : 'extractive write-ups (set ANTHROPIC_API_KEY for Claude)'}`);

const server = app.listen(config.port, () => {
  console.log(`The News API listening on http://localhost:${config.port}${config.production ? ' (serving dist/)' : ''}`);
});

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    stopPush();
    stopIngest();
    clearInterval(pruneTimer);
    server.close(() => { db.close(); process.exit(0); });
  });
}
