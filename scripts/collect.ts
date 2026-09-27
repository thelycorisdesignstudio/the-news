/**
 * Collects the latest items from every news source and writes them in the push format
 * ({ batches: [{ source, items }] }). Runs anywhere with open internet, notably the scheduled GitHub
 * Actions job (.github/workflows/collect-news.yml), which also pushes each batch into the app when
 * APP_ORIGIN and ADMIN_TOKEN are set, so a server behind a restrictive network still gets live news.
 *
 * Usage: node --import tsx scripts/collect.ts [out.json]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { allSources } from '../server/ingest/pipeline';
import { httpGet } from '../server/ingest/reader';
import { parseFeed, stripOutletSuffix, type FeedItem } from '../server/ingest/rss';
import { exaSearch } from '../server/ingest/exa';
import type { Source } from '../server/ingest/sources';

const WINDOW_HOURS = 36;
const out = process.argv[2] ?? 'data/live/latest.json';
const since = new Date(Date.now() - WINDOW_HOURS * 3600_000).toISOString();

interface Batch { source: { name: string; level: Source['level']; country?: string; city?: string; region?: string; beat?: string }; items: FeedItem[] }
const batches: Batch[] = [];
const health: { id: string; ok: boolean; items: number; error?: string }[] = [];

async function collect(src: Source) {
  try {
    const raw = src.kind === 'exa' ? await exaSearch(src.query ?? '', since) : parseFeed((await httpGet(src.url, { timeoutMs: 20_000 })).body);
    const items = raw
      .filter(i => !i.publishedAt || (i.publishedAt >= since && Date.parse(i.publishedAt) <= Date.now() + 3600_000))
      .map(i => ({ ...i, title: stripOutletSuffix(i.title, i.outlet).slice(0, 300), outlet: i.outlet?.slice(0, 80) }))
      .slice(0, 200);
    if (items.length) batches.push({ source: { name: src.name, level: src.level, country: src.country, city: src.city, region: src.region, beat: src.beat }, items });
    health.push({ id: src.id, ok: true, items: items.length });
  } catch (e) {
    health.push({ id: src.id, ok: false, items: 0, error: e instanceof Error ? e.message : String(e) });
  }
}

const sources = allSources();
let next = 0;
await Promise.all(Array.from({ length: 8 }, async () => { while (next < sources.length) await collect(sources[next++]); }));

const report = {
  collectedAt: new Date().toISOString(),
  windowHours: WINDOW_HOURS,
  sources: sources.length,
  ok: health.filter(h => h.ok).length,
  items: batches.reduce((n, b) => n + b.items.length, 0),
  failed: health.filter(h => !h.ok).map(({ id, error }) => ({ id, error })),
  batches,
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(report, null, 1));
console.log(`collected ${report.items} items from ${report.ok}/${report.sources} sources → ${out}`);
for (const f of report.failed) console.log(`  failed ${f.id}: ${f.error}`);

// Straight into a running app, when it's configured.
const origin = process.env.APP_ORIGIN?.replace(/\/$/, '');
const token = process.env.ADMIN_TOKEN;
if (origin && token) {
  let published = 0, merged = 0;
  for (const b of batches) {
    try {
      const res = await fetch(`${origin}/api/admin/ingest/items`, {
        method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(b),
        signal: AbortSignal.timeout(120_000),
      });
      const r = await res.json() as { published?: string[]; merged?: number; error?: string };
      if (!res.ok) { console.log(`  push ${b.source.name}: HTTP ${res.status} ${r.error ?? ''}`); continue; }
      published += r.published?.length ?? 0; merged += r.merged ?? 0;
    } catch (e) {
      console.log(`  push ${b.source.name}: ${e instanceof Error ? e.message : e}`);
    }
  }
  console.log(`pushed to ${origin}: ${published} published, ${merged} merged`);
}
