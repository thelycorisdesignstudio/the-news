import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { RADII, countryName, type Place } from '../../shared/domain';
import { Icon, type IconName } from '../components/Icon';
import { BackButton, Button, Footer, Segmented, Shimmer, Switch, T, Title, useStagger } from '../components/ui';
import { GlassBg } from '../components/Glass';
import { api } from '../lib/api';
import { currentPosition } from '../lib/device';
import { useStore } from '../lib/store';
import { CountryRow, useCountryList } from './Onboarding';

const placeName = (p: Pick<Place, 'area' | 'city'>) => [p.area, p.city].filter((x, i, a) => x && a.indexOf(x) === i).join(', ');

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="field" style={{ position: 'absolute', top: T(164), left: 20, right: 20, height: 48, borderRadius: 50 }}>
      <Icon name="search" size={18} color="var(--ink)" />
      <input autoFocus value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} autoComplete="off" />
      {value && <button className="link-btn" aria-label="clear search" onClick={() => onChange('')} style={{ display: 'flex' }}><Icon name="cancel-circle" size={18} color="var(--gray-2)" /></button>}
    </div>
  );
}

function NoResults({ what, q }: { what: string; q: string }) {
  return (
    <div style={{ position: 'absolute', top: T(260), left: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 8 }} role="status">
      <Icon name="search-remove" size={28} color="var(--gray-2)" />
      <span style={{ marginTop: 8, font: '700 18px/1.3 var(--font)' }}>no {what} match “{q}”.</span>
      <span style={{ font: '400 14px/1.6 var(--font)', color: 'var(--gray)' }}>{what === 'countries' ? "check the spelling or try the country's English name." : 'check the spelling, or search for the nearest city.'}</span>
    </div>
  );
}

/** F2 · Add countries (from "add" in the filter sheet, or Profile › Countries). E7 when nothing matches. */
export function AddCountries() {
  const nav = useNavigate();
  const { prefs, updatePrefs } = useStore();
  const [q, setQ] = useState('');
  const rows = useCountryList(q, prefs.countries);
  const sel = prefs.countries;
  const toggle = (code: string) => updatePrefs(p => {
    const on = !p.countries.includes(code);
    const name = countryName(code);
    return {
      countries: on ? [...p.countries, code] : p.countries.filter(c => c !== code),
      // Following a country also includes it in the feed filter; unfollowing removes it.
      filters: { ...p.filters, cty: on ? [...p.filters.cty.filter(n => n !== name), name] : p.filters.cty.filter(n => n !== name) },
    };
  });
  const summary = sel.length ? `${countryName(sel[0])} (home)${sel.length > 1 ? ` + ${sel.length - 1} more selected` : ''}` : 'no countries selected';
  const n = q.trim();
  return (
    <div className="screen">
      <BackButton />
      <button className="link-btn" onClick={() => nav(-1)} style={{ position: 'absolute', top: T(68), right: 20, font: '600 15px/1 var(--font)', color: 'var(--signal)' }}>done</button>
      <Title>add countries.</Title>
      <SearchBox value={q} onChange={setQ} placeholder="search countries" />
      {n && !rows.length ? <NoResults what="countries" q={n} /> : (
        <>
          <span className="eyebrow" style={{ position: 'absolute', top: T(232), left: 20 }}>{n ? `${rows.length} result${rows.length === 1 ? '' : 's'}` : 'all countries'}</span>
          <div className="no-scrollbar" style={{ position: 'absolute', top: T(256), left: 0, right: 0, bottom: 'calc(var(--sb) + 56px)', overflowY: 'auto', borderTop: '.5px solid var(--rule)', display: 'flex', flexDirection: 'column', maskImage: 'linear-gradient(to bottom, #000 calc(100% - 28px), transparent)', WebkitMaskImage: 'linear-gradient(to bottom, #000 calc(100% - 28px), transparent)' }}>
            {rows.map(c => <CountryRow key={c.code} code={c.code} name={c.name} sel={sel.includes(c.code)} home={sel[0] === c.code} highlight={n || undefined} onClick={() => toggle(c.code)} />)}
          </div>
        </>
      )}
      <Footer bottom={56}><span style={{ textAlign: 'center', font: '400 12px/1 var(--font)', color: 'var(--gray)' }}>{summary}</span></Footer>
    </div>
  );
}

const KIND_ICON: Record<Place['kind'], IconName> = { home: 'home', work: 'building', current: 'location-user', other: 'location' };

/** F3 · Your places. Saved places power hyperlocal; each has its own radius. */
export function Places() {
  const nav = useNavigate();
  const { prefs, updatePrefs } = useStore();
  const stagger = useStagger();
  return (
    <div className="screen">
      <BackButton />
      <Title sub="neighbourhood stories come from around these.">your places.</Title>
      <div className={`no-scrollbar ${stagger}`} style={{ position: 'absolute', top: T(212), left: 20, right: 20, bottom: 'calc(var(--sb) + 130px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {prefs.places.map(p => (
          <button key={p.id} className="card row-btn frost" onClick={() => nav(`/places/${p.id}`)} style={{ flex: 'none', padding: 16, display: 'flex', alignItems: 'center', gap: 12, background: 'var(--card)', border: '1px solid var(--rule)' }}>
            <span style={{ flex: 'none', width: 36, height: 36, borderRadius: '50%', background: 'var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={KIND_ICON[p.kind]} size={18} /></span>
            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ font: '600 15px/1 var(--font)', color: 'var(--ink)' }}>{p.label}</span>
              <span style={{ font: '400 13px/1.2 var(--font)', color: 'var(--gray)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{placeName(p)}</span>
            </span>
            <span style={{ padding: '6px 10px', borderRadius: 50, background: 'var(--rule)', font: '600 12px/1 var(--font)', color: 'var(--ink)' }}>{p.radiusKm} km</span>
            <Icon name="arrow-right" size={18} color="var(--gray-2)" />
          </button>
        ))}
        {!prefs.places.length && <p style={{ margin: 0, font: '400 14px/1.6 var(--font)', color: 'var(--gray)' }}>no places yet. add your home or work to get neighbourhood stories.</p>}
        <button className="link-btn" onClick={() => nav('/places/add')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 4px', flex: 'none' }}>
          <Icon name="add" size={18} color="var(--signal)" /><span style={{ font: '600 14px/1 var(--font)', color: 'var(--signal)' }}>add a place</span>
        </button>
      </div>
      <div className="card" style={{ position: 'absolute', left: 20, right: 20, bottom: 'calc(var(--sb) + 22px)', padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ font: '600 15px/1.2 var(--font)' }}>follow me when I travel</span>
          <span style={{ font: '400 12px/1.4 var(--font)', color: 'var(--gray)' }}>adds stories near your current location</span>
        </span>
        <Switch label="follow me when I travel" on={prefs.followTravel} onChange={v => updatePrefs({ followTravel: v })} />
      </div>
    </div>
  );
}

/** One place: its range, and removal. */
export function PlaceDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { prefs, updatePrefs } = useStore();
  const place = prefs.places.find(p => p.id === id);
  useEffect(() => { if (!place) nav('/places', { replace: true }); }, [place, nav]);
  if (!place) return null;
  const set = (patch: Partial<Place>) => updatePrefs(p => ({ places: p.places.map(x => (x.id === place.id ? { ...x, ...patch } : x)) }));
  const remove = () => {
    updatePrefs(p => ({
      places: p.places.filter(x => x.id !== place.id),
      filters: { ...p.filters, plc: p.filters.plc.filter(n => n !== place.area || p.places.some(x => x.id !== place.id && (x.area === n || x.city === n))) },
    }));
    nav(-1);
  };
  return (
    <div className="screen">
      <BackButton />
      <Title sub={`${placeName(place)}${place.region && place.region !== place.city ? `, ${place.region}` : ''} · ${countryName(place.country)}`}>{place.label.toLowerCase()}.</Title>
      <div style={{ position: 'absolute', top: T(212), left: 20, right: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span className="eyebrow">range</span>
        <Segmented label="range" options={RADII.map(r => ({ v: r, t: `${r} km` }))} value={place.radiusKm} onChange={r => set({ radiusKm: r })} />
        <span style={{ font: '400 13px/1.5 var(--font)', color: 'var(--gray)' }}>neighbourhood stories within {place.radiusKm} km of {place.area} show up in your feed.</span>
        {place.kind !== 'home' && (
          <div style={{ marginTop: 12 }}>
            <span className="eyebrow">label</span>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {(['work', 'other'] as const).map(k => (
                <button key={k} className={`chip-sm lg${place.kind === k ? ' is-on' : ''}`} onClick={() => set({ kind: k, label: k === 'work' ? 'Work' : place.area })}><GlassBg />{k === 'work' ? 'Work' : place.area}</button>
              ))}
            </div>
          </div>
        )}
      </div>
      <Footer>
        {place.kind === 'home'
          ? <Button variant="secondary" onClick={() => nav('/places/add?kind=home')}>change home</Button>
          : <Button variant="secondary" onClick={remove}>remove place</Button>}
      </Footer>
    </div>
  );
}

type Found = Omit<Place, 'id' | 'kind' | 'label' | 'radiusKm'>;

/** Search for a neighbourhood or city. `?kind=home` replaces the home place. */
export function AddPlace() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const asHome = params.get('kind') === 'home';
  const { prefs, updatePrefs, showToast } = useStore();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Found[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    const n = q.trim();
    if (!n) { setResults(null); setSearching(false); return; }
    let alive = true;
    setSearching(true);
    const t = window.setTimeout(() => {
      api.searchPlaces(n).then(r => alive && setResults(r.places)).catch(() => alive && setResults([])).finally(() => alive && setSearching(false));
    }, 200);
    return () => { alive = false; window.clearTimeout(t); };
  }, [q]);

  const pick = (f: Found, kind: Place['kind'] = asHome || !prefs.places.length ? 'home' : 'other') => {
    const existing = prefs.places.find(p => p.kind === kind && (kind === 'home' || kind === 'current'));
    const place: Place = {
      ...f, kind, id: kind === 'home' ? 'home' : kind === 'current' ? 'current' : `p${Date.now().toString(36)}`,
      label: kind === 'home' ? 'Home' : kind === 'current' ? 'Current location' : f.area,
      radiusKm: existing?.radiusKm ?? prefs.radiusKm,
    };
    updatePrefs(p => ({
      places: kind === 'home' ? [place, ...p.places.filter(x => x.kind !== 'home')] : kind === 'current' ? [...p.places.filter(x => x.kind !== 'current'), place] : [...p.places, place],
      countries: place.country && !p.countries.includes(place.country) ? (kind === 'home' ? [place.country, ...p.countries] : [...p.countries, place.country]) : p.countries,
      // A new place joins the "Cities & areas" filter when that filter is in use.
      filters: p.filters.plc.length ? { ...p.filters, plc: [...new Set([...p.filters.plc, place.area, place.city])] } : p.filters,
    }));
    showToast(`${placeName(place)} added.`);
    nav(-1);
  };

  const locate = async () => {
    setLocating(true);
    try {
      const pos = await currentPosition();
      const r = await api.reverse(pos.lat, pos.lon);
      pick(r.place, asHome ? 'home' : 'current');
    } catch (e) {
      if (e === 'denied' || e === 'unsupported') nav('/location-off');
      else showToast("couldn't find your location. search instead.");
    } finally {
      setLocating(false);
    }
  };

  const n = q.trim();
  return (
    <div className="screen">
      <BackButton />
      <Title>{asHome ? 'where is home?' : 'add a place.'}</Title>
      <SearchBox value={q} onChange={setQ} placeholder="search neighbourhoods and cities" />
      {n && results && !results.length && !searching ? <NoResults what="places" q={n} /> : (
        <div className="no-scrollbar" style={{ position: 'absolute', top: T(232), left: 0, right: 0, bottom: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {!n && (
            <button className="row-btn" onClick={locate} disabled={locating} style={{ height: 56, padding: '0 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '.5px solid var(--rule)', flex: 'none' }}>
              <Icon name={locating ? 'loading' : 'gps'} spin={locating} size={18} color="var(--signal)" />
              <span style={{ font: '600 14px/1 var(--font)', color: 'var(--signal)' }}>{locating ? 'finding you…' : 'use my current location'}</span>
            </button>
          )}
          {n && searching && !results?.length && [0, 1, 2, 3].map(i => (
            <div key={i} aria-hidden style={{ minHeight: 64, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '.5px solid var(--rule)', flex: 'none' }}>
              <Shimmer w={36} h={36} r={18} />
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}><Shimmer w={`${60 - i * 8}%`} h={14} r={7} /><Shimmer w={`${42 + i * 5}%`} h={10} r={5} /></span>
            </div>
          ))}
          {n && searching && !results?.length && <span className="sr-only" role="status">searching places…</span>}
          {results?.map(r => {
            const i = r.area.toLowerCase().indexOf(n.toLowerCase());
            return (
              <button key={`${r.area}-${r.city}-${r.lat}`} className="row-btn" onClick={() => pick(r)} style={{ minHeight: 64, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '.5px solid var(--rule)', flex: 'none' }}>
                <span style={{ flex: 'none', width: 36, height: 36, borderRadius: '50%', background: 'var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={r.area === r.city ? 'city' : 'location'} size={18} /></span>
                <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ font: '400 15px/1.2 var(--font)', color: 'var(--ink)' }}>
                    {i >= 0 ? <>{r.area.slice(0, i)}<b style={{ fontWeight: 700 }}>{r.area.slice(i, i + n.length)}</b>{r.area.slice(i + n.length)}</> : r.area}
                  </span>
                  <span style={{ font: '400 12px/1.2 var(--font)', color: 'var(--gray)' }}>{[r.area !== r.city ? r.city : null, r.region, countryName(r.country)].filter(Boolean).join(', ')}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
