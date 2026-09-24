import { ALL_TOPICS, COVERAGE, STORY_TYPES, countryName, type Filters, type Prefs } from '../../shared/domain';

export const uniq = (a: string[]) => [...new Set(a.filter(Boolean))];

export interface FilterGroup { k: keyof Filters; t: string; items: string[]; add?: string }

/** The five multi-select groups of the filter sheet (F1), shared by the phone sheet and the desktop drawer. */
export function filterGroups(prefs: Prefs): FilterGroup[] {
  const f = prefs.filters;
  return [
    { k: 'cov', t: 'Coverage', items: COVERAGE.map(c => c.filter) },
    { k: 'cty', t: 'Countries', items: uniq([...prefs.countries.map(countryName), ...f.cty]), add: '/countries/add' },
    { k: 'plc', t: 'Cities & areas', items: uniq([...prefs.places.flatMap(p => [p.city, p.area]), ...f.plc]), add: '/places/add' },
    { k: 'top', t: 'Topics', items: uniq([...prefs.topics, ...f.top, ...ALL_TOPICS]) },
    { k: 'typ', t: 'Story type', items: STORY_TYPES.map(t => t.t) },
  ];
}

export const toggleFilter = (k: keyof Filters, v: string) => (p: Prefs) =>
  ({ filters: { ...p.filters, [k]: p.filters[k].includes(v) ? p.filters[k].filter(x => x !== v) : [...p.filters[k], v] } });

export const NO_FILTERS: Filters = { cov: [], cty: [], plc: [], top: [], typ: [] };

export const showLabel = (count: number | null) =>
  count == null ? 'show stories' : count === 0 ? 'no stories match' : `show ${count} ${count === 1 ? 'story' : 'stories'}`;
