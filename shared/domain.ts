// Domain model shared by the client and the API server.

export type Coverage = 'global' | 'national' | 'state' | 'city' | 'hyper';
export type StoryType = 'news' | 'breaking' | 'explainer' | 'local-alert' | 'opinion';
export type Theme = 'system' | 'light' | 'dark';
export type TextSize = 'sm' | 'md' | 'lg';
export const TEXT_SCALE: Record<TextSize, number> = { sm: 0.9, md: 1, lg: 1.14 };

export interface StoryMore {
  h: string;
  p: string;
}

export interface Story {
  id: string;
  /** Display category shown in the blue pill. */
  cat: string;
  /** Taxonomy topic used by filters (usually equals `cat`; local stories use Transit, Civic…). */
  topic: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  level: Coverage;
  type: StoryType;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  area?: string | null;
  lat?: number | null;
  lon?: number | null;
  removed?: boolean;
  /** Present on reader-sheet fetches; feed payloads omit it to stay small. */
  more?: StoryMore[];
  /** Computed per viewer for hyperlocal stories. */
  distanceKm?: number | null;
}

export interface Place {
  id: string;
  kind: 'home' | 'work' | 'current' | 'other';
  label: string;
  area: string;
  city: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
  radiusKm: number;
}

export interface Filters {
  cov: string[];
  cty: string[];
  plc: string[];
  top: string[];
  typ: string[];
}

export interface Prefs {
  topics: string[];
  /** ISO 3166-1 alpha-2 codes. The first entry is the home country. */
  countries: string[];
  coverage: Coverage[];
  radiusKm: number;
  places: Place[];
  followTravel: boolean;
  filters: Filters;
  /** Daily story at `time` (HH:MM) in the reader's IANA time zone. */
  notifications: { enabled: boolean; time: string; tz?: string };
  paceMs: number | null;
  theme: Theme;
  /** Story text size on cards and in the reader. */
  textSize: TextSize;
  /** The feed opens in this view. */
  defaultView: 'swipe' | 'list';
  haptics: boolean;
  /** Calms the living gradient and screen transitions. */
  reduceMotion: boolean;
  /** Outlets the reader never wants to see. */
  mutedSources: string[];
  onboarded: boolean;
  updatedAt: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  verified: boolean;
}

export const STORY_SECONDS = 9;
/** Nine seconds at an ordinary reading pace (~4.5 words a second). Longer summaries are rejected at ingest. */
export const SUMMARY_MAX_WORDS = 45;
export const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export const TOPICS = [
  'AI Models', 'AI Policy', 'AI Research', 'AI Tools', 'AI Business', 'AI & Society', 'Quantum Computing',
  'Robotics', 'Big Tech', 'Startups', 'AI Hardware', 'Cybersecurity', 'Climate Tech', 'Space',
  // The wider world, so the day's biggest stories are never missing.
  'World', 'Markets', 'Science', 'Health',
] as const;

export const LOCAL_TOPICS = ['Transit', 'Civic', 'Weather', 'Events', 'Food'] as const;

export const ALL_TOPICS: string[] = [...TOPICS, ...LOCAL_TOPICS];

export const COVERAGE: { k: Coverage; t: string; filter: string; d: string; icon: string }[] = [
  { k: 'global', t: 'Global', filter: 'Global', d: 'the biggest stories worldwide', icon: 'earth' },
  { k: 'national', t: 'National', filter: 'National', d: 'across the countries you picked', icon: 'flag' },
  { k: 'state', t: 'State / region', filter: 'State', d: 'your state or region', icon: 'maps-location' },
  { k: 'city', t: 'City', filter: 'City', d: 'your city', icon: 'city' },
  { k: 'hyper', t: 'Neighbourhood', filter: 'Neighbourhood', d: 'hyperlocal, within a radius you choose', icon: 'location-user' },
];

export const RADII = [1, 3, 5, 10] as const;

export const STORY_TYPES: { k: StoryType; t: string }[] = [
  { k: 'breaking', t: 'Breaking' },
  { k: 'explainer', t: 'Explainers' },
  { k: 'local-alert', t: 'Local alerts' },
  { k: 'opinion', t: 'Opinion' },
];

// ISO 3166-1 alpha-2 codes. Names come from Intl.DisplayNames so they stay correct and localisable.
const ISO = (
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ ' +
  'CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR ' +
  'GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP ' +
  'KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT ' +
  'MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW ' +
  'SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG ' +
  'UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW'
).split(' ');

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

export const COUNTRIES: { code: string; name: string }[] = ISO.map(code => ({ code, name: regionNames.of(code) ?? code }))
  .sort((a, b) => a.name.localeCompare(b.name));

/** Countries most readers pick, shown first before a search narrows the list. */
export const POPULAR_COUNTRIES = ['IN', 'US', 'GB', 'SG', 'AE', 'CA', 'AU', 'DE', 'FR', 'JP', 'BR', 'ZA', 'NG', 'KE', 'ID'];

export const countryName = (code: string) => COUNTRIES.find(c => c.code === code)?.name ?? code;
export const countryCode = (name: string) => COUNTRIES.find(c => c.name === name)?.code;

export const EMPTY_FILTERS: Filters = { cov: [], cty: [], plc: [], top: [], typ: [] };

export function defaultPrefs(): Prefs {
  return {
    topics: [],
    countries: [],
    coverage: ['global', 'national'],
    radiusKm: 3,
    places: [],
    followTravel: false,
    filters: { ...EMPTY_FILTERS },
    notifications: { enabled: false, time: '08:00' },
    paceMs: null,
    theme: 'light',
    textSize: 'md',
    defaultView: 'swipe',
    haptics: true,
    reduceMotion: false,
    mutedSources: [],
    onboarded: false,
    updatedAt: 0,
  };
}

/** The filter sheet starts from what the reader chose during onboarding. */
export function filtersFromPrefs(p: Prefs): Filters {
  const local = p.coverage.some(c => c === 'state' || c === 'city' || c === 'hyper');
  const plc: string[] = [];
  for (const pl of p.places) {
    if (p.coverage.includes('city') && pl.city && !plc.includes(pl.city)) plc.push(pl.city);
    if (p.coverage.includes('hyper') && pl.area && !plc.includes(pl.area)) plc.push(pl.area);
  }
  return {
    cov: COVERAGE.filter(c => p.coverage.includes(c.k)).map(c => c.filter),
    cty: p.countries.map(countryName),
    plc,
    top: [...p.topics, ...(local ? LOCAL_TOPICS : [])],
    typ: [],
  };
}

export function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad, dLon = (bLon - aLon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Nearest saved place to a story, with the distance, or null when the story has no coordinates. */
export function nearestPlace(s: Pick<Story, 'lat' | 'lon'>, places: Place[]) {
  if (s.lat == null || s.lon == null || !places.length) return null;
  let best: { place: Place; km: number } | null = null;
  for (const place of places) {
    const km = haversineKm(place.lat, place.lon, s.lat, s.lon);
    if (!best || km < best.km) best = { place, km };
  }
  return best;
}

const LEVEL_FOR_FILTER: Record<string, Coverage> = Object.fromEntries(COVERAGE.map(c => [c.filter, c.k]));
const TYPE_FOR_FILTER: Record<string, StoryType> = Object.fromEntries(STORY_TYPES.map(t => [t.t, t.k]));

/**
 * Whether a story belongs in a reader's feed. Every filter group is "any" when empty and
 * multi-select otherwise; groups combine with AND, items within a group with OR.
 */
export function matchesFilters(s: Story, f: Filters, places: Place[]): boolean {
  if (f.cov.length && !f.cov.some(c => LEVEL_FOR_FILTER[c] === s.level)) return false;
  if (f.top.length && !f.top.includes(s.topic)) return false;
  if (f.typ.length) {
    const t = s.type === 'breaking' ? 'breaking' : s.type;
    if (!f.typ.some(x => TYPE_FOR_FILTER[x] === t)) return false;
  }
  if (s.level !== 'global' && f.cty.length && s.country) {
    if (!f.cty.some(n => countryCode(n) === s.country)) return false;
  }
  if (s.level === 'state' && places.length) {
    if (!places.some(p => p.region === s.region)) return false;
  }
  if (s.level === 'city') {
    if (f.plc.length) {
      if (!f.plc.includes(s.city ?? '')) return false;
    } else if (places.length && !places.some(p => p.city === s.city)) {
      return false;
    }
  }
  if (s.level === 'hyper') {
    // Hyperlocal needs a saved place within that place's radius…
    const near = nearestPlace(s, places);
    if (!near || near.km > near.place.radiusKm) return false;
    // …and, when places are filtered, the story's area (or its city) must be one of them.
    if (f.plc.length && !f.plc.some(n => n === s.area || n === s.city)) return false;
  }
  return true;
}

/** Headline size steps down as titles get longer, per the card spec. */
export const headlineSize = (title: string) => (title.length > 80 ? 26 : title.length > 60 ? 28 : 32);

export function timeAgo(iso: string, now = Date.now()) {
  const m = Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
  if (m < 1) return 'now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

/** The small location tag beside the category on local and hyperlocal cards. */
export function locationTag(s: Story): string | null {
  if (s.level === 'hyper' && s.area) {
    return s.distanceKm != null ? `${s.area} · ${s.distanceKm.toFixed(1)} km away` : s.area;
  }
  if (s.level === 'city' && s.city) return s.city;
  if (s.level === 'state' && s.region) return s.region;
  return null;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** 0–4 bars. Anything under 8 characters or without a number scores at most 1. */
export function passwordStrength(pw: string): number {
  if (!pw) return 0;
  if (pw.length < 8 || !/\d/.test(pw)) return 1;
  let s = 2;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (pw.length >= 12 || /[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(4, s);
}

export const PASSWORD_RULE = 'use at least 8 characters, including a number.';
export const isValidPassword = (pw: string) => pw.length >= 8 && /\d/.test(pw);
