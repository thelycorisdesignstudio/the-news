import { config } from './config';
import { openDb } from './db';
import { createApp } from './app';
import { createMailer } from './mailer';
import { seedDemoStories } from './stories';
import { startDailyPush } from './push';
import { startIngest } from './ingest/pipeline';

const db = openDb(config.databasePath);
if (config.seedDemo) seedDemoStories(db);

const app = createApp({ db, mail: createMailer(), staticDir: config.production ? 'dist' : undefined });
const stopPush = startDailyPush(db);
const stopIngest = config.news.live ? startIngest(db) : () => {};
if (config.news.live) console.log(`Live news on: ${config.news.anthropicKey ? `write-ups by ${config.news.model}` : 'extractive write-ups (set ANTHROPIC_API_KEY for Claude)'}`);

const server = app.listen(config.port, () => {
  console.log(`The News API listening on http://localhost:${config.port}${config.production ? ' (serving dist/)' : ''}`);
});

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    stopPush();
    stopIngest();
    server.close(() => { db.close(); process.exit(0); });
  });
}
