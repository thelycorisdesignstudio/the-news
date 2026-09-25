import webpush from 'web-push';
import type { DB } from './db';
import { config } from './config';
import { windowStories } from './stories';
import { matchesFilters, type Prefs } from '../shared/domain';

const enabled = () => !!(config.vapid.publicKey && config.vapid.privateKey);
export const pushPublicKey = () => (enabled() ? config.vapid.publicKey : null);

function localClock(tz: string | undefined, now: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz || 'UTC', hour: '2-digit', minute: '2-digit', year: 'numeric', month: '2-digit', day: '2-digit', hourCycle: 'h23' })
    .formatToParts(now);
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
  return { hm: `${get('hour')}:${get('minute')}`, day: `${get('year')}-${get('month')}-${get('day')}` };
}

/** Once a minute, sends each opted-in reader their single most important story at their chosen local time. */
export function startDailyPush(db: DB) {
  if (!enabled()) return () => {};
  webpush.setVapidDetails(config.vapid.subject, config.vapid.publicKey, config.vapid.privateKey);
  const tick = async () => {
    const rows = db.prepare(`SELECT ps.endpoint, ps.json AS sub, ps.last_sent_day, p.json AS prefs FROM push_subs ps JOIN prefs p ON p.user_id = ps.user_id`).all() as
      { endpoint: string; sub: string; last_sent_day: string | null; prefs: string }[];
    if (!rows.length) return;
    const now = new Date();
    const stories = windowStories(db, config.feedWindowHours).filter(s => !s.removed);
    for (const row of rows) {
      const prefs = JSON.parse(row.prefs) as Prefs & { notifications: { tz?: string } };
      if (!prefs.notifications?.enabled) continue;
      const { hm, day } = localClock(prefs.notifications.tz, now);
      if (hm !== prefs.notifications.time || row.last_sent_day === day) continue;
      const top = stories.find(s => matchesFilters(s, prefs.filters, prefs.places));
      if (!top) continue;
      try {
        await webpush.sendNotification(JSON.parse(row.sub), JSON.stringify({ title: 'The News', body: `${top.cat} · ${top.title}`, url: `/?story=${top.id}` }));
        db.prepare('UPDATE push_subs SET last_sent_day = ? WHERE endpoint = ?').run(day, row.endpoint);
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) db.prepare('DELETE FROM push_subs WHERE endpoint = ?').run(row.endpoint);
        else console.error('[push] send failed', status ?? e);
      }
    }
  };
  const iv = setInterval(() => void tick(), 60_000);
  return () => clearInterval(iv);
}
