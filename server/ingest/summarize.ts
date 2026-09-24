import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { config } from '../config';
import { ALL_TOPICS, SUMMARY_MAX_WORDS, TOPICS, wordCount, type Coverage, type StoryMore, type StoryType } from '../../shared/domain';
import type { Source } from './sources';

export interface Draft {
  title: string;
  summary: string;
  topic: string;
  type: StoryType;
  level: Coverage;
  country: string | null;
  region: string | null;
  city: string | null;
  more: StoryMore[];
  /** 1–10, how much a curious reader needs to know this today. Drives rank. */
  importance: number;
}

export interface Candidate {
  source: Source;
  outlet: string;
  title: string;
  url: string;
  excerpt: string;
  article: string | null;
}

export const TITLE_MAX = 90;

const EditSchema = z.object({
  relevant: z.boolean(),
  title: z.string(),
  summary: z.string(),
  topic: z.enum(ALL_TOPICS as [string, ...string[]]),
  type: z.enum(['news', 'breaking', 'explainer', 'local-alert', 'opinion']),
  level: z.enum(['global', 'national', 'state', 'city', 'hyper']),
  country: z.string().nullable(),
  region: z.string().nullable(),
  city: z.string().nullable(),
  more: z.array(z.object({ h: z.string(), p: z.string() })),
  importance: z.number(),
});

// Stable across every call so it is served from the prompt cache.
const SYSTEM = `You are the editor of The News, a phone app that shows one story per screen and is read in nine seconds per story.

For each article you receive, decide whether it belongs in the app and, if it does, write the card.

The app covers these topics: ${TOPICS.join(', ')}. For city and neighbourhood stories it also covers: Transit, Civic, Weather, Events, Food.
Markets and business news belongs when it is about technology companies, AI, chips, startups, or funding (use AI Business, Big Tech, Startups or AI Hardware). Set relevant=false for sport, celebrity, lifestyle, horoscopes, deals and coupons, product listicles, sponsored posts, podcasts and newsletters, stock tips with no news, and anything that is not news.

Write:
- title: a headline of at most ${TITLE_MAX} characters. Specific and plain: who did what, with the number if there is one. No clickbait, no question headlines, no outlet name, sentence case, no trailing full stop.
- summary: at most ${SUMMARY_MAX_WORDS} words, readable in nine seconds. The single most important fact first, then why it matters. Only facts that are in the article. No "In a move that…", no hype, no emoji.
- more: two or three short sections a reader opens for depth. Each has a heading of two to four words (for example "What happened", "Why it matters", "What's next") and a paragraph of 30 to 60 words. Only facts from the article.
- topic: the one best topic from the list.
- type: breaking only for major developments in the last few hours that most readers will want right now; explainer for pieces that explain; opinion for columns and analysis with a viewpoint; local-alert for disruptions, closures and warnings in a city; otherwise news.
- level: global when it matters worldwide; national when it mainly matters in one country; state, city or hyper for regional, city and neighbourhood stories.
- country: ISO 3166-1 alpha-2 code of the country the story is about, or null for global stories. region and city: names when the story is local, else null.
- importance: 1 to 10.

Write in British-neutral plain English. Never invent facts, quotes, or numbers.`;

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic({ apiKey: config.news.anthropicKey, maxRetries: 3, timeout: 60_000 }));

export const usingClaude = () => Boolean(config.news.anthropicKey);

/** Returns the card, null when the article doesn't belong in the app. Falls back to extraction without a key. */
export async function writeUp(c: Candidate): Promise<Draft | null> {
  if (!usingClaude()) return extractive(c);
  const body = (c.article || c.excerpt).slice(0, 10_000);
  const message = [
    `Outlet: ${c.outlet}`,
    `Feed: ${c.source.name}${c.source.city ? ` city desk, ${c.source.city}` : ''}${c.source.country ? ` (${c.source.country})` : ''}, usually ${c.source.level} coverage`,
    `Headline: ${c.title}`,
    `URL: ${c.url}`,
    '',
    body ? `Article:\n${body}` : 'Article: (only the headline is available; set relevant=false unless the headline alone is a complete, clear news fact)',
  ].join('\n');
  try {
    const res = await getClient().messages.parse({
      model: config.news.model,
      max_tokens: 4000,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: message }],
      output_config: { effort: 'low', format: zodOutputFormat(EditSchema) },
    });
    if (res.stop_reason === 'refusal') return extractive(c);
    const out = res.parsed_output;
    if (!out) return extractive(c);
    if (!out.relevant) return null;
    return finalise({
      title: out.title, summary: out.summary, topic: out.topic, type: out.type, level: out.level,
      country: out.country, region: out.region, city: out.city, more: out.more, importance: out.importance,
    }, c);
  } catch (e) {
    // Auth and bad-request errors won't fix themselves on retry: surface them. Transient ones fall back.
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError || e instanceof Anthropic.BadRequestError) throw e;
    return extractive(c);
  }
}

/** Enforces the app's contracts on whatever came back: title length, nine-second summary, valid codes. */
export function finalise(d: Draft, c: Candidate): Draft | null {
  const title = clampTitle(d.title || c.title);
  const summary = fitWords(d.summary, SUMMARY_MAX_WORDS);
  if (!title || !summary) return null;
  const cityDesk = c.source.level === 'city' && (d.level === 'city' || d.level === 'hyper');
  const country = d.country && /^[A-Z]{2}$/.test(d.country.toUpperCase()) ? d.country.toUpperCase() : (d.level === 'global' ? null : c.source.country ?? null);
  return {
    ...d,
    title,
    summary,
    topic: ALL_TOPICS.includes(d.topic) ? d.topic : 'Big Tech',
    country: d.level === 'global' ? null : country,
    city: cityDesk ? c.source.city ?? d.city : d.city,
    region: cityDesk ? c.source.region ?? d.region : d.region,
    // Neighbourhood stories need coordinates the feed doesn't carry; they run at city level.
    level: d.level === 'hyper' ? 'city' : d.level,
    more: d.more.filter(m => m.h?.trim() && m.p?.trim()).slice(0, 4).map(m => ({ h: m.h.trim().slice(0, 60), p: m.p.trim().slice(0, 1200) })),
    importance: Math.min(10, Math.max(1, Math.round(Number(d.importance) || 5))),
  };
}

export function clampTitle(t: string): string {
  const s = t.replace(/\s+/g, ' ').replace(/[.。]$/, '').trim();
  if (s.length <= TITLE_MAX) return s;
  const cut = s.slice(0, TITLE_MAX - 1);
  return cut.slice(0, cut.lastIndexOf(' ') > 40 ? cut.lastIndexOf(' ') : cut.length).replace(/[,;:–—-]$/, '') + '…';
}

/** Whole sentences up to `max` words; a single long sentence is cut at a word boundary. */
export function fitWords(text: string, max: number): string {
  const s = text.replace(/\s+/g, ' ').trim();
  if (!s || wordCount(s) <= max) return s;
  const sentences = s.match(/[^.!?]+[.!?]+["’”)]?(\s|$)|[^.!?]+$/g) ?? [s];
  let out = '';
  for (const sen of sentences) {
    const next = (out + ' ' + sen.trim()).trim();
    if (wordCount(next) > max) break;
    out = next;
  }
  if (out) return out;
  return s.split(' ').slice(0, max).join(' ').replace(/[,;:–—-]$/, '') + '…';
}

// ---- Extractive fallback (no API key, or the model is unavailable) ----

const RULES: [string, RegExp][] = [
  ['AI Policy', /\b(regulat\w*|AI act|legislat\w*|senate|congress|parliament|ban(s|ned)?|lawsuit|antitrust|copyright|executive order|policy)\b/i],
  ['AI Hardware', /\b(nvidia|gpu|chips?|semiconductor|tsmc|amd|intel|blackwell|data ?cent(er|re)s?|accelerator|wafer|fab)\b/i],
  ['Quantum Computing', /\bquantum|qubits?\b/i],
  ['Robotics', /\b(robot\w*|humanoid|drone|autonomous (vehicle|car)|self-driving|waymo)\b/i],
  ['Cybersecurity', /\b(hack\w*|breach|ransomware|malware|vulnerabilit\w*|cyber\w*|phishing|zero-day|exploit)\b/i],
  ['Space', /\b(nasa|spacex|rocket|orbit\w*|satellite|lunar|moon|mars|launch pad|starship|isro|esa)\b/i],
  ['Climate Tech', /\b(climate|carbon|solar|battery|batteries|\bev\b|electric vehicle|renewable|emissions|grid|nuclear|fusion)\b/i],
  ['Startups', /\b(startup|raises?|funding|series [a-e]|seed round|valuation|unicorn|venture|vc)\b/i],
  ['AI Research', /\b(research(ers)?|paper|benchmark|study|scientists?|deepmind|arxiv)\b/i],
  ['AI Models', /\b(gpt-?\d|claude|gemini|llama|model(s)?|llm|chatgpt|openai|anthropic|mistral|deepseek)\b/i],
  ['AI Business', /\b(earnings|revenue|shares?|stock|ipo|acquisition|acquire[sd]?|deal|investors?|market cap|profit)\b/i],
  ['AI Tools', /\b(app|feature|assistant|copilot|agent(s)?|plugin|tool(s)?|update)\b/i],
  ['Big Tech', /\b(apple|google|alphabet|microsoft|meta|amazon|tesla|netflix|samsung|bytedance|tiktok|x corp)\b/i],
  ['AI & Society', /\b(jobs|workers|education|students|misinformation|deepfake|privacy|ethic\w*)\b/i],
];
const TECH = /\b(ai|a\.i\.|artificial intelligence|tech\w*|software|chip\w*|startup|robot\w*|quantum|cyber\w*|space|satellite|app|internet|digital|data|cloud|computer|nvidia|openai|apple|google|microsoft|meta|amazon|tesla|nasa|spacex|rockets?|orbit\w*|satellites?|moon|mars|robot\w*|drones?|quantum|hack\w*|ransomware|breach|malware|climate|carbon|solar|batter(y|ies)|electric vehicles?|semiconductors?|startups?)\b/i;

const LOCAL_RULES: [string, RegExp][] = [
  ['Transit', /\b(metro|train|rail\w*|bus(es)?|tube|bart|muni|traffic|road|flyover|airport|commut\w*|station)\b/i],
  ['Weather', /\b(rain\w*|monsoon|storm|flood\w*|heat ?wave|weather|temperature|snow|cyclone|fog|air quality|aqi)\b/i],
  ['Civic', /\b(council|mayor|municipal|corporation|civic|water supply|power cut|outage|police|school|hospital|budget|election|bbmp|bmc)\b/i],
  ['Events', /\b(festival|concert|exhibition|marathon|match|event|parade|fair|show)\b/i],
  ['Food', /\b(restaurant|cafe|café|food|dining|chef|bakery|street food)\b/i],
];

export function classify(text: string, local = false): string | null {
  if (local) for (const [topic, re] of LOCAL_RULES) if (re.test(text)) return topic;
  for (const [topic, re] of RULES) if (re.test(text)) return topic;
  return null;
}

export function extractive(c: Candidate): Draft | null {
  const blob = `${c.title}. ${c.excerpt}`;
  const local = c.source.level === 'city';
  if (!local && !TECH.test(blob)) return null;
  const topic = classify(blob, local);
  if (!topic) return null;
  const source = (c.article || c.excerpt).replace(/\s+/g, ' ').trim();
  // A teaser that just repeats the headline isn't a summary.
  if (wordCount(source) < 12) return null;
  const summary = fitWords(source, SUMMARY_MAX_WORDS);
  const paras = (c.article ?? '').split('\n').map(p => p.trim()).filter(p => wordCount(p) >= 20);
  const more: StoryMore[] = paras.length >= 2
    ? [{ h: 'What happened', p: fitWords(paras[0], 60) }, { h: 'The detail', p: fitWords(paras[1], 60) }]
    : [];
  return finalise({
    title: c.title, summary, topic, type: c.source.level === 'city' && /\b(closed|closures?|delay\w*|warning|alert|disrupt\w*|suspended|diverted)\b/i.test(blob) ? 'local-alert' : 'news',
    level: c.source.level, country: c.source.country ?? null, region: c.source.region ?? null, city: c.source.city ?? null, more, importance: 5,
  }, c);
}
