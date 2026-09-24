import { config } from '../config';

export interface FetchResult {
  status: number;
  body: string;
  etag?: string;
  lastModified?: string;
}

const UA = 'TheNewsBot/1.0 (+https://thenews.app/bot; news summaries with links back to the source)';
const MAX_BYTES = 4 * 1024 * 1024;

/** GET with a timeout, a size cap and conditional headers. 304 comes back as a status, not an error. */
export async function httpGet(url: string, opts: { etag?: string | null; lastModified?: string | null; timeoutMs?: number; headers?: Record<string, string> } = {}): Promise<FetchResult> {
  const headers: Record<string, string> = { 'user-agent': UA, accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.5', ...opts.headers };
  if (opts.etag) headers['if-none-match'] = opts.etag;
  if (opts.lastModified) headers['if-modified-since'] = opts.lastModified;
  const res = await fetch(url, { headers, redirect: 'follow', signal: AbortSignal.timeout(opts.timeoutMs ?? 15_000) });
  if (res.status === 304) return { status: 304, body: '' };
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const len = Number(res.headers.get('content-length') || 0);
  if (len > MAX_BYTES) throw new Error('response too large');
  const body = await res.text();
  if (body.length > MAX_BYTES) throw new Error('response too large');
  return { status: res.status, body, etag: res.headers.get('etag') ?? undefined, lastModified: res.headers.get('last-modified') ?? undefined };
}

/**
 * Full article text through Jina Reader: agent-reach's web channel (`curl https://r.jina.ai/<url>`), which
 * renders the page and returns clean markdown. Used when a feed only carries a headline or a one-line
 * teaser, so the write-up is grounded in the article rather than the teaser. Returns null on any failure;
 * the pipeline then writes from the feed excerpt alone.
 */
export async function readArticle(url: string): Promise<string | null> {
  if (!config.news.reader) return null;
  try {
    const headers: Record<string, string> = { accept: 'text/plain', 'x-return-format': 'markdown', 'x-retain-images': 'none' };
    if (config.news.readerKey) headers.authorization = `Bearer ${config.news.readerKey}`;
    const res = await httpGet(config.news.readerUrl + url, { timeoutMs: 20_000, headers });
    return cleanMarkdown(res.body).slice(0, 12_000) || null;
  } catch {
    return null;
  }
}

/** Strips Jina's header block, links, images and navigation noise, keeping paragraphs. */
export function cleanMarkdown(md: string): string {
  const body = md.includes('Markdown Content:') ? md.slice(md.indexOf('Markdown Content:') + 17) : md;
  return body
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)]\([^)]*\)/g, '$1')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.split(/\s+/).length >= 8 && !/^(subscribe|sign up|advertisement|read more|share this|follow us|cookie)/i.test(l))
    .join('\n');
}
