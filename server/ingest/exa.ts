import { config } from '../config';
import type { FeedItem } from './rss';

/**
 * Exa news search: agent-reach's web-wide search channel. agent-reach registers Exa's free MCP endpoint
 * (`mcporter config add exa https://mcp.exa.ai/mcp`) and calls its `web_search_exa` tool; we speak the same
 * MCP protocol over HTTP directly, so no mcporter install is needed. With EXA_API_KEY set, the Exa search
 * API is used instead (news category, date-filtered, higher limits).
 */
export async function exaSearch(query: string, sinceIso: string, fetchImpl: typeof fetch = fetch): Promise<FeedItem[]> {
  // The free endpoint rate-limits bursts (eight searches at once came back 429): one search at a time,
  // spaced out, with one patient retry.
  return queued(async () => {
    const run = () => (config.news.exaKey ? viaApi(query, sinceIso, fetchImpl) : viaMcp(query, sinceIso, fetchImpl));
    try {
      return await run();
    } catch (e) {
      if (!/429/.test(String(e))) throw e;
      await new Promise(r => setTimeout(r, EXA_RETRY_MS));
      return run();
    }
  });
}

const EXA_SPACING_MS = Number(process.env.EXA_SPACING_MS ?? 2500);
const EXA_RETRY_MS = Number(process.env.EXA_RETRY_MS ?? 8000);
let tail: Promise<unknown> = Promise.resolve();
let last = 0;
function queued<T>(fn: () => Promise<T>): Promise<T> {
  const next = tail.then(async () => {
    const wait = last + EXA_SPACING_MS - Date.now();
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    try { return await fn(); } finally { last = Date.now(); }
  });
  tail = next.catch(() => {});
  return next;
}

interface ExaResult { title?: string; url?: string; publishedDate?: string; text?: string; summary?: string; author?: string }

/** "Headline | Outlet" or "Headline - Outlet" from search results: the card shows the outlet separately. */
const stripSiteSuffix = (t: string) => t.replace(/\s+[|–—-]\s+[^|–—-]{2,40}$/, '').trim();

/**
 * Search returns section fronts and home pages too ("CBS News | Breaking news, top stories", "US Markets,
 * Company Earnings, Stock Market Trends .."). Articles have an article-shaped address: a dated path or a
 * long hyphenated slug, and a headline that isn't a site's tagline.
 */
export function looksLikeArticle(url: string, title: string): boolean {
  let path: string;
  try { path = new URL(url).pathname.replace(/\/+$/, ''); } catch { return false; }
  const last = path.split('/').pop() ?? '';
  const dated = /\/(19|20)\d{2}\/\d{1,2}(\/|-)|\/(19|20)\d{2}-\d{2}-\d{2}|\d{6,}/.test(path);
  const slug = (last.match(/-/g) ?? []).length >= 3;
  if (!dated && !slug) return false;
  if (/(breaking news|top stories|latest news|live updates|today'?s news|home ?page)\b/i.test(title)) return false;
  if (/\.\.\.?$|…$/.test(title.trim())) return false;
  return true;
}

/** Search snippets arrive as highlights: "..." joins, markdown headings, stray separators. */
export const cleanSnippet = (t: string) => t
  .replace(/#{1,6}\s*/g, '')
  .replace(/\s*(\.\.\.|…)\s*/g, ' ')
  .replace(/\s*\|\s*/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const toItems = (results: ExaResult[], sinceIso: string): FeedItem[] => results
  // Undated results are section fronts and landing pages ("Artificial Intelligence - AI News"), not stories.
  .filter(r => r.title && r.url && /^https?:\/\//.test(r.url) && r.publishedDate && looksLikeArticle(r.url, r.title))
  .map(r => ({
    title: stripSiteSuffix(r.title!.trim()),
    url: r.url!,
    excerpt: cleanSnippet(r.summary || r.text || '').slice(0, 2000),
    publishedAt: r.publishedDate && Number.isFinite(Date.parse(r.publishedDate)) ? new Date(r.publishedDate).toISOString() : null,
    outlet: outletFor(r.url!),
  }))
  // Exa's date filter is best-effort on the MCP tool; enforce the window here.
  .filter(i => !i.publishedAt || i.publishedAt >= sinceIso);

/** "www.reuters.com" → "Reuters". A readable outlet name for the card when Exa gives only a URL. */
export function outletFor(url: string): string {
  const KNOWN: Record<string, string> = {
    'reuters.com': 'Reuters', 'apnews.com': 'Associated Press', 'bbc.co.uk': 'BBC', 'bbc.com': 'BBC', 'nytimes.com': 'The New York Times',
    'theguardian.com': 'The Guardian', 'ft.com': 'Financial Times', 'wsj.com': 'The Wall Street Journal', 'bloomberg.com': 'Bloomberg',
    'cnbc.com': 'CNBC', 'theverge.com': 'The Verge', 'techcrunch.com': 'TechCrunch', 'wired.com': 'WIRED', 'arstechnica.com': 'Ars Technica',
    'aljazeera.com': 'Al Jazeera', 'economist.com': 'The Economist', 'nature.com': 'Nature', 'washingtonpost.com': 'The Washington Post',
  };
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    const key = Object.keys(KNOWN).find(k => host === k || host.endsWith(`.${k}`));
    if (key) return KNOWN[key];
    const base = host.split('.').slice(-2, -1)[0] ?? host;
    return base.charAt(0).toUpperCase() + base.slice(1);
  } catch {
    return 'Exa';
  }
}

async function viaApi(query: string, sinceIso: string, fetchImpl: typeof fetch): Promise<FeedItem[]> {
  const res = await fetchImpl('https://api.exa.ai/search', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': config.news.exaKey },
    body: JSON.stringify({ query, type: 'auto', category: 'news', numResults: 15, startPublishedDate: sinceIso, contents: { text: { maxCharacters: 2000 } } }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Exa API HTTP ${res.status}`);
  const data = await res.json() as { results?: ExaResult[] };
  return toItems(data.results ?? [], sinceIso);
}

/** Reads a JSON-RPC reply that may come back as plain JSON or as a server-sent-events stream. */
export function rpcReply(body: string, id: number): { result?: unknown; error?: { message?: string } } | null {
  const candidates = body.trim().startsWith('{') ? [body] : body.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trim());
  for (const c of candidates) {
    try {
      const msg = JSON.parse(c) as { id?: number; result?: unknown; error?: { message?: string } };
      if (msg.id === id) return msg;
    } catch { /* keep looking */ }
  }
  return null;
}

/** The MCP tool answers with text: either the raw Exa JSON, or "Title: … URL: … Published Date: … Text: …" blocks. */
export function parseToolText(text: string): ExaResult[] {
  try {
    const data = JSON.parse(text) as { results?: ExaResult[] } | ExaResult[];
    return Array.isArray(data) ? data : data.results ?? [];
  } catch { /* formatted text */ }
  const out: ExaResult[] = [];
  for (const block of text.split(/\n(?=Title:)/)) {
    const field = (name: string) => new RegExp(`^${name}:\\s*(.*)$`, 'mi').exec(block)?.[1]?.trim();
    const title = field('Title'), url = field('URL');
    if (!title || !url) continue;
    const textAt = block.search(/^(Text|Highlights|Summary):/mi);
    out.push({ title, url, publishedDate: field('Published(?: Date)?'), author: field('Author'), text: textAt >= 0 ? block.slice(textAt).replace(/^(Text|Highlights|Summary):\s*/i, '').trim() : undefined });
  }
  return out;
}

async function viaMcp(query: string, sinceIso: string, fetchImpl: typeof fetch): Promise<FeedItem[]> {
  const url = config.news.exaMcpUrl;
  const headers: Record<string, string> = { 'content-type': 'application/json', accept: 'application/json, text/event-stream' };
  const post = async (payload: object) => {
    const res = await fetchImpl(url, { method: 'POST', headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(25_000) });
    if (!res.ok && res.status !== 202) throw new Error(`Exa MCP HTTP ${res.status}`);
    const session = res.headers.get('mcp-session-id');
    if (session) headers['mcp-session-id'] = session;
    return res.text();
  };
  const init = rpcReply(await post({
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'the-news', version: '1.0' } },
  }), 1);
  if (!init || init.error) throw new Error(`Exa MCP initialize failed${init?.error?.message ? `: ${init.error.message}` : ''}`);
  await post({ jsonrpc: '2.0', method: 'notifications/initialized' });
  const reply = rpcReply(await post({
    jsonrpc: '2.0', id: 2, method: 'tools/call',
    params: { name: 'web_search_exa', arguments: { query: `${query} (published after ${sinceIso.slice(0, 10)})`, numResults: 10 } },
  }), 2);
  if (!reply || reply.error) throw new Error(`Exa MCP search failed${reply?.error?.message ? `: ${reply.error.message}` : ''}`);
  const content = ((reply.result as { content?: { type: string; text?: string }[] })?.content ?? []).filter(c => c.type === 'text' && c.text);
  return toItems(content.flatMap(c => parseToolText(c.text!)), sinceIso);
}
