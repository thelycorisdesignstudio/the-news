import type { DB } from './db';
import type { Story, StoryMore, Coverage, StoryType } from '../shared/domain';
import { SEED_STORIES } from './seed-data';

interface Row {
  id: string; cat: string; topic: string; title: string; summary: string; more_json: string; source: string; url: string;
  published_at: string; level: string; type: string; country: string | null; region: string | null; city: string | null;
  area: string | null; lat: number | null; lon: number | null; rank: number; removed: number;
}

export function rowToStory(r: Row, withMore = false): Story {
  const s: Story = {
    id: r.id, cat: r.cat, topic: r.topic, title: r.title, summary: r.summary, source: r.source, url: r.url,
    publishedAt: r.published_at, level: r.level as Coverage, type: r.type as StoryType,
    country: r.country, region: r.region, city: r.city, area: r.area, lat: r.lat, lon: r.lon,
  };
  if (r.removed) s.removed = true;
  if (withMore) s.more = JSON.parse(r.more_json) as StoryMore[];
  return s;
}

export interface StoryInput extends Omit<Story, 'more' | 'removed' | 'distanceKm'> {
  more?: StoryMore[];
  rank?: number;
}

export function upsertStories(db: DB, stories: StoryInput[]) {
  const stmt = db.prepare(`INSERT INTO stories (id, cat, topic, title, summary, more_json, source, url, published_at, level, type, country, region, city, area, lat, lon, rank, removed)
    VALUES (@id, @cat, @topic, @title, @summary, @more_json, @source, @url, @published_at, @level, @type, @country, @region, @city, @area, @lat, @lon, @rank, 0)
    ON CONFLICT(id) DO UPDATE SET cat=excluded.cat, topic=excluded.topic, title=excluded.title, summary=excluded.summary, more_json=excluded.more_json,
      source=excluded.source, url=excluded.url, published_at=excluded.published_at, level=excluded.level, type=excluded.type, country=excluded.country,
      region=excluded.region, city=excluded.city, area=excluded.area, lat=excluded.lat, lon=excluded.lon, rank=excluded.rank, removed=0`);
  db.transaction(() => {
    for (const s of stories) {
      stmt.run({
        id: s.id, cat: s.cat, topic: s.topic, title: s.title, summary: s.summary, more_json: JSON.stringify(s.more ?? []),
        source: s.source, url: s.url, published_at: s.publishedAt, level: s.level, type: s.type,
        country: s.country ?? null, region: s.region ?? null, city: s.city ?? null, area: s.area ?? null,
        lat: s.lat ?? null, lon: s.lon ?? null, rank: s.rank ?? 100,
      });
    }
  })();
}

export function removeStory(db: DB, id: string) {
  return db.prepare('UPDATE stories SET removed = 1 WHERE id = ?').run(id).changes > 0;
}

/** Hours of age that cost as much as one editorial rank step: fresh stories rise, yesterday's sink. */
const AGE_WEIGHT = 3;
/** Breaking news leads the queue while it's still breaking. */
const BREAKING_HOURS = 6;

/**
 * Stories inside the daily window, in editorial order: fresh breaking news first, then by rank with age
 * pulling older stories down, so a live feed of hundreds of stories still opens on what matters now.
 */
export function windowStories(db: DB, windowHours: number, now = Date.now()): Story[] {
  const since = new Date(now - windowHours * 3600_000).toISOString();
  const rows = db.prepare('SELECT * FROM stories WHERE published_at >= ?').all(since) as Row[];
  const score = (r: Row) => {
    const hours = Math.max(0, (now - Date.parse(r.published_at)) / 3600_000);
    const breaking = r.type === 'breaking' && hours < BREAKING_HOURS;
    return (breaking ? -1000 : 0) + r.rank + hours * AGE_WEIGHT;
  };
  return rows
    .map(r => ({ r, k: score(r) }))
    .sort((a, b) => a.k - b.k || b.r.published_at.localeCompare(a.r.published_at))
    .map(({ r }) => rowToStory(r));
}

/**
 * Keeps the database to what readers can still reach: stories older than `days` go unless someone saved
 * them or has them in their reading history. Ingest bookkeeping older than that goes too.
 */
export function pruneStories(db: DB, days: number, now = Date.now()) {
  const before = new Date(now - days * 86400_000).toISOString();
  return db.prepare(`DELETE FROM stories WHERE published_at < ?
    AND id NOT IN (SELECT story_id FROM saves) AND id NOT IN (SELECT story_id FROM history)`).run(before).changes;
}

export function getStory(db: DB, id: string): Story | null {
  const r = db.prepare('SELECT * FROM stories WHERE id = ?').get(id) as Row | undefined;
  return r ? rowToStory(r, true) : null;
}

export function getStories(db: DB, ids: string[]): Map<string, Story> {
  if (!ids.length) return new Map();
  const rows = db.prepare(`SELECT * FROM stories WHERE id IN (${ids.map(() => '?').join(',')})`).all(...ids) as Row[];
  return new Map(rows.map(r => [r.id, rowToStory(r)]));
}

/** Re-stamps the bundled demo stories so the queue always has "today's" content in development. */
export function seedDemoStories(db: DB, now = Date.now()) {
  upsertStories(db, SEED_STORIES.map(({ minutesAgo, rank, url, ...s }) => ({
    ...s,
    rank,
    url: url ?? `https://example.com/stories/${s.id}`,
    publishedAt: new Date(now - minutesAgo * 60_000).toISOString(),
  })));
}
