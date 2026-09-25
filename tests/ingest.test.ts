import { describe, expect, it, beforeEach } from 'vitest';
import { openDb, type DB } from '../server/db';
import { windowStories, getStory } from '../server/stories';
import { parseFeed, normalizeUrl, titleKey, similarity, toText } from '../server/ingest/rss';
import { cleanMarkdown } from '../server/ingest/reader';
import { runCycle, newsEvents, isDue, rankFor } from '../server/ingest/pipeline';
import { parseToolText, rpcReply, outletFor, exaSearch } from '../server/ingest/exa';
import { classify, extractive, fitWords, clampTitle, finalise, TITLE_MAX, type Candidate, type Draft } from '../server/ingest/summarize';
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

describe('world coverage and agent-reach Exa channel', () => {
  it('classifies the wider world, uses the desk beat as a tiebreak, and skips non-news', () => {
    expect(classify('Ceasefire talks resume as troops pull back from the border')).toBe('World');
    expect(classify('Stocks slide as the Federal Reserve signals higher interest rates')).toBe('Markets');
    expect(classify('WHO warns of measles outbreak across three countries')).toBe('Health');
    expect(classify('Scientists discover a new species of deep-sea octopus')).toBe('Science');
    expect(classify('OpenAI launches a new agent tool for spreadsheets')).toBe('AI Tools');
    expect(classify('Nvidia unveils its next data centre chip')).toBe('AI Hardware');
    expect(classify('Local council opens a new library branch', { beat: 'World' })).toBe('World');
    expect(classify('Your weekly horoscope: what the stars say', { beat: 'World' })).toBeNull();
  });

  it('parses both shapes of the Exa MCP tool output', () => {
    const json = JSON.stringify({ results: [{ title: 'A', url: 'https://reuters.com/a', publishedDate: '2026-09-24T10:00:00Z', text: 'Body A' }] });
    expect(parseToolText(json)).toEqual([{ title: 'A', url: 'https://reuters.com/a', publishedDate: '2026-09-24T10:00:00Z', text: 'Body A' }]);
    const text = 'Title: Chip exports rise\nURL: https://www.ft.com/content/x\nPublished Date: 2026-09-24\nAuthor: Jane\nText: Exports of advanced chips rose.\n\nTitle: Second\nURL: https://apnews.com/b\nText: Two.';
    const r = parseToolText(text);
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ title: 'Chip exports rise', url: 'https://www.ft.com/content/x', publishedDate: '2026-09-24', text: 'Exports of advanced chips rose.' });
  });

  it('reads JSON-RPC replies sent as JSON or as an event stream', () => {
    expect(rpcReply('{"jsonrpc":"2.0","id":2,"result":{"ok":true}}', 2)).toMatchObject({ result: { ok: true } });
    expect(rpcReply('event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{}}\n\n', 1)).toMatchObject({ result: {} });
    expect(rpcReply('data: {"jsonrpc":"2.0","id":9}', 1)).toBeNull();
  });

  it('names outlets from URLs', () => {
    expect(outletFor('https://www.reuters.com/world/x')).toBe('Reuters');
    expect(outletFor('https://edition.bbc.co.uk/news')).toBe('BBC');
    expect(outletFor('https://www.restofworld.org/2026/x')).toBe('Restofworld');
  });

  it('speaks MCP to the Exa endpoint: initialize, initialized, tools/call web_search_exa', async () => {
    const calls: { method: string; session?: string | null }[] = [];
    const fake = (async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      calls.push({ method: body.method, session: (init.headers as Record<string, string>)['mcp-session-id'] ?? null });
      if (body.method === 'initialize') return new Response('event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2025-03-26"}}\n\n', { headers: { 'mcp-session-id': 'sess-1' } });
      if (body.method === 'notifications/initialized') return new Response(null, { status: 202 });
      expect(body.params.name).toBe('web_search_exa');
      const text = 'Title: Ceasefire agreed\nURL: https://apnews.com/c\nPublished Date: 2026-09-24T09:00:00Z\nText: Both sides agreed to a ceasefire.';
      return new Response(JSON.stringify({ jsonrpc: '2.0', id: 2, result: { content: [{ type: 'text', text }] } }));
    }) as unknown as typeof fetch;
    const items = await exaSearch('top world news today', '2026-09-23T00:00:00Z', fake);
    expect(calls.map(c => c.method)).toEqual(['initialize', 'notifications/initialized', 'tools/call']);
    expect(calls[2].session).toBe('sess-1');
    expect(items).toEqual([{ title: 'Ceasefire agreed', url: 'https://apnews.com/c', excerpt: 'Both sides agreed to a ceasefire.', publishedAt: '2026-09-24T09:00:00.000Z', outlet: 'Associated Press' }]);
  });

  it('feeds Exa results into the cycle like any other source', async () => {
    const db = openDb(':memory:');
    const exaSrc: Source = { id: 'exa-world', name: 'Exa', url: 'exa:top world news', kind: 'exa', query: 'top world news', level: 'global', everyMin: 30, beat: 'World' };
    const r = await runCycle(db, {
      sources: [exaSrc], now: () => now, read: async () => null, write: async (c: Candidate) => extractive(c),
      search: async () => [{ title: 'Ceasefire agreed in border conflict', url: 'https://apnews.com/c', excerpt: 'Both governments agreed to a ceasefire on Wednesday after talks brokered by the United Nations ended a week of fighting along the border.', publishedAt: new Date(now - 30 * 60_000).toISOString(), outlet: 'Associated Press' }],
    });
    expect(r.published).toHaveLength(1);
    const s = getStory(db, r.published[0])!;
    expect(s).toMatchObject({ topic: 'World', source: 'Associated Press' });
  });
});

describe('at production volume', () => {
  it('ranks fresh stories up, keeps fresh breaking news first, and prunes only unreferenced old stories', async () => {
    const { windowStories, upsertStories, pruneStories } = await import('../server/stories');
    const db = openDb(':memory:');
    const at = (h: number) => new Date(now - h * 3600_000).toISOString();
    const base = { cat: 'World', topic: 'World', summary: 's', source: 'X', url: 'https://x/1', level: 'global' as const, type: 'news' as const };
    upsertStories(db, [
      { ...base, id: 'old-important', title: 'a', publishedAt: at(30), rank: 20 },
      { ...base, id: 'fresh-ordinary', title: 'b', publishedAt: at(1), rank: 60 },
      { ...base, id: 'fresh-breaking', title: 'c', publishedAt: at(2), rank: 80, type: 'breaking' },
      { ...base, id: 'stale-breaking', title: 'd', publishedAt: at(20), rank: 80, type: 'breaking' },
    ]);
    expect(windowStories(db, 36, now).map(s => s.id)).toEqual(['fresh-breaking', 'fresh-ordinary', 'old-important', 'stale-breaking']);

    upsertStories(db, [
      { ...base, id: 'ancient', title: 'e', publishedAt: at(24 * 40) },
      { ...base, id: 'ancient-saved', title: 'f', publishedAt: at(24 * 40) },
    ]);
    db.prepare("INSERT INTO users (id, name, email, verified, created_at) VALUES ('u', 'U', 'u@x.co', 1, '')").run();
    db.prepare("INSERT INTO saves (user_id, story_id, created_at) VALUES ('u', 'ancient-saved', 0)").run();
    expect(pruneStories(db, 30, now)).toBe(1);
    expect(db.prepare("SELECT id FROM stories WHERE id LIKE 'ancient%'").all()).toEqual([{ id: 'ancient-saved' }]);
  });

  it('skips unreadable aggregator links in the reader', async () => {
    const { readArticle } = await import('../server/ingest/reader');
    expect(await readArticle('https://news.google.com/rss/articles/abc')).toBeNull();
  });

  it('runs 61 sources × 30 items through dedupe, write-up and the capped feed quickly', async () => {
    const db = openDb(':memory:');
    const words = ['ceasefire', 'nvidia', 'inflation', 'vaccine', 'rocket', 'startup', 'quantum', 'election', 'robot', 'ransomware'];
    const sources: Source[] = Array.from({ length: 61 }, (_, i) => src(`s${i}`));
    const feedsBySource = new Map(sources.map((s, i) => [s.url, RSS(Array.from({ length: 30 }, (_, j) => {
      const w = words[(i + j) % words.length];
      // Every story appears at three outlets, so dedupe has real work to do.
      const story = (i * 30 + j) % 600;
      return { t: `${w} story ${story} ${w} headline number ${story}`, l: `https://outlet${i}.test/${story}`, d: `${LONG} Topic ${w} item ${story}.`, m: 5 + (j % 50) };
    }))]));
    const t0 = performance.now();
    const r = await runCycle(db, {
      sources, now: () => now, read: async () => null, write: async (c: Candidate) => extractive(c),
      fetchFeed: async (url: string) => ({ status: 200, body: feedsBySource.get(url)! }),
    });
    const ms = performance.now() - t0;
    expect(r.fetched).toBe(61);
    expect(r.discovered).toBe(61 * 30);
    expect(r.published.length).toBeGreaterThan(0);
    expect(r.published.length).toBeLessThanOrEqual(40); // the per-cycle write budget
    expect(ms).toBeLessThan(5000);

    const { createApp } = await import('../server/app');
    const request = (await import('supertest')).default;
    const app = createApp({ db, mail: async () => {} });
    const feed = await request(app).post('/api/feed').send({ filters: { cov: [], cty: [], plc: [], top: [], typ: [] } }).expect(200);
    expect(feed.body.stories.length).toBeLessThanOrEqual(60);
    expect(new Set(feed.body.stories.map((s: { id: string }) => s.id)).size).toBe(feed.body.stories.length);
  });
});

describe('dedupe keeps different stories apart', () => {
  it('does not merge headlines whose figures differ', () => {
    expect(similarity(titleKey('Fed holds interest rates at 4.5% as inflation cools'), titleKey('Fed holds interest rates at 4.25% as inflation cools'))).toBeLessThan(0.55);
    expect(similarity(titleKey('Nvidia revenue jumps 60% on AI chip demand'), titleKey('Nvidia revenue jumps 60% as AI chip demand soars'))).toBeGreaterThanOrEqual(0.55);
  });
});

describe('fallback topics on real headlines (2026-09-25 snapshot)', () => {
  const c = (title: string, excerpt: string, beat?: string): Candidate => ({ source: { ...src('x'), beat }, outlet: 'X', title, url: 'https://x/1', excerpt, article: null });
  it('reads the headline first', () => {
    expect(extractive(c('Dow, S&P 500 and Nasdaq notch weekly wins as market shrugs off bond sell-off',
      'The Dow Jones Industrial Average rose 0.9% on Friday. Akamai Technologies rose 3% after announcing a multiyear deal with Anthropic.', 'Markets'))!.topic).toBe('Markets');
    expect(extractive(c('Houthis say they launched missile and drone attacks on Riyadh and Aramco facilities',
      "Yemen's Iran-aligned Houthis said they launched missile and drone attacks on a sensitive target in Riyadh, after Saudi Arabia intercepted six ballistic missiles.", 'World'))!.topic).toBe('World');
    expect(extractive(c('Bitget hit by $350 million exploit, the largest crypto hack of 2026',
      'Crypto exchange Bitget was hit by a $350 million exploit, the largest cryptocurrency hack of the year so far.'))!.topic).toBe('Cybersecurity');
  });
});

describe('push channel', () => {
  it('publishes pushed items and leaves other sources\' queued articles alone', async () => {
    const { createApp } = await import('../server/app');
    const { config } = await import('../server/config');
    const request = (await import('supertest')).default;
    config.adminToken = 'push-admin';
    const db = openDb(':memory:');
    // An RSS article is queued but not yet written up (its run was cut short).
    db.prepare(`INSERT INTO ingest_items (url_hash, source_id, title_key, status, payload, published_at, seen_at) VALUES ('h1', 'bbc-world', 'k', 'pending', '{}', ?, ?)`)
      .run(new Date().toISOString(), Date.now());
    const app = createApp({ db, mail: async () => {} });
    const item = { title: 'Ceasefire agreed in border conflict after UN talks', url: 'https://apnews.com/c', excerpt: 'Both governments agreed to a ceasefire on Wednesday after talks brokered by the United Nations ended a week of fighting along the border.', publishedAt: new Date(Date.now() - 3600_000).toISOString() };
    await request(app).post('/api/admin/ingest/items').send({ source: { name: 'Agent Reach' }, items: [item] }).expect(401);
    await request(app).post('/api/admin/ingest/items').set('Authorization', 'Bearer push-admin').send({ source: { name: 'Agent Reach' }, items: [{ ...item, url: 'javascript:x' }] }).expect(400);
    const r = await request(app).post('/api/admin/ingest/items').set('Authorization', 'Bearer push-admin').send({ source: { name: 'Agent Reach', beat: 'World' }, items: [item] }).expect(200);
    expect(r.body.published).toHaveLength(1);
    expect(getStory(db, r.body.published[0])).toMatchObject({ topic: 'World', source: 'Agent Reach' });
    expect(db.prepare("SELECT status FROM ingest_items WHERE url_hash = 'h1'").get()).toEqual({ status: 'pending' });
  });
});
