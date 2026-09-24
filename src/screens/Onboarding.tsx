import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { COUNTRIES, COVERAGE, POPULAR_COUNTRIES, RADII, TOPICS, countryName, filtersFromPrefs, type Place, type Story } from '../../shared/domain';
import { Wordmark } from '../components/Brand';
import { Icon, type IconName } from '../components/Icon';
import { BackButton, B, Button, Check, Footer, LoaderBar, Segmented, StateMessage, StepHeader, T, Title } from '../components/ui';
import { api } from '../lib/api';
import { currentPosition, enableNotifications } from '../lib/device';
import { useStore } from '../lib/store';

const STEPS = ['/onboarding/topics', '/onboarding/countries', '/onboarding/coverage', '/onboarding/pace', '/onboarding/notifications'];

/** 03 · Welcome transition. Bridges account creation to topic selection (~1.5s). */
export function Transition() {
  const nav = useNavigate();
  useEffect(() => {
    const t = window.setTimeout(() => nav(STEPS[0], { replace: true }), 1500);
    return () => window.clearTimeout(t);
  }, [nav]);
  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <Wordmark size="md" />
      <span style={{ marginTop: 20, font: '400 13px/1 var(--font)', color: 'var(--gray)' }}>loading your feed.</span>
      <div style={{ marginTop: 16 }}><LoaderBar width={120} /></div>
    </div>
  );
}

/** 04 · Topic selection. Pick a third topic to unlock continue. Also used from Profile › Topics. */
export function Topics({ edit }: { edit?: boolean }) {
  const nav = useNavigate();
  const { prefs, updatePrefs } = useStore();
  const [sel, setSel] = useState<string[]>(prefs.topics);
  const ready = sel.length >= 3;
  const toggle = (t: string) => setSel(s => (s.includes(t) ? s.filter(x => x !== t) : [...s, t]));
  const done = () => {
    if (!ready) return;
    updatePrefs(p => ({
      topics: sel,
      // Keep the feed filter in step with what you follow; local topics (Transit, Civic…) stay as they were.
      filters: edit ? { ...p.filters, top: [...sel, ...p.filters.top.filter(t => !(TOPICS as readonly string[]).includes(t))] } : p.filters,
    }));
    if (edit) nav(-1);
    else nav(STEPS[1]);
  };
  return (
    <div className="screen">
      {edit ? <BackButton /> : <StepHeader step={1} onSkip={() => nav(STEPS[1])} onNext={done} nextEnabled={ready} />}
      <div style={{ position: 'absolute', top: T(128), left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0 24px' }}>
        <h2 style={{ margin: 0, font: '700 28px/1.25 var(--font)', letterSpacing: '-0.03em' }}>what do you follow?</h2>
        <p style={{ margin: '8px 0 0', font: '400 14px/1.6 var(--font)', color: 'var(--gray)' }}>pick at least three. you can change this anytime.</p>
      </div>
      <div className="no-scrollbar" style={{ position: 'absolute', top: T(232), left: 20, right: 20, bottom: B(120), overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
          {TOPICS.map(t => {
            const on = sel.includes(t);
            return (
              <button key={t} className={`chip${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => toggle(t)}>
                {on && <Icon name="tick" size={12} color="var(--signal)" style={{ animation: 'tnPop 200ms ease-out both' }} />}{t}
              </button>
            );
          })}
        </div>
      </div>
      <Footer style={{ alignItems: 'center' }}>
        <span aria-live="polite" style={{ font: '400 12px/1 var(--font)', color: 'var(--gray)' }}>{sel.length} selected</span>
        <Button disabled={!ready} onClick={done}>{edit ? 'save' : 'continue →'}</Button>
      </Footer>
    </div>
  );
}

export function CountryRow({ code, name, sel, home, onClick, highlight }: { code: string; name: string; sel: boolean; home?: boolean; onClick: () => void; highlight?: string }) {
  let label: React.ReactNode = name;
  if (highlight) {
    const i = name.toLowerCase().indexOf(highlight.toLowerCase());
    if (i >= 0) label = <>{name.slice(0, i)}<b style={{ fontWeight: 700 }}>{name.slice(i, i + highlight.length)}</b>{name.slice(i + highlight.length)}</>;
  }
  return (
    <button role="checkbox" aria-checked={sel} onClick={onClick} className="row-btn"
      style={{ height: 56, padding: '0 20px', borderBottom: '.5px solid var(--rule)', display: 'flex', alignItems: 'center', gap: 12, flex: 'none' }}>
      <span style={{ flex: 'none', width: 34, height: 24, borderRadius: 6, background: 'var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '700 11px/1 var(--font)', color: 'var(--ink)' }}>{code}</span>
      <span style={{ flex: 1, font: `${highlight ? 400 : 500} 15px/1 var(--font)`, color: 'var(--ink)' }}>{label}</span>
      {home && <span style={{ font: '500 12px/1 var(--font)', color: 'var(--gray)' }}>home</span>}
      <Check on={sel} />
    </button>
  );
}

/** Orders the country list: your picks, then popular ones, then everything else A–Z. */
export function useCountryList(q: string, selected: string[]) {
  return useMemo(() => {
    const n = q.trim().toLowerCase();
    if (n) {
      // Your picks first, then names that start with the query, then any other match.
      const score = (c: { code: string; name: string }) => {
        const name = c.name.toLowerCase();
        const pick = selected.indexOf(c.code);
        return (pick >= 0 ? pick : 100) + (name.startsWith(n) ? 0 : name.split(/[\s-]/).some(w => w.startsWith(n)) ? 200 : 400);
      };
      return COUNTRIES.filter(c => c.name.toLowerCase().includes(n) || c.code.toLowerCase() === n).sort((a, b) => score(a) - score(b) || a.name.localeCompare(b.name));
    }
    const rank = (code: string) => (selected.includes(code) ? selected.indexOf(code) : POPULAR_COUNTRIES.includes(code) ? 100 + POPULAR_COUNTRIES.indexOf(code) : 1000);
    return [...COUNTRIES].sort((a, b) => rank(a.code) - rank(b.code) || a.name.localeCompare(b.name));
    // Selection order is only applied on first render so rows don't jump while you tap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
}

/** Uses the device location to set the home place (and home country). */
export function useLocateHome() {
  const nav = useNavigate();
  const { updatePrefs, showToast, prefs } = useStore();
  const [busy, setBusy] = useState(false);
  const locate = async () => {
    setBusy(true);
    try {
      const pos = await currentPosition();
      const { place } = await api.reverse(pos.lat, pos.lon);
      const home: Place = { ...place, id: 'home', kind: 'home', label: 'Home', radiusKm: prefs.places.find(p => p.kind === 'home')?.radiusKm ?? prefs.radiusKm };
      updatePrefs(p => ({
        places: [home, ...p.places.filter(x => x.kind !== 'home')],
        countries: place.country ? [place.country, ...p.countries.filter(c => c !== place.country)] : p.countries,
      }));
      showToast(`found you in ${[place.area, place.city].filter((x, i, a) => x && a.indexOf(x) === i).join(', ')}.`);
    } catch (e) {
      if (e === 'denied' || e === 'unsupported') nav('/location-off');
      else showToast("couldn't find your location. try again, or search for your area.");
    } finally {
      setBusy(false);
    }
  };
  return { locate, busy };
}

/** 04b · Country. Search, multi-select; the first pick is home. */
export function Countries() {
  const nav = useNavigate();
  const { prefs, updatePrefs } = useStore();
  const [q, setQ] = useState('');
  const sel = prefs.countries;
  const rows = useCountryList(q, sel);
  const { locate, busy } = useLocateHome();
  const toggle = (code: string) => updatePrefs(p => ({ countries: p.countries.includes(code) ? p.countries.filter(c => c !== code) : [...p.countries, code] }));
  const n = sel.length;
  const next = () => n && nav(STEPS[2]);
  return (
    <div className="screen">
      <StepHeader step={2} onSkip={() => nav(STEPS[2])} onNext={next} nextEnabled={n > 0} />
      {/* One flowing column so a two-line title on narrow phones pushes the search down instead of under it. */}
      <div style={{ position: 'absolute', top: T(108), left: 0, right: 0, bottom: B(120), display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 8, flex: 'none' }}>
          <h2 style={{ margin: 0, font: '700 28px/1.15 var(--font)', letterSpacing: '-0.03em', color: 'var(--ink)' }}>where do you read from?</h2>
          <p style={{ margin: 0, font: '400 14px/1.6 var(--font)', color: 'var(--gray)', textWrap: 'pretty' }}>pick your home country, then any others you follow.</p>
        </div>
        <div style={{ margin: '19px 20px 0', display: 'flex', flexDirection: 'column', gap: 12, flex: 'none' }}>
          <div className="field" style={{ height: 48, borderRadius: 50 }}>
            <Icon name="search" size={18} color="var(--gray-2)" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="search countries" aria-label="search countries" autoComplete="off" />
            {q && <button className="link-btn" aria-label="clear search" onClick={() => setQ('')} style={{ display: 'flex' }}><Icon name="cancel-circle" size={18} color="var(--gray-2)" /></button>}
          </div>
          <button className="link-btn" onClick={locate} disabled={busy} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 4 }}>
            <Icon name={busy ? 'loading' : 'gps'} spin={busy} size={18} color="var(--signal)" />
            <span style={{ font: '600 14px/1 var(--font)', color: 'var(--signal)' }}>{busy ? 'finding you…' : 'use my current location'}</span>
          </button>
          <div className="no-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', minHeight: 28 }}>
            {sel.map((code, i) => (
              <button key={code} onClick={() => toggle(code)} aria-label={`remove ${countryName(code)}`}
                style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px 7px 12px', borderRadius: 50, background: 'var(--signal-tint)', border: '.5px solid var(--signal)', font: '600 13px/1 var(--font)', color: 'var(--signal)', cursor: 'pointer' }}>
                {countryName(code)}{i === 0 ? ' · home' : ''}<Icon name="cancel" size={13} color="var(--signal)" />
              </button>
            ))}
          </div>
        </div>
        <div className="no-scrollbar" style={{ marginTop: 22, flex: 1, minHeight: 120, overflowY: 'auto', borderTop: '.5px solid var(--rule)', display: 'flex', flexDirection: 'column', maskImage: 'linear-gradient(to bottom, #000 calc(100% - 28px), transparent)', WebkitMaskImage: 'linear-gradient(to bottom, #000 calc(100% - 28px), transparent)' }}>
          {rows.map(c => <CountryRow key={c.code} code={c.code} name={c.name} sel={sel.includes(c.code)} home={sel[0] === c.code} onClick={() => toggle(c.code)} highlight={q.trim() || undefined} />)}
          {!rows.length && (
            <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ font: '700 16px/1.3 var(--font)' }}>no countries match “{q}”.</span>
              <span style={{ font: '400 13px/1.5 var(--font)', color: 'var(--gray)' }}>check the spelling or try the English name.</span>
            </div>
          )}
        </div>
      </div>
      <Footer>
        <span aria-live="polite" style={{ textAlign: 'center', font: '400 12px/1 var(--font)', color: 'var(--gray)' }}>{n === 0 ? 'pick at least one country' : n === 1 ? '1 country' : `${n} countries`}</span>
        <Button disabled={!n} onClick={next}>continue →</Button>
      </Footer>
    </div>
  );
}

const COVERAGE_ICON: Record<string, IconName> = { earth: 'earth', flag: 'flag', 'maps-location': 'maps-location', city: 'city', 'location-user': 'location-user' };

/** 04c · Local coverage. Any mix of levels; a radius for neighbourhood. */
export function Coverage() {
  const nav = useNavigate();
  const { prefs, updatePrefs } = useStore();
  const { locate, busy } = useLocateHome();
  const home = prefs.places.find(p => p.kind === 'home') ?? prefs.places[0];
  const cov = prefs.coverage;
  const needsPlace = cov.some(c => c === 'state' || c === 'city' || c === 'hyper') && !home;
  const ok = cov.length > 0 && !needsPlace;
  const toggle = (k: (typeof COVERAGE)[number]['k']) => updatePrefs(p => ({ coverage: p.coverage.includes(k) ? p.coverage.filter(c => c !== k) : [...p.coverage, k] }));
  const setRadius = (r: number) => updatePrefs(p => ({ radiusKm: r, places: p.places.map(pl => (pl.id === home?.id ? { ...pl, radiusKm: r } : pl)) }));
  const desc = (k: string, d: string) => (k === 'state' && home?.region) || (k === 'city' && home?.city) || d;
  const next = () => ok && nav(STEPS[3]);
  return (
    <div className="screen">
      <StepHeader step={3} onSkip={() => nav(STEPS[3])} onNext={next} nextEnabled={ok} />
      <Title sub="choose every level you want in your feed.">how local should it get?</Title>
      <div className="no-scrollbar" style={{ position: 'absolute', top: T(208), left: 20, right: 20, bottom: B(120), overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {COVERAGE.map(c => {
          const on = cov.includes(c.k);
          return (
            <button key={c.k} role="checkbox" aria-checked={on} onClick={() => toggle(c.k)}
              style={{ flex: 'none', height: 64, padding: '0 16px', borderRadius: 12, background: on ? 'var(--signal-tint)' : 'var(--card)', border: `1px solid ${on ? 'var(--signal)' : 'var(--rule)'}`, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left', animation: on ? 'tnBounce 200ms ease-out' : undefined }}>
              <span style={{ flex: 'none', width: 36, height: 36, borderRadius: '50%', background: on ? 'var(--card)' : 'var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={COVERAGE_ICON[c.icon]} size={18} color={on ? 'var(--signal)' : 'var(--ink)'} />
              </span>
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ font: '600 15px/1 var(--font)', color: 'var(--ink)' }}>{c.t}</span>
                <span style={{ font: '400 12px/1.2 var(--font)', color: 'var(--gray)' }}>{desc(c.k, c.d)}</span>
              </span>
              <Check on={on} />
            </button>
          );
        })}
        {(cov.includes('hyper') || needsPlace) && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10, flex: 'none' }}>
            {home ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, font: '500 13px/1 var(--font)', color: 'var(--ink)' }}>
                  <Icon name="location" size={16} />{[home.area, home.city].filter((x, i, a) => x && a.indexOf(x) === i).join(', ')}
                </span>
                <button className="link-btn" onClick={() => nav('/places/add?kind=home')} style={{ font: '600 13px/1 var(--font)', color: 'var(--ink)' }}>change</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={{ font: '400 13px/1.4 var(--font)', color: 'var(--gray)' }}>local stories need your area.</span>
                <div style={{ display: 'flex', gap: 16 }}>
                  <button className="link-btn" onClick={locate} disabled={busy} style={{ display: 'flex', alignItems: 'center', gap: 6, font: '600 13px/1 var(--font)', color: 'var(--signal)' }}>
                    <Icon name={busy ? 'loading' : 'gps'} spin={busy} size={16} color="var(--signal)" />{busy ? 'finding you…' : 'use my location'}
                  </button>
                  <button className="link-btn" onClick={() => nav('/places/add?kind=home')} style={{ display: 'flex', alignItems: 'center', gap: 6, font: '600 13px/1 var(--font)', color: 'var(--ink)' }}>
                    <Icon name="search" size={16} />search
                  </button>
                </div>
              </div>
            )}
            {cov.includes('hyper') && home && (
              <Segmented label="neighbourhood radius" options={RADII.map(r => ({ v: r, t: `${r} km` }))} value={home.radiusKm} onChange={setRadius} />
            )}
          </div>
        )}
      </div>
      <Footer>
        <Button disabled={!ok} onClick={next}>continue →</Button>
      </Footer>
    </div>
  );
}

const PACE_STORY = {
  cat: 'AI Models', source: 'The Verge', time: '2h ago',
  title: 'OpenAI releases GPT-5 with reasoning capabilities that exceed PhD-level benchmarks',
  summary: "OpenAI's newest flagship model scored above human PhD experts on graduate-level science, math and coding benchmarks in the company's own evaluations. GPT-5 plans multi-step problems before answering and checks its work as it reasons. It is rolling out to paid ChatGPT users today, with developer API access next week. Independent researchers have not yet replicated the results.",
};

/** 05 · Pace calibration. The real nine-second timer, taught once. */
export function Pace() {
  const nav = useNavigate();
  const { updatePrefs } = useStore();
  const [start, setStart] = useState(() => performance.now());
  const [now, setNow] = useState(start);
  const [result, setResult] = useState<number | null>(null);
  useEffect(() => {
    if (result != null) return;
    const iv = window.setInterval(() => {
      const t = performance.now();
      setNow(t);
      if (t - start > 9300) window.clearInterval(iv);
    }, 100);
    return () => window.clearInterval(iv);
  }, [start, result]);
  const ms = result ?? now - start;
  const r = (result ?? 0) / 1000;
  const tap = () => {
    const t = performance.now();
    if (result == null) {
      setResult(t - start);
      updatePrefs({ paceMs: Math.round(t - start) });
    } else {
      setResult(null);
      setStart(t);
      setNow(t);
    }
  };
  const next = () => nav(STEPS[4]);
  return (
    <div className="screen">
      <StepHeader step={4} onSkip={next} onNext={next} nextEnabled={result != null} />
      <div style={{ position: 'absolute', top: T(112), left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0 24px' }}>
        <h2 style={{ margin: 0, font: '700 24px/1.25 var(--font)', letterSpacing: '-0.03em' }}>let's find your pace.</h2>
        <p style={{ margin: '8px 0 0', font: '400 14px/1.6 var(--font)', color: 'var(--gray)' }}>read this the way you normally would.</p>
      </div>
      <div className="card no-scrollbar" style={{ position: 'absolute', top: T(196), left: 20, right: 20, maxHeight: `calc(100% - ${T(196)} - var(--sb) - 116px)`, overflowY: 'auto', padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <div style={{ alignSelf: 'stretch', height: 2.5, borderRadius: 2, background: 'var(--rule)', overflow: 'hidden', flex: 'none' }}>
          <div style={{ height: '100%', width: `${Math.min(100, ms / 90)}%`, background: 'var(--signal)', transition: 'width 100ms linear' }} />
        </div>
        <span className="pill-cat" style={{ marginTop: 20 }}>{PACE_STORY.cat}</span>
        <h3 style={{ margin: '16px 0 0', font: '700 24px/1.25 var(--font)', letterSpacing: '-0.03em', color: 'var(--headline)', textWrap: 'pretty' }}>{PACE_STORY.title}</h3>
        <div style={{ width: 40, height: 1, background: 'var(--rule)', margin: '16px 0', flex: 'none' }} />
        <p style={{ margin: 0, font: '400 15px/1.7 var(--font)', color: 'var(--body)' }}>{PACE_STORY.summary}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
          <div style={{ width: 20, height: 20, borderRadius: 5, background: 'var(--rule)' }} />
          <span style={{ font: '500 13px/1 var(--font)' }}>{PACE_STORY.source}</span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--gray)' }} />
          <span style={{ font: '400 12px/1 var(--font)', color: 'var(--gray)' }}>{PACE_STORY.time}</span>
        </div>
      </div>
      <Footer style={{ alignItems: 'center' }}>
        {result != null && (
          <span aria-live="polite" style={{ font: '400 13px/1.5 var(--font)', color: 'var(--gray)', textAlign: 'center' }}>
            {r < 9 ? `${r.toFixed(1)} seconds. you read ahead of the timer, so swipe whenever you are ready.` : `${r.toFixed(1)} seconds. the nine-second rhythm suits you.`}
          </span>
        )}
        <Button variant="secondary" onClick={tap}>{result != null ? 'read it again' : "tap when you're done reading"}</Button>
      </Footer>
    </div>
  );
}

/** 06 · Notifications. In-app preview; the CTA triggers the OS dialog. */
export function Notifications() {
  const nav = useNavigate();
  const { prefs, updatePrefs, finishOnboarding, user, showToast } = useStore();
  const [top, setTop] = useState<Story | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api.feed(filtersFromPrefs(prefs), prefs.places).then(r => setTop(r.stories[0] ?? null)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const finish = () => {
    finishOnboarding();
    const local = prefs.coverage.some(c => c === 'city' || c === 'hyper') && prefs.places.length;
    nav(local ? '/onboarding/finding' : '/', { replace: true });
  };
  const allow = async () => {
    setBusy(true);
    const perm = await enableNotifications(!!user);
    setBusy(false);
    if (perm === 'granted') {
      updatePrefs({ notifications: { enabled: true, time: prefs.notifications.time, tz: Intl.DateTimeFormat().resolvedOptions().timeZone } });
    } else if (perm === 'denied') {
      showToast('notifications are off. you can turn them on in settings.');
    } else if (perm === 'unsupported') {
      showToast("this browser can't show notifications.");
    }
    finish();
  };
  const preview = top ? `${top.cat} · ${top.title}` : 'AI Models · OpenAI releases GPT-5 with reasoning capabilities that exceed PhD-level benchmarks';
  return (
    <div className="screen">
      <StepHeader step={5} onSkip={finish} hideNext />
      <div style={{ position: 'absolute', top: T(176), left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0 24px' }}>
        <h2 style={{ margin: 0, font: '700 24px/1.25 var(--font)', letterSpacing: '-0.03em' }}>one story a day, right on time.</h2>
        <p style={{ margin: '8px 0 0', maxWidth: 280, font: '400 14px/1.6 var(--font)', color: 'var(--gray)' }}>we'll send your most important story once daily. nothing else.</p>
      </div>
      <div style={{ position: 'absolute', top: T(320), left: 16, right: 16 }} aria-hidden>
        <div style={{ position: 'absolute', left: 14, right: 14, top: 16, height: 80, borderRadius: 12, background: 'var(--card)', boxShadow: '0 0 0 1px var(--rule)', opacity: 0.6 }} />
        <div style={{ position: 'relative', padding: '12px 14px', borderRadius: 12, background: 'var(--card)', boxShadow: '0 12px 32px rgba(10,10,10,.08), 0 0 0 1px var(--rule)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ flex: 'none', width: 38, height: 38, borderRadius: 9, background: 'var(--surface)', border: '1px solid var(--rule)', display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: 5, lineHeight: 1 }}>
            <span style={{ font: 'italic 400 10px/1 var(--font)', color: 'var(--gray)' }}>The</span>
            <span style={{ font: '800 12px/1 var(--font)', letterSpacing: '-.5px' }}>News</span>
          </div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ font: '600 13px/1.3 var(--font)' }}>The News</span>
              <span style={{ font: '400 12px/1.3 var(--font)', color: 'var(--gray)' }}>{prefs.notifications.time === '08:00' ? 'now' : prefs.notifications.time}</span>
            </div>
            <span style={{ font: '400 13px/1.4 var(--font)', color: 'var(--ink)' }}>{preview}</span>
          </div>
        </div>
      </div>
      <Footer gap={20} style={{ alignItems: 'center' }}>
        <Button loading={busy} onClick={allow}>allow notifications</Button>
        <button className="link-btn" onClick={finish} style={{ font: '500 14px/1 var(--font)', color: 'var(--gray)' }}>not now</button>
      </Footer>
    </div>
  );
}

/** L5 · Finding local stories. Shown after choosing places in onboarding. */
export function FindingLocal() {
  const nav = useNavigate();
  const { prefs } = useStore();
  const home = prefs.places.find(p => p.kind === 'home') ?? prefs.places[0];
  useEffect(() => {
    const started = Date.now();
    let alive = true;
    api.feed(prefs.filters, prefs.places).catch(() => null).finally(() => {
      window.setTimeout(() => alive && nav('/', { replace: true }), Math.max(0, 1900 - (Date.now() - started)));
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="screen">
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '0 32px', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--signal-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="radar" size={28} color="var(--signal)" style={{ animation: 'tnPulse 1.2s linear infinite' }} />
        </div>
        <h3 style={{ margin: '8px 0 0', font: '700 24px/1.2 var(--font)', letterSpacing: '-0.03em' }}>finding stories near {home?.area ?? 'you'}.</h3>
        <p style={{ margin: 0, font: '400 14px/1.6 var(--font)', color: 'var(--gray)' }}>checking local sources within {home?.radiusKm ?? prefs.radiusKm} km.</p>
        <LoaderBar width={120} />
      </div>
    </div>
  );
}

/** E5 · Location off. Hyperlocal needs location; offer a manual path. */
export function LocationOff() {
  const nav = useNavigate();
  const { showToast } = useStore();
  const { locate } = useLocateHome();
  const retry = async () => {
    const state = await navigator.permissions?.query({ name: 'geolocation' }).then(s => s.state).catch(() => 'prompt');
    if (state === 'denied') {
      showToast('allow location for this site in your browser or phone settings, then try again.');
      return;
    }
    await locate();
    nav(-1);
  };
  return (
    <div className="screen">
      <BackButton />
      <StateMessage icon="location-off" title="location is off." body="turn it on for neighbourhood stories, or choose a city yourself." />
      <Footer>
        <Button onClick={retry}>open settings</Button>
        <Button variant="secondary" onClick={() => nav('/places/add?kind=home', { replace: true })}>choose a city</Button>
      </Footer>
    </div>
  );
}
