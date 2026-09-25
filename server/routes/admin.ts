import { Router } from 'express';
import { z } from 'zod';
import { timingSafeEqual } from 'node:crypto';
import type { DB } from '../db';
import { config } from '../config';
import { HttpError } from '../auth';
import { removeStory, upsertStories } from '../stories';
import { agentReachDoctor, runCycle, sourceHealth } from '../ingest/pipeline';
import { SUMMARY_MAX_WORDS, wordCount } from '../../shared/domain';

const s = z.string().max(4000);
const story = z.object({
  id: z.string().regex(/^[\w-]{1,120}$/), cat: s, topic: s, title: z.string().min(1).max(120),
  summary: z.string().min(1).max(400).refine(v => wordCount(v) <= SUMMARY_MAX_WORDS, `summaries must read in nine seconds: ${SUMMARY_MAX_WORDS} words at most.`),
  more: z.array(z.object({ h: s, p: s })).max(10).optional(), source: s, url: z.string().url(), publishedAt: z.string().datetime(),
  level: z.enum(['global', 'national', 'state', 'city', 'hyper']), type: z.enum(['news', 'breaking', 'explainer', 'local-alert', 'opinion']),
  country: z.string().regex(/^[A-Z]{2}$/).nullish(), region: s.nullish(), city: s.nullish(), area: s.nullish(),
  lat: z.number().nullish(), lon: z.number().nullish(), rank: z.number().int().optional(),
});

/** Ingest endpoint for the editorial pipeline. Disabled unless ADMIN_TOKEN is set. */
export function adminRoutes(db: DB) {
  const r = Router();
  r.use((req, _res, next) => {
    const got = Buffer.from((req.get('authorization') ?? '').replace(/^Bearer\s+/i, ''));
    const want = Buffer.from(config.adminToken);
    if (!config.adminToken || got.length !== want.length || !timingSafeEqual(got, want)) throw new HttpError(401, 'unauthorised.');
    next();
  });
  r.post('/stories', (req, res) => {
    const parsed = z.object({ stories: z.array(story).min(1).max(500) }).safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, 'invalid stories.', { issues: parsed.error.issues.slice(0, 10).map(i => `${i.path.join('.')}: ${i.message}`) });
    upsertStories(db, parsed.data.stories);
    res.json({ upserted: parsed.data.stories.length });
  });
  // Live ingestion: per-feed health (plus agent-reach's own doctor report when installed), and a manual run.
  r.get('/sources', async (_req, res) => {
    res.json({ live: config.news.live, writer: config.news.anthropicKey ? config.news.model : 'extractive', ...sourceHealth(db), agentReach: await agentReachDoctor() });
  });
  r.post('/ingest', async (_req, res) => {
    res.json(await runCycle(db, { force: true }));
  });
  r.delete('/stories/:id', (req, res) => {
    if (!removeStory(db, req.params.id)) throw new HttpError(404, 'story not found.');
    res.json({ removed: req.params.id });
  });
  return r;
}
