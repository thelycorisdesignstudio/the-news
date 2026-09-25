import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { execFile } from 'node:child_process';
import type { DB } from '../db';
import { config } from '../config';
import { upsertStories } from '../stories';
import { wordCount } from '../../shared/domain';
import { SOURCES, extraSources, type Source } from './sources';
import { normalizeUrl, parseFeed, similarity, stripOutletSuffix, titleKey, type FeedItem } from './rss';
import { httpGet, readArticle, type FetchResult } from './reader';
import { writeUp, type Candidate, type Draft } from './summarize';

/** Fires `stories` with { added, ids, at } whenever a cycle publishes new cards. The SSE stream listens. */
export const newsEvents = new EventEmitter();
newsEvents.setMaxListeners(0);

export interface IngestDeps {
  sources?: Source[];
  fetchFeed?: (url: string, etag?: string | null, lastModified?: string | null) => Promise<FetchResult>;
  read?: (url: string) => Promise<string | null>;
  write?: (c: Candidate) => Promise<Draft | null>;
  now?: () => number;
  /** Poll every feed now, ignoring intervals and backoff (the admin "ingest now" button). */
  force?: boolean;
}

export interface CycleReport {
  fetched: number;
  notModified: number;
  failed: { source: string; error: string }[];
  discovered: number;
  published: string[];
  merged: number;
  skipped: number;
}

/** Same story from this many outlets inside the breaking window reads as breaking news. */
const BREAKING_SOURCES = 3;
const BREAKING_WINDOW_MS = 3 * 3600_000;
const SAME_STORY = 0.55;
const MAX_ATTEMPTS = 3;

const sha = (s: string) => createHash('sha256').update(s).digest('hex');

export function allSources(): Source[] {
  return [...SOURCES, ...extraSources(config.news.extraFeeds)];
}

async function pool<T>(items: T[], n: number, fn: (t: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) await fn(items[i++]);
  }));
}

interface FeedStateRow { source_id: string; etag: string | null; last_modified: string | null; last_fetch_at: number | null; failures: number }
interface PendingRow { url_hash: string; source_id: string; title_key: string; attempts: number; payload: string; published_at: string | null }

/** A feed is due after its interval, backing off exponentially (up to 32×) while it keeps failing. */
export function isDue(src: Source, st: FeedStateRow | undefined, now: number) {
  if (!st?.last_fetch_at) return true;
  const backoff = 2 ** Math.min(st.failures, 5);
  return now - st.last_fetch_at >= src.everyMin * 60_000 * backoff;
}

/**
 * One ingestion cycle: poll the feeds that are due, queue unseen articles, fold duplicates of a story
 * already on the wire into that story, and write up the newest pending ones.
 */
export async function runCycle(db: DB, deps: IngestDeps = {}): Promise<CycleReport> {
  const now = deps.now ?? Date.now;
  const sources = deps.sources ?? allSources();
  const fetchFeed = deps.fetchFeed ?? ((url, etag, lm) => httpGet(url, { etag, lastModified: lm }));
  const read = deps.read ?? readArticle;
  const write = deps.write ?? writeUp;
  const byId = new Map(sources.map(s => [s.id, s]));
  const report: CycleReport = { fetched: 0, notModified: 0, failed: [], discovered: 0, published: [], merged: 0, skipped: 0 };
  const windowStart = now() - config.feedWindowHours * 3600_000;

  // 1. Poll due feeds.
  const states = new Map((db.prepare('SELECT * FROM feed_state').all() as FeedStateRow[]).map(r => [r.source_id, r]));
  const due = deps.force ? sources : sources.filter(s => isDue(s, states.get(s.id), now()));
  const insertItem = db.prepare(`INSERT OR IGNORE INTO ingest_items (url_hash, source_id, title_key, status, payload, published_at, seen_at)
    VALUES (?, ?, ?, 'pending', ?, ?, ?)`);
  await pool(due, 6, async src => {
    const st = states.get(src.id);
    try {
      const res = await fetchFeed(src.url, st?.etag, st?.last_modified);
      if (res.status === 304) {
        report.notModified++;
        saveState(db, src.id, { ok: true, now: now(), etag: st?.etag, lastModified: st?.last_modified, items: 0 });
        return;
      }
      const items = parseFeed(res.body);
      report.fetched++;
      let fresh = 0;
      db.transaction(() => {
        for (const it of items) {
          const at = it.publishedAt ? Date.parse(it.publishedAt) : now();
          if (at < windowStart || at > now() + 3600_000) continue;
          const payload: FeedItem = { ...it, title: stripOutletSuffix(it.title, it.outlet) };
          const r = insertItem.run(sha(normalizeUrl(it.url)), src.id, titleKey(payload.title), JSON.stringify(payload), new Date(at).toISOString(), now());
          fresh += r.changes;
        }
      })();
      report.discovered += fresh;
      saveState(db, src.id, { ok: true, now: now(), etag: res.etag, lastModified: res.lastModified, items: fresh });
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      report.failed.push({ source: src.id, error });
      saveState(db, src.id, { ok: false, now: now(), error, etag: st?.etag, lastModified: st?.last_modified, items: 0 });
    }
  });

  // 2. Take the newest pending articles, oldest attempts first.
  const pending = db.prepare(`SELECT url_hash, source_id, title_key, attempts, payload, published_at FROM ingest_items
    WHERE status = 'pending' AND published_at >= ? ORDER BY published_at DESC LIMIT ?`)
    .all(new Date(windowStart).toISOString(), config.news.maxPerCycle * 3) as PendingRow[];
  // Everything that slid out of the window without being written up is dropped.
  db.prepare(`UPDATE ingest_items SET status = 'expired', payload = NULL WHERE status = 'pending' AND published_at < ?`).run(new Date(windowStart).toISOString());

  const recent = db.prepare(`SELECT i.title_key, i.story_id FROM ingest_items i WHERE i.status = 'published' AND i.seen_at >= ?`)
    .all(windowStart) as { title_key: string; story_id: string }[];
  const setStatus = db.prepare(`UPDATE ingest_items SET status = ?, story_id = ?, payload = CASE WHEN ? = 'pending' THEN payload ELSE NULL END, attempts = ? WHERE url_hash = ?`);

  const toWrite: PendingRow[] = [];
  // Copies of a story that is being written up in this same cycle; they're folded in once it's published.
  const followers = new Map<string, PendingRow[]>();
  for (const row of pending) {
    const onWire = recent.find(r => similarity(r.title_key, row.title_key) >= SAME_STORY);
    if (onWire) {
      // Another outlet on a story already published: count it, don't write it twice.
      corroborate(db, onWire.story_id, now());
      setStatus.run('merged', onWire.story_id, 'merged', row.attempts, row.url_hash);
      report.merged++;
      continue;
    }
    const lead = toWrite.find(w => similarity(w.title_key, row.title_key) >= SAME_STORY);
    if (lead) {
      followers.set(lead.url_hash, [...(followers.get(lead.url_hash) ?? []), row]);
      continue;
    }
    if (toWrite.length < config.news.maxPerCycle) toWrite.push(row);
  }

  // 3. Read and write up.
  await pool(toWrite, 3, async row => {
    const src = byId.get(row.source_id);
    const it = JSON.parse(row.payload) as FeedItem;
    if (!src) { setStatus.run('skipped', null, 'skipped', row.attempts, row.url_hash); return; }
    try {
      const article = wordCount(it.excerpt) < 60 ? await read(it.url) : null;
      const draft = await write({ source: src, outlet: it.outlet || src.name, title: it.title, url: it.url, excerpt: it.excerpt, article });
      if (!draft) {
        setStatus.run('skipped', null, 'skipped', row.attempts + 1, row.url_hash);
        for (const f of followers.get(row.url_hash) ?? []) setStatus.run('skipped', null, 'skipped', f.attempts, f.url_hash);
        report.skipped++;
        return;
      }
      const id = `n-${row.url_hash.slice(0, 16)}`;
      upsertStories(db, [{
        id, cat: draft.topic, topic: draft.topic, title: draft.title, summary: draft.summary, more: draft.more,
        source: it.outlet || src.name, url: it.url, publishedAt: row.published_at ?? new Date(now()).toISOString(),
        level: draft.level, type: draft.type, country: draft.country, region: draft.region, city: draft.city,
        area: null, lat: null, lon: null, rank: rankFor(draft.importance),
      }]);
      db.prepare('UPDATE stories SET ingested_at = ? WHERE id = ?').run(now(), id);
      setStatus.run('published', id, 'published', row.attempts + 1, row.url_hash);
      recent.push({ title_key: row.title_key, story_id: id });
      report.published.push(id);
      for (const f of followers.get(row.url_hash) ?? []) {
        corroborate(db, id, now());
        setStatus.run('merged', id, 'merged', f.attempts, f.url_hash);
        report.merged++;
      }
    } catch (e) {
      const attempts = row.attempts + 1;
      setStatus.run(attempts >= MAX_ATTEMPTS ? 'failed' : 'pending', null, attempts >= MAX_ATTEMPTS ? 'failed' : 'pending', attempts, row.url_hash);
      report.failed.push({ source: row.source_id, error: `write-up: ${e instanceof Error ? e.message : String(e)}` });
    }
  });

  // Housekeeping: a week of item history is plenty to dedupe against.
  db.prepare('DELETE FROM ingest_items WHERE seen_at < ?').run(now() - 7 * 86400_000);

  if (report.published.length) newsEvents.emit('stories', { added: report.published.length, ids: report.published, at: new Date(now()).toISOString() });
  return report;
}

/** Importance 10 → rank 20, importance 1 → rank 92. Editorial and seed stories use the same scale. */
export const rankFor = (importance: number) => 100 - Math.round(Math.min(10, Math.max(1, importance)) * 8);

/** Another outlet carried the story: move it up, and promote it to breaking when the wire lights up. */
function corroborate(db: DB, storyId: string, now: number) {
  const s = db.prepare('SELECT sources, rank, published_at, type FROM stories WHERE id = ?').get(storyId) as { sources: number; rank: number; published_at: string; type: string } | undefined;
  if (!s) return;
  const sources = s.sources + 1;
  const fresh = now - Date.parse(s.published_at) <= BREAKING_WINDOW_MS;
  const type = fresh && sources >= BREAKING_SOURCES && s.type === 'news' ? 'breaking' : s.type;
  db.prepare('UPDATE stories SET sources = ?, rank = ?, type = ? WHERE id = ?').run(sources, Math.max(1, s.rank - 4), type, storyId);
  if (type !== s.type) newsEvents.emit('stories', { added: 0, ids: [storyId], at: new Date(now).toISOString() });
}

function saveState(db: DB, id: string, s: { ok: boolean; now: number; etag?: string | null; lastModified?: string | null; error?: string; items: number }) {
  db.prepare(`INSERT INTO feed_state (source_id, etag, last_modified, last_fetch_at, last_ok_at, last_error, failures, items)
    VALUES (@id, @etag, @lm, @now, @ok_at, @err, @fail, @items)
    ON CONFLICT(source_id) DO UPDATE SET etag = @etag, last_modified = @lm, last_fetch_at = @now,
      last_ok_at = COALESCE(@ok_at, last_ok_at), last_error = @err,
      failures = CASE WHEN @fail = 0 THEN 0 ELSE failures + 1 END, items = items + @items`)
    .run({ id, etag: s.etag ?? null, lm: s.lastModified ?? null, now: s.now, ok_at: s.ok ? s.now : null, err: s.error ?? null, fail: s.ok ? 0 : 1, items: s.items });
}

/** Per-feed health for the admin endpoint. */
export function sourceHealth(db: DB) {
  const states = new Map((db.prepare('SELECT * FROM feed_state').all() as (FeedStateRow & { last_ok_at: number | null; last_error: string | null; items: number })[]).map(r => [r.source_id, r]));
  const counts = db.prepare(`SELECT status, COUNT(*) n FROM ingest_items GROUP BY status`).all() as { status: string; n: number }[];
  return {
    items: Object.fromEntries(counts.map(c => [c.status, c.n])),
    sources: allSources().map(s => {
      const st = states.get(s.id);
      return {
        id: s.id, name: s.name, url: s.url, everyMin: s.everyMin,
        lastFetchAt: st?.last_fetch_at ?? null, lastOkAt: st?.last_ok_at ?? null, lastError: st?.last_error ?? null,
        failures: st?.failures ?? 0, items: st?.items ?? 0,
        status: !st ? 'waiting' : st.failures ? 'failing' : 'ok',
      };
    }),
  };
}

/** `agent-reach doctor --json`, when the CLI is installed and AGENT_REACH_BIN points at it. */
export function agentReachDoctor(): Promise<unknown> {
  const bin = config.news.agentReachBin;
  if (!bin) return Promise.resolve(null);
  return new Promise(resolve => {
    execFile(bin, ['doctor', '--json'], { timeout: 20_000 }, (err, stdout) => {
      if (err) return resolve({ error: err.message });
      try { resolve(JSON.parse(stdout)); } catch { resolve({ error: 'unreadable doctor output' }); }
    });
  });
}

/** Runs a cycle now and then every minute; each feed is only polled when its own interval is up. */
export function startIngest(db: DB, log = console): () => void {
  let running = false;
  let stopped = false;
  const tick = async () => {
    if (running || stopped) return;
    running = true;
    try {
      const r = await runCycle(db);
      if (r.published.length || r.failed.length || r.merged) {
        log.log(`[ingest] ${r.published.length} new, ${r.merged} merged, ${r.skipped} skipped, ${r.fetched} feeds read, ${r.notModified} unchanged, ${r.failed.length} failures`);
        for (const f of r.failed.slice(0, 5)) log.warn(`[ingest]   ${f.source}: ${f.error}`);
      }
    } catch (e) {
      log.error('[ingest] cycle failed', e);
    } finally {
      running = false;
    }
  };
  void tick();
  const timer = setInterval(tick, 60_000);
  timer.unref();
  return () => { stopped = true; clearInterval(timer); };
}
