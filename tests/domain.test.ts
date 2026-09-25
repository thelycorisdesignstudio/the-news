import { describe, it, expect } from 'vitest';
import {
  COUNTRIES, defaultPrefs, filtersFromPrefs, headlineSize, locationTag, matchesFilters, passwordStrength, timeAgo,
  type Place, type Story,
} from '../shared/domain';

const home: Place = { id: 'home', kind: 'home', label: 'Home', area: 'Indiranagar', city: 'Bengaluru', region: 'Karnataka', country: 'IN', lat: 12.9784, lon: 77.6408, radiusKm: 3 };
const base: Story = { id: 'x', cat: 'AI Models', topic: 'AI Models', title: 't', summary: 's', source: 'S', url: 'u', publishedAt: new Date().toISOString(), level: 'global', type: 'news' };
const any = { cov: [], cty: [], plc: [], top: [], typ: [] };

describe('domain', () => {
  it('lists every country with English names, sorted', () => {
    expect(COUNTRIES.length).toBeGreaterThan(240);
    expect(COUNTRIES.find(c => c.code === 'AE')?.name).toBe('United Arab Emirates');
    expect(COUNTRIES.map(c => c.name)).toEqual([...COUNTRIES.map(c => c.name)].sort((a, b) => a.localeCompare(b)));
  });

  it('seeds the filter sheet from onboarding choices', () => {
    const f = filtersFromPrefs({ ...defaultPrefs(), topics: ['AI Models'], countries: ['IN', 'US'], coverage: ['national', 'city', 'hyper'], places: [home] });
    expect(f).toEqual({ cov: ['National', 'City', 'Neighbourhood'], cty: ['India', 'United States'], plc: ['Bengaluru', 'Indiranagar'], top: ['AI Models', 'Transit', 'Civic', 'Weather', 'Events', 'Food'], typ: [] });
  });

  it('applies each filter group', () => {
    expect(matchesFilters(base, any, [])).toBe(true);
    expect(matchesFilters(base, { ...any, top: ['Robotics'] }, [])).toBe(false);
    expect(matchesFilters(base, { ...any, cov: ['National'] }, [])).toBe(false);
    expect(matchesFilters({ ...base, level: 'national', country: 'GB' }, { ...any, cty: ['India'] }, [])).toBe(false);
    expect(matchesFilters({ ...base, type: 'opinion' }, { ...any, typ: ['Opinion'] }, [])).toBe(true);
  });

  it('keeps hyperlocal stories inside each place radius', () => {
    const near: Story = { ...base, level: 'hyper', area: 'Indiranagar', city: 'Bengaluru', lat: 12.9676, lon: 77.6408 };
    const far: Story = { ...near, area: 'Whitefield', lat: 12.9716, lon: 77.748 };
    expect(matchesFilters(near, any, [home])).toBe(true);
    expect(matchesFilters(near, any, [{ ...home, radiusKm: 1 }])).toBe(false);
    expect(matchesFilters(far, any, [home])).toBe(false);
    expect(matchesFilters(near, any, [])).toBe(false);
    expect(matchesFilters(near, { ...any, plc: ['Whitefield'] }, [home])).toBe(false);
  });

  it('formats cards like the spec', () => {
    expect(headlineSize('x'.repeat(81))).toBe(26);
    expect(headlineSize('x'.repeat(70))).toBe(28);
    expect(headlineSize('x'.repeat(40))).toBe(32);
    expect(locationTag({ ...base, level: 'hyper', area: 'Indiranagar', distanceKm: 1.2 })).toBe('Indiranagar · 1.2 km away');
    expect(locationTag({ ...base, level: 'city', city: 'Bengaluru' })).toBe('Bengaluru');
    expect(locationTag(base)).toBeNull();
    expect(timeAgo(new Date(Date.now() - 40 * 60_000).toISOString())).toBe('40m ago');
    expect(timeAgo(new Date(Date.now() - 2 * 3600_000).toISOString())).toBe('2h ago');
  });

  it('scores passwords: weak under the rule, up to four bars', () => {
    expect(passwordStrength('short')).toBe(1);
    expect(passwordStrength('longpassword')).toBe(1);
    expect(passwordStrength('longpass123')).toBe(2);
    expect(passwordStrength('Longpass123')).toBe(3);
    expect(passwordStrength('Longpass123!')).toBe(4);
  });
});

describe('theme', () => {
  it('defaults to the light theme for every reader', () => {
    expect(defaultPrefs().theme).toBe('light');
  });
});
