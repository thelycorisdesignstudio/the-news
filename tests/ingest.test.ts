import { describe, expect, it, beforeEach } from 'vitest';
import { openDb, type DB } from '../server/db';
import { windowStories, getStory } from '../server/stories';
import { parseFeed, normalizeUrl, titleKey, similarity, toText } from '../server/ingest/rss';
import { cleanMarkdown } from '../server/ingest/reader';
import { runCycle, newsEvents, isDue, rankFor } from '../server/ingest/pipeline';
import { extractive, fitWords, clampTitle, finalise, TITLE_MAX, type Candidate, type Draft } from '../server/ingest/summarize';
import type { Source } from '../server/ingest/sources';
import { SUMMARY_MAX_WORDS, wordCount } from '../shared/domain';

const now = Date.parse('2026-09-24T12:00:00Z');
const ago = (m: number) => new Date(now - m * 60_000).toUTCString();

const RSS = (items: { t: string; l: string; d?: string; m: number; src?: string }[]) => `<?xml version="1.0"?>
<rss version="2.0"><channel><title>Feed</title>
${items.map(i => `<item><title><![CDATA[${i.t}]]></title><link>${i.l}</link><description><![CDATA[${i.d ?? ''}]]></description><pubDate>${ago(i.m)}</pubDate>${i.src ? `<source url="https://x">${i.src}</source>` : ''}</item>`).join('\n')}
</channel></rss>`;

const ATOM = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"><title>Verge</title>
<entry><title type="html">Apple &amp; Google ship on-device AI models</title>
<link rel="alternate" type="text/html" href="https://www.theverge.com/2026/9/24/apple-google-ai"/>
<published>2026-09-24T11:00:00Z</published><summary type="html">&lt;p&gt;Both companies now run models locally.&lt;/p&gt;</summary></entry>
</feed>`;

const src = (id: string, extra: Partial<Source> = {}): Source => ({ id, name: id.toUpperCase(), url: `https://${id}.test/feed`, level: 'global', everyMin: 5, ...extra });

const LONG = 'Nvidia said on Wednesday that its quarterly revenue from data centre chips rose 60 percent to a record, beating analyst forecasts as cloud companies kept buying accelerators for AI training. Shares rose 4 percent after hours. The company guided higher for next quarter.';

describe('feed parsing', () => {
  it('reads RSS 2.0 with CDATA, entities and aggregator sources', () => {
    const items = parseFeed(RSS([{ t: 'OpenAI &amp; Microsoft sign deal - Reuters', l: 'https://news.google.com/a?utm_source=x', d: '<p>Big <b>deal</b></p>', m: 5, src: 'Reuters' }]));
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('OpenAI & Microsoft sign deal - Reuters');
    expect(items[0].excerpt).toBe('Big deal');
    expect(items[0].outlet).toBe('Reuters');
    expect(items[0].publishedAt).toBe(new Date(Math.floor((now - 5 * 60_000) / 1000) * 1000).toISOString());
  });

  it('reads Atom', () => {
    const [it0] = parseFeed(ATOM);
    expect(it0.title).toBe('Apple & Google ship on-device AI models');
    expect(it0.url).toBe('https://www.theverge.com/2026/9/24/apple-google-ai');
    expect(it0.excerpt).toBe('Both companies now run models locally.');
  });

  it('rejects things that are not feeds, and drops items without links', () => {
    expect(() => parseFeed('<html><body>nope</body></html>')).toThrow();
    expect(parseFeed(RSS([{ t: 'No link', l: 'javascript:alert(1)', m: 1 }]))).toEqual([]);
  });

  it('strips WordPress trailers from excerpts', () => {
    expect(toText('<p>Robots are here.</p><p>The post Robots arrive appeared first on The Robot Report.</p>')).toBe('Robots are here.');
  });
});

describe('dedupe helpers', () => {
  it('normalises URLs across tracking params and www', () => {
    expect(normalizeUrl('https://www.techcrunch.com/a/b/?utm_source=rss&id=2#x')).toBe(normalizeUrl('https://techcrunch.com/a/b?id=2'));
  });
  it('matches the same story across outlets and not different ones', () => {
    const a = titleKey('Nvidia revenue jumps 60% on AI chip demand');
    const b = titleKey('Nvidia revenue jumps 60% as AI chip demand soars - CNBC');
    const c = titleKey('SpaceX launches Starship on seventh test flight');
    expect(similarity(a, b)).toBeGreaterThanOrEqual(0.55);
    expect(similarity(a, c)).toBeLessThan(0.2);
  });
  it('cleans Jina Reader markdown', () => {
    const md = 'Title: X\nURL Source: https://x\n\nMarkdown Content:\n![img](a.png)\nSubscribe to our newsletter for more updates every single week now\nThe chipmaker reported [record revenue](https://x) of forty billion dollars in the quarter ending July.\nShort line';
    expect(cleanMarkdown(md)).toBe('The chipmaker reported record revenue of forty billion dollars in the quarter ending July.');
  });
});

describe('write-up contracts', () => {
  it('fits summaries to nine seconds on sentence boundaries', () => {
    const s = fitWords(LONG + ' ' + LONG, SUMMARY_MAX_WORDS);
    expect(wordCount(s)).toBeLessThanOrEqual(SUMMARY_MAX_WORDS);
    expect(s.endsWith('.')).toBe(true);
    expect(wordCount(fitWords('word '.repeat(80), 45))).toBe(45);
  });
  it('clamps titles', () => {
    const t = clampTitle('A very long headline '.repeat(10));
    expect(t.length).toBeLessThanOrEqual(TITLE_MAX);
    expect(clampTitle('Ends with a stop.')).toBe('Ends with a stop');
  });
  it('drops non-tech stories in the extractive fallback and classifies tech ones', () => {
    const c = (title: string, excerpt: string, s = src('x')): Candidate => ({ source: s, outlet: 'X', title, url: 'https://x/1', excerpt, article: null });
    expect(extractive(c('Liverpool beat Chelsea 3-1 at Anfield', 'A thrilling game at Anfield saw goals from three different players in the second half of the match.'))).toBeNull();
    const d = extractive(c('Nvidia revenue jumps 60% on AI chip demand', LONG))!;
    expect(d.topic).toBe('AI Hardware');
    expect(wordCount(d.summary)).toBeLessThanOrEqual(SUMMARY_MAX_WORDS);
    const city = src('toi', { level: 'city', country: 'IN', city: 'Bengaluru', region: 'Karnataka' });
    const local = extractive(c('Metro Purple Line services delayed after signal fault', 'Commuters faced delays of up to forty minutes on the Purple Line on Wednesday morning after a signalling fault near the station.', city))!;
    expect(local).toMatchObject({ topic: 'Transit', level: 'city', city: 'Bengaluru', country: 'IN', type: 'local-alert' });
  });
  it('enforces codes and levels on model output', () => {
    const base: Draft = { title: 'T', summary: 'S s s.', topic: 'Nope', type: 'news', level: 'hyper', country: 'in', region: null, city: 'X', more: [{ h: '', p: 'x' }], importance: 42 };
    const d = finalise(base, { source: src('toi', { level: 'city', city: 'Mumbai', region: 'Maharashtra', country: 'IN' }), outlet: 'TOI', title: 'T', url: 'https://x', excerpt: '', article: null })!;
    expect(d).toMatchObject({ topic: 'Big Tech', level: 'city', country: 'IN', city: 'Mumbai', region: 'Maharashtra', importance: 10, more: [] });
  });
});

describe('ingestion cycle', () => {
  let db: DB;
  beforeEach(() => { db = openDb(':memory:'); });

  const feeds: Record<string, string> = {
    'https://yahoo.test/feed': RSS([
      { t: 'Nvidia revenue jumps 60% on AI chip demand', l: 'https://finance.yahoo.com/news/nvidia-1?utm_source=rss', d: LONG, m: 20 },
      { t: 'Mortgage rates fall for third week', l: 'https://finance.yahoo.com/news/mortgage', d: 'Rates on thirty year fixed loans fell again this week according to the latest weekly survey of lenders.', m: 30 },
      { t: 'Old story', l: 'https://finance.yahoo.com/news/old', d: LONG, m: 60 * 48 },
    ]),
    'https://cnbc.test/feed': RSS([{ t: 'Nvidia revenue jumps 60% as AI chip demand soars', l: 'https://cnbc.com/nvidia', d: LONG, m: 10 }]),
    'https://bbc.test/feed': RSS([{ t: "Nvidia's revenue jumps 60% on AI chip demand", l: 'https://bbc.co.uk/nvidia', d: LONG, m: 5 }]),
  };
  const deps = (over: Partial<Parameters<typeof runCycle>[1]> = {}) => ({
    sources: [src('yahoo'), src('cnbc'), src('bbc')],
    fetchFeed: async (url: string) => ({ status: 200, body: feeds[url] }),
    read: async () => null,
    write: async (c: Candidate) => extractive(c),
    now: () => now,
    ...over,
  });

  it('publishes new stories, skips off-topic and stale ones, folds duplicates and flags breaking', async () => {
    const events: unknown[] = [];
    const on = (e: unknown) => events.push(e);
    newsEvents.on('stories', on);
    const r = await runCycle(db, deps());
    newsEvents.off('stories', on);

    expect(r.fetched).toBe(3);
    expect(r.discovered).toBe(4); // the 48-hour-old item is outside the window
    expect(r.published).toHaveLength(1);
    expect(r.merged).toBe(2);
    expect(r.skipped).toBe(1); // mortgages aren't in the app's topics

    const feed = windowStories(db, 36, now);
    expect(feed).toHaveLength(1);
    const s = getStory(db, feed[0].id)!;
    expect(s.topic).toBe('AI Hardware');
    expect(s.type).toBe('breaking'); // three outlets inside three hours
    expect(wordCount(s.summary)).toBeLessThanOrEqual(SUMMARY_MAX_WORDS);
    expect(events.length).toBeGreaterThanOrEqual(1);
  });

  it('never writes the same article twice, and honours 304s', async () => {
    let writes = 0;
    const write = async (c: Candidate) => { writes++; return extractive(c); };
    await runCycle(db, deps({ write }));
    const first = writes;
    const r2 = await runCycle(db, deps({ write, now: () => now + 10 * 60_000, fetchFeed: async () => ({ status: 304, body: '' }) }));
    expect(writes).toBe(first);
    expect(r2.notModified).toBe(3);
    const r3 = await runCycle(db, deps({ write, now: () => now + 20 * 60_000 }));
    expect(r3.discovered).toBe(0);
    expect(writes).toBe(first);
  });

  it('backs off failing feeds and records their errors', async () => {
    const r = await runCycle(db, deps({ fetchFeed: async () => { throw new Error('connect_rejected'); } }));
    expect(r.failed.map(f => f.error)).toEqual(['connect_rejected', 'connect_rejected', 'connect_rejected']);
    const st = db.prepare("SELECT * FROM feed_state WHERE source_id = 'yahoo'").get() as { failures: number; last_fetch_at: number };
    expect(st.failures).toBe(1);
    expect(isDue(src('yahoo'), { ...st, source_id: 'yahoo', etag: null, last_modified: null }, now + 6 * 60_000)).toBe(false); // 2× backoff
    expect(isDue(src('yahoo'), { ...st, source_id: 'yahoo', etag: null, last_modified: null }, now + 11 * 60_000)).toBe(true);
  });

  it('keeps an article pending when the write-up fails, then gives up after three tries', async () => {
    const write = async () => { throw new Error('overloaded'); };
    const one = { sources: [src('yahoo')] };
    for (let i = 0; i < 3; i++) await runCycle(db, deps({ ...one, write, now: () => now + i * 60 * 60_000 }));
    const rows = db.prepare("SELECT status, attempts FROM ingest_items WHERE url_hash IS NOT NULL AND status != 'expired'").all() as { status: string; attempts: number }[];
    expect(rows.every(r => r.status === 'failed' && r.attempts === 3)).toBe(true);
  });

  it('ranks by importance', () => {
    expect(rankFor(10)).toBeLessThan(rankFor(5));
    expect(rankFor(99)).toBe(20);
  });
});
