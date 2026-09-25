import type { Coverage } from '../../shared/domain';

export interface Source {
  id: string;
  name: string;
  url: string;
  /** Where the outlet reports from; national stories from it carry this country. */
  country?: string;
  /** Default coverage level before the editor decides. */
  level: Coverage;
  /** City desks: the city and state/region their stories belong to. */
  city?: string;
  region?: string;
  /** Minutes between polls. Wires and finance desks move fastest. */
  everyMin: number;
}

const gnews = (q: string, gl: string, hl = 'en') =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=${hl}-${gl}&gl=${gl}&ceid=${gl}:${hl}`;

/**
 * Public RSS/Atom feeds, the same channel agent-reach uses for news (feedparser over RSS). Each one is
 * polled with conditional GET, so an unchanged feed costs a 304. Add more with NEWS_FEEDS.
 */
export const SOURCES: Source[] = [
  // Markets and business
  { id: 'yahoo-finance', name: 'Yahoo Finance', url: 'https://finance.yahoo.com/news/rssindex', level: 'global', everyMin: 5 },
  { id: 'yahoo-finance-tech', name: 'Yahoo Finance', url: 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=NVDA,MSFT,GOOGL,META,AAPL,AMZN,TSLA,AMD,TSM,PLTR&region=US&lang=en-US', level: 'global', everyMin: 5 },
  { id: 'cnbc-tech', name: 'CNBC', url: 'https://www.cnbc.com/id/19854910/device/rss/rss.html', country: 'US', level: 'global', everyMin: 5 },
  { id: 'marketwatch', name: 'MarketWatch', url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories', country: 'US', level: 'global', everyMin: 10 },
  // Technology desks
  { id: 'techcrunch', name: 'TechCrunch', url: 'https://techcrunch.com/feed/', level: 'global', everyMin: 5 },
  { id: 'the-verge', name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', level: 'global', everyMin: 5 },
  { id: 'ars-technica', name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', level: 'global', everyMin: 10 },
  { id: 'wired', name: 'WIRED', url: 'https://www.wired.com/feed/rss', level: 'global', everyMin: 10 },
  { id: 'mit-tr', name: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/', level: 'global', everyMin: 15 },
  { id: 'venturebeat-ai', name: 'VentureBeat', url: 'https://venturebeat.com/category/ai/feed/', level: 'global', everyMin: 10 },
  { id: 'bbc-tech', name: 'BBC', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', country: 'GB', level: 'global', everyMin: 5 },
  { id: 'guardian-tech', name: 'The Guardian', url: 'https://www.theguardian.com/technology/rss', country: 'GB', level: 'global', everyMin: 10 },
  { id: 'nyt-tech', name: 'The New York Times', url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml', country: 'US', level: 'global', everyMin: 10 },
  { id: 'hacker-news', name: 'Hacker News', url: 'https://hnrss.org/frontpage?points=150', level: 'global', everyMin: 10 },
  // Beats
  { id: 'hacker-news-sec', name: 'The Hacker News', url: 'https://feeds.feedburner.com/TheHackersNews', level: 'global', everyMin: 15 },
  { id: 'krebs', name: 'Krebs on Security', url: 'https://krebsonsecurity.com/feed/', level: 'global', everyMin: 30 },
  { id: 'robot-report', name: 'The Robot Report', url: 'https://www.therobotreport.com/feed/', level: 'global', everyMin: 30 },
  { id: 'quantum-insider', name: 'The Quantum Insider', url: 'https://thequantuminsider.com/feed/', level: 'global', everyMin: 30 },
  { id: 'space', name: 'Space.com', url: 'https://www.space.com/feeds/all', level: 'global', everyMin: 15 },
  { id: 'tc-climate', name: 'TechCrunch', url: 'https://techcrunch.com/category/climate/feed/', level: 'global', everyMin: 30 },
  // Wire coverage via Google News (Reuters, AP, Bloomberg headlines surface here)
  { id: 'gn-ai-us', name: 'Google News', url: gnews('artificial intelligence', 'US'), country: 'US', level: 'national', everyMin: 10 },
  { id: 'gn-ai-gb', name: 'Google News', url: gnews('artificial intelligence', 'GB'), country: 'GB', level: 'national', everyMin: 15 },
  { id: 'gn-ai-in', name: 'Google News', url: gnews('artificial intelligence', 'IN'), country: 'IN', level: 'national', everyMin: 15 },
  { id: 'gn-tech-sg', name: 'Google News', url: gnews('technology', 'SG'), country: 'SG', level: 'national', everyMin: 20 },
  // National and local desks
  { id: 'et-tech', name: 'The Economic Times', url: 'https://economictimes.indiatimes.com/tech/rssfeeds/13357270.cms', country: 'IN', level: 'national', everyMin: 10 },
  { id: 'hindu-tech', name: 'The Hindu', url: 'https://www.thehindu.com/sci-tech/technology/feeder/default.rss', country: 'IN', level: 'national', everyMin: 15 },
  { id: 'toi-bengaluru', name: 'The Times of India', url: 'https://timesofindia.indiatimes.com/rssfeeds/-2128833038.cms', country: 'IN', level: 'city', city: 'Bengaluru', region: 'Karnataka', everyMin: 15 },
  { id: 'toi-mumbai', name: 'The Times of India', url: 'https://timesofindia.indiatimes.com/rssfeeds/-2128838597.cms', country: 'IN', level: 'city', city: 'Mumbai', region: 'Maharashtra', everyMin: 15 },
  { id: 'bbc-london', name: 'BBC', url: 'https://feeds.bbci.co.uk/news/england/london/rss.xml', country: 'GB', level: 'city', city: 'London', region: 'England', everyMin: 15 },
  { id: 'sf-standard', name: 'The San Francisco Standard', url: 'https://sfstandard.com/feed/', country: 'US', level: 'city', city: 'San Francisco', region: 'California', everyMin: 20 },
];

/** NEWS_FEEDS="Name|https://…,https://…" adds feeds without a code change. */
export function extraSources(spec: string): Source[] {
  return spec.split(',').map(s => s.trim()).filter(Boolean).flatMap((entry, i) => {
    const [a, b] = entry.includes('|') ? entry.split('|', 2) : ['', entry];
    let url: URL;
    try { url = new URL(b.trim()); } catch { return []; }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return [];
    return [{ id: `extra-${i + 1}`, name: a.trim() || url.hostname.replace(/^www\./, ''), url: url.href, level: 'global' as const, everyMin: 10 }];
  });
}
