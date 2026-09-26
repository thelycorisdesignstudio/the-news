import { Router } from 'express';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { DB } from '../db';
import { config } from '../config';
import { HttpError, requireUser } from '../auth';
import { getStories, getStory, windowStories } from '../stories';
import { reverseGeocode, searchPlaces } from '../geo';
import { matchesFilters, nearestPlace, type Filters, type Place, type Prefs, type Story } from '../../shared/domain';
import { pushPublicKey } from '../push';
import { newsEvents } from '../ingest/pipeline';

const str = z.string().max(120);
const placeSchema = z.object({
  id: str, kind: z.enum(['home', 'work', 'current', 'other']), label: str, area: str, city: str, region: str, country: str,
  lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180), radiusKm: z.number().min(0.5).max(50),
});
const filtersSchema = z.object({
  cov: z.array(str).max(10), cty: z.array(str).max(250), plc: z.array(str).max(100), top: z.array(str).max(50), typ: z.array(str).max(10),
});
export const prefsSchema = z.object({
  topics: z.array(str).max(50),
  countries: z.array(z.string().regex(/^[A-Z]{2}$/)).max(250),
  coverage: z.array(z.enum(['global', 'national', 'state', 'city', 'hyper'])).max(5),
  radiusKm: z.number().min(0.5).max(50),
  places: z.array(placeSchema).max(20),
  followTravel: z.boolean(),
  filters: filtersSchema,
  notifications: z.object({ enabled: z.boolean(), time: z.string().regex(/^\d{2}:\d{2}$/), tz: z.string().max(64).optional() }),
  paceMs: z.number().min(0).max(600_000).nullable(),
  theme: z.enum(['system', 'light', 'dark']),
  textSize: z.enum(['sm', 'md', 'lg']).default('md'),
  defaultView: z.enum(['swipe', 'list']).default('swipe'),
  haptics: z.boolean().default(true),
  reduceMotion: z.boolean().default(false),
  mutedSources: z.array(str).max(200).default([]),
  onboarded: z.boolean(),
  updatedAt: z.number(),
});

const feedQuery = z.object({
  filters: filtersSchema,
  places: z.array(placeSchema).max(20).default([]),
  /** Story ids already in the reader's queue: removed ones come back as tombstones instead of vanishing. */
  keep: z.array(str).max(200).default([]),
});

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const r = schema.safeParse(body);
  if (!r.success) throw new HttpError(400, 'invalid request.', { issues: r.error.issues.slice(0, 5).map(i => `${i.path.join('.')}: ${i.message}`) });
  return r.data;
}

function feedFor(db: DB, filters: Filters, places: Place[], keep: string[] = [], max = config.feedMax): Story[] {
  const keepSet = new Set(keep);
  const out: Story[] = [];
  let fresh = 0;
  for (const s of windowStories(db, config.feedWindowHours)) {
    if (s.removed) {
      if (keepSet.has(s.id)) out.push({ ...s, summary: '', title: '', removed: true });
      continue;
    }
    const near = s.level === 'hyper' ? nearestPlace(s, places) : null;
    const story = near ? { ...s, distanceKm: Math.round(near.km * 10) / 10 } : s;
    if (!matchesFilters(story, filters, places)) continue;
    // The queue is capped, but stories already in the reader's queue always come back.
    if (fresh >= max && !keepSet.has(s.id)) continue;
    if (!keepSet.has(s.id)) fresh++;
    out.push(story);
  }
  return out;
}

const MAX_STREAMS_PER_IP = 6;
const streams = new Map<string, number>();

export function dataRoutes(db: DB) {
  const r = Router();

  // ---- feed (public: signed-out readers get the same feed from their local preferences) ----
  r.post('/feed', (req, res) => {
    const q = parse(feedQuery, req.body);
    res.json({ stories: feedFor(db, q.filters, q.places, q.keep), generatedAt: new Date().toISOString() });
  });

  r.post('/feed/count', (req, res) => {
    const q = parse(feedQuery, req.body);
    res.json({ count: feedFor(db, q.filters, q.places).length });
  });

  // Live updates: a server-sent event whenever new stories land, so open feeds can pull them in.
  r.get('/stream', (req, res) => {
    // A handful of open tabs per address is normal; more is a leak or abuse.
    const ip = req.ip ?? 'unknown';
    const open = streams.get(ip) ?? 0;
    if (open >= MAX_STREAMS_PER_IP) throw new HttpError(429, 'too many open connections.');
    streams.set(ip, open + 1);
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.flushHeaders();
    res.write('retry: 15000\n\n');
    const send = (e: { added: number; ids: string[]; at: string }) => { res.write(`event: stories\ndata: ${JSON.stringify(e)}\n\n`); };
    newsEvents.on('stories', send);
    const beat = setInterval(() => res.write(': ping\n\n'), 25_000);
    req.on('close', () => {
      clearInterval(beat);
      newsEvents.off('stories', send);
      const n = (streams.get(ip) ?? 1) - 1;
      if (n > 0) streams.set(ip, n); else streams.delete(ip);
    });
  });

  // ---- feedback (signed in or not; a few a day per device is plenty) ----
  r.post('/feedback', (req, res) => {
    const body = parse(z.object({
      rating: z.number().int().min(1).max(5).nullish(),
      message: z.string().trim().max(2000).default(''),
      context: z.string().max(60).optional(),
    }).refine(b => b.rating || b.message, 'tell us something, or pick a rating.'), req.body);
    const client = createHash('sha256').update(`${req.ip}|${req.get('user-agent') ?? ''}`).digest('hex');
    const recent = db.prepare('SELECT COUNT(*) n FROM feedback WHERE client_hash = ? AND created_at > ?').get(client, Date.now() - 3600_000) as { n: number };
    if (recent.n >= 10) throw new HttpError(429, 'thanks! that is plenty for now. try again later.');
    db.prepare('INSERT INTO feedback (user_id, rating, message, context, client_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(req.user?.id ?? null, body.rating ?? null, body.message, body.context ?? null, client, Date.now());
    res.status(201).json({ ok: true });
  });

  r.get('/stories/:id', (req, res) => {
    const s = getStory(db, req.params.id);
    if (!s) throw new HttpError(404, 'story not found.', { code: 'not_found' });
    if (s.removed) throw new HttpError(410, 'this story is no longer available.', { code: 'removed' });
    res.json({ story: s });
  });

  // ---- places ----
  r.get('/geo/search', async (req, res) => {
    const q = String(req.query.q ?? '').slice(0, 80);
    const country = typeof req.query.country === 'string' && /^[A-Z]{2}$/.test(req.query.country) ? req.query.country : undefined;
    res.json({ places: await searchPlaces(q, country) });
  });

  r.get('/geo/reverse', async (req, res) => {
    const lat = Number(req.query.lat), lon = Number(req.query.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new HttpError(400, 'invalid coordinates.');
    res.json({ place: await reverseGeocode(lat, lon) });
  });

  // ---- preferences (last write wins, by client timestamp) ----
  r.get('/prefs', requireUser, (req, res) => {
    const row = db.prepare('SELECT json FROM prefs WHERE user_id = ?').get(req.user!.id) as { json: string } | undefined;
    res.json({ prefs: row ? (JSON.parse(row.json) as Prefs) : null });
  });

  r.put('/prefs', requireUser, (req, res) => {
    const p = parse(prefsSchema, req.body?.prefs);
    const row = db.prepare('SELECT json, updated_at FROM prefs WHERE user_id = ?').get(req.user!.id) as { json: string; updated_at: number } | undefined;
    if (row && row.updated_at > p.updatedAt) return res.json({ prefs: JSON.parse(row.json) as Prefs });
    db.prepare(`INSERT INTO prefs (user_id, json, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at`).run(req.user!.id, JSON.stringify(p), p.updatedAt);
    res.json({ prefs: p });
  });

  // ---- library: saved, liked, reading history ----
  function library(userId: string) {
    const saved = db.prepare('SELECT story_id, created_at FROM saves WHERE user_id = ? ORDER BY created_at DESC').all(userId) as { story_id: string; created_at: number }[];
    const liked = db.prepare('SELECT story_id FROM likes WHERE user_id = ?').all(userId) as { story_id: string }[];
    const hist = db.prepare('SELECT story_id, read_at FROM history WHERE user_id = ? ORDER BY read_at DESC LIMIT 200').all(userId) as { story_id: string; read_at: number }[];
    const stories = getStories(db, [...new Set([...saved.map(s => s.story_id), ...hist.map(h => h.story_id)])]);
    return {
      saved: saved.filter(s => stories.has(s.story_id)).map(s => ({ story: stories.get(s.story_id)!, at: s.created_at })),
      liked: liked.map(l => l.story_id),
      history: hist.filter(h => stories.has(h.story_id)).map(h => ({ story: stories.get(h.story_id)!, at: h.read_at })),
    };
  }

  r.get('/library', requireUser, (req, res) => {
    res.json(library(req.user!.id));
  });

  const idParam = (id: string | string[]) => {
    const v = Array.isArray(id) ? id[0] : id;
    if (!/^[\w-]{1,120}$/.test(v)) throw new HttpError(400, 'invalid story id.');
    return v;
  };

  for (const table of ['saves', 'likes'] as const) {
    const path = table === 'saves' ? '/saved/:id' : '/liked/:id';
    r.put(path, requireUser, (req, res) => {
      db.prepare(`INSERT OR IGNORE INTO ${table} (user_id, story_id, created_at) VALUES (?, ?, ?)`).run(req.user!.id, idParam(req.params.id), Date.now());
      res.json({ ok: true });
    });
    r.delete(path, requireUser, (req, res) => {
      db.prepare(`DELETE FROM ${table} WHERE user_id = ? AND story_id = ?`).run(req.user!.id, idParam(req.params.id));
      res.json({ ok: true });
    });
  }

  r.post('/history', requireUser, (req, res) => {
    const { ids } = parse(z.object({ ids: z.array(str).max(100) }), req.body);
    const stmt = db.prepare(`INSERT INTO history (user_id, story_id, read_at) VALUES (?, ?, ?)
      ON CONFLICT(user_id, story_id) DO UPDATE SET read_at = excluded.read_at`);
    const now = Date.now();
    db.transaction(() => ids.forEach(id => stmt.run(req.user!.id, id, now)))();
    res.json({ ok: true });
  });

  r.delete('/history', requireUser, (req, res) => {
    db.prepare('DELETE FROM history WHERE user_id = ?').run(req.user!.id);
    res.json({ ok: true });
  });

  /** Folds whatever a reader saved while signed out into their account. */
  r.post('/library/merge', requireUser, (req, res) => {
    const body = parse(z.object({
      saved: z.array(z.object({ id: str, at: z.number() })).max(500).default([]),
      liked: z.array(str).max(500).default([]),
      history: z.array(z.object({ id: str, at: z.number() })).max(500).default([]),
    }), req.body);
    const uid = req.user!.id;
    db.transaction(() => {
      const s = db.prepare('INSERT OR IGNORE INTO saves (user_id, story_id, created_at) VALUES (?, ?, ?)');
      body.saved.forEach(x => s.run(uid, x.id, x.at));
      const l = db.prepare('INSERT OR IGNORE INTO likes (user_id, story_id, created_at) VALUES (?, ?, ?)');
      body.liked.forEach(id => l.run(uid, id, Date.now()));
      const h = db.prepare(`INSERT INTO history (user_id, story_id, read_at) VALUES (?, ?, ?)
        ON CONFLICT(user_id, story_id) DO UPDATE SET read_at = MAX(read_at, excluded.read_at)`);
      body.history.forEach(x => h.run(uid, x.id, x.at));
    })();
    res.json(library(uid));
  });

  // ---- push notifications ----
  r.get('/push/key', (_req, res) => {
    res.json({ publicKey: pushPublicKey() });
  });

  r.post('/push/subscribe', requireUser, (req, res) => {
    const sub = parse(z.object({ endpoint: z.string().url().max(1000), keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(200) }) }), req.body?.subscription);
    db.prepare(`INSERT INTO push_subs (endpoint, user_id, json) VALUES (?, ?, ?)
      ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, json = excluded.json`).run(sub.endpoint, req.user!.id, JSON.stringify(sub));
    res.json({ ok: true });
  });

  r.post('/push/unsubscribe', requireUser, (req, res) => {
    db.prepare('DELETE FROM push_subs WHERE user_id = ?').run(req.user!.id);
    res.json({ ok: true });
  });

  return r;
}
