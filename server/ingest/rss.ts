import { XMLParser } from 'fast-xml-parser';

export interface FeedItem {
  title: string;
  url: string;
  /** Plain-text description or excerpt, HTML stripped. */
  excerpt: string;
  publishedAt: string | null;
  /** The outlet named inside an aggregator item (Google News puts it in <source>). */
  outlet?: string;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  textNodeName: '#text',
  cdataPropName: false,
  processEntities: true,
  htmlEntities: true,
  trimValues: true,
  isArray: name => name === 'item' || name === 'entry' || name === 'link',
});

const ENTITY: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };

export function decodeEntities(s: string) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return ENTITY[e.toLowerCase()] ?? m;
  });
}

/** HTML to readable text: drops tags, scripts and "The post … appeared first on …" trailers. */
export function toText(html: string) {
  return decodeEntities(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>|<\/p>|<\/li>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\bThe post .{0,200}? appeared first on .{0,80}?\.?$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function text(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (Array.isArray(v)) return text(v[0]);
  if (typeof v === 'object' && '#text' in (v as object)) return text((v as Record<string, unknown>)['#text']);
  return '';
}

function atomLink(links: unknown): string {
  const arr = (Array.isArray(links) ? links : [links]) as Record<string, string>[];
  const alt = arr.find(l => l && typeof l === 'object' && (!l['@rel'] || l['@rel'] === 'alternate')) ?? arr[0];
  return typeof alt === 'string' ? alt : alt?.['@href'] ?? text(alt);
}

function isoDate(v: string): string | null {
  if (!v) return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

/** Parses RSS 2.0, RSS 1.0 (RDF) and Atom. Items without a title or an http(s) link are dropped. */
export function parseFeed(xml: string): FeedItem[] {
  let doc: Record<string, unknown>;
  try { doc = parser.parse(xml) as Record<string, unknown>; } catch { throw new Error('feed is not valid XML'); }
  const rss = doc.rss as { channel?: { item?: unknown[] } } | undefined;
  const rdf = doc['rdf:RDF'] as { item?: unknown[] } | undefined;
  const atom = doc.feed as { entry?: unknown[] } | undefined;
  const raw = (rss?.channel?.item ?? rdf?.item ?? atom?.entry);
  if (!raw) {
    if (rss || rdf || atom) return [];
    throw new Error('not an RSS or Atom feed');
  }
  const out: FeedItem[] = [];
  for (const it of raw as Record<string, unknown>[]) {
    const title = toText(text(it.title));
    const link = (atom ? atomLink(it.link) : text(it.link) || (typeof it.guid === 'string' && /^https?:/.test(it.guid) ? it.guid : '')).trim();
    if (!title || !/^https?:\/\//i.test(link)) continue;
    const excerpt = toText(text(it.description) || text(it.summary) || text(it['content:encoded']) || text(it.content)).slice(0, 2000);
    const published = isoDate(text(it.pubDate) || text(it.published) || text(it.updated) || text(it['dc:date']));
    const outlet = toText(text(it.source)) || undefined;
    out.push({ title, url: link, excerpt, publishedAt: published, outlet });
  }
  return out;
}

const TRACKING = /^(utm_\w+|fbclid|gclid|mc_cid|mc_eid|ref|ref_src|cmpid|guccounter|guce_\w+|ncid|sr_share|taid|yptr|\.tsrc)$/i;

/** Canonical form of an article URL so the same article from two feeds hashes the same. */
export function normalizeUrl(u: string): string {
  try {
    const url = new URL(u);
    url.hash = '';
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    for (const k of [...url.searchParams.keys()]) if (TRACKING.test(k)) url.searchParams.delete(k);
    url.searchParams.sort();
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
    return url.toString();
  } catch {
    return u.trim();
  }
}

const STOP = new Set('a an the and or of to in on for with at by from as is are was were be been it its this that after over into new says said will could would how why what who amid about up out than more'.split(' '));

/** Content words of a headline, for spotting the same story across outlets. */
export function titleKey(title: string): string {
  const words = title
    .toLowerCase()
    .replace(/\s[-–—|]\s[^-–—|]{2,40}$/, '') // "Headline - Outlet" suffixes from aggregators
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9$%. ]+/g, ' ')
    .split(/\s+/)
    .map(w => w.replace(/\.$/, ''))
    .filter(w => w.length > 1 && !STOP.has(w));
  return [...new Set(words)].sort().join(' ');
}

/** Overlap of two title keys (Jaccard on content words). Same story across outlets usually scores ≥ 0.5. */
export function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const A = new Set(a.split(' ')), B = new Set(b.split(' '));
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / (A.size + B.size - inter);
}

/** Aggregator titles end in " - Outlet"; the card shows the outlet separately. */
export function stripOutletSuffix(title: string, outlet?: string) {
  if (outlet && title.endsWith(` - ${outlet}`)) return title.slice(0, -(outlet.length + 3)).trim();
  return title;
}
