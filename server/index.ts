import { config } from './config';
import { openDb } from './db';
import { createApp } from './app';
import { createMailer } from './mailer';
import { seedDemoStories } from './stories';
import { startDailyPush } from './push';

const db = openDb(config.databasePath);
if (config.seedDemo) seedDemoStories(db);

const app = createApp({ db, mail: createMailer(), staticDir: config.production ? 'dist' : undefined });
const stopPush = startDailyPush(db);

const server = app.listen(config.port, () => {
  console.log(`The News API listening on http://localhost:${config.port}${config.production ? ' (serving dist/)' : ''}`);
});

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    stopPush();
    server.close(() => { db.close(); process.exit(0); });
  });
}
