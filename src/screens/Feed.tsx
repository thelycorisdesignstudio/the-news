import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RADII, STORY_SECONDS, filtersFromPrefs, locationTag, timeAgo, type Filters, type Story } from '../../shared/domain';
import { Chevron, FeedCard, FeedNav, FeedSkeleton, FeedStateCard, ProgressTrack, type NavHandlers, type View } from '../components/FeedCard';
import { Icon } from '../components/Icon';
import { Wordmark } from '../components/Brand';
import { Button, EditorialMark, Footer, Sheet, Shimmer, StateMessage, T } from '../components/ui';
import { api, ApiError } from '../lib/api';
import { shareStory } from '../lib/device';
import { haptic, useDoubleTap, useSnapPager } from '../lib/pager';
import { useFeed } from '../lib/feed';
import { filterGroups, showLabel, toggleFilter, uniq } from '../lib/filters';
import { useStore } from '../lib/store';
import { Stat } from './Launch';

const MS = STORY_SECONDS * 1000;
const clock = (t: number) => { const d = new Date(t); return `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`; };

export function Feed({ filtersOpen }: { filtersOpen?: boolean }) {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const { prefs, online, showToast, markRead } = useStore();
  const feed = useFeed(prefs.filters, prefs.places, !!filtersOpen);
  const stories = feed.stories;
  const [view, setView] = useState<View>('swipe');
  const [reader, setReader] = useState<Story | null>(null);

  // Queue position and the nine-second timer are shared by the swipe and list views.
  const [idx, setIdx] = useState(0);
  const [start, setStart] = useState(() => performance.now());
  const [now, setNow] = useState(start);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const queueKey = stories.map(s => s.id).join(',');
  useEffect(() => {
    setIdx(0);
    setDone({});
    const t = performance.now();
    setStart(t);
    setNow(t);
  }, [queueKey]);

  useEffect(() => {
    const cur = stories[idx];
    if (!cur || done[cur.id] || view !== 'swipe') return;
    const iv = window.setInterval(() => {
      const t = performance.now();
      setNow(t);
      if (t - start > MS + 300) window.clearInterval(iv);
    }, 100);
    return () => window.clearInterval(iv);
  }, [idx, start, done, stories, view]);

  // A story counts as read after three seconds on screen.
  useEffect(() => {
    const cur = stories[idx];
    if (!cur || cur.removed || view !== 'swipe') return;
    const t = window.setTimeout(() => markRead(cur), 3000);
    return () => window.clearTimeout(t);
  }, [idx, stories, view, markRead]);

  const pct = Math.min(100, Math.max(0, (now - start) / (MS / 100)));
  const track = stories.map((s, i) => (done[s.id] ? 100 : i === idx ? pct : 0));

  const goTo = useCallback((i: number) => {
    if (i === idx) return;
    const t = performance.now();
    setDone(d => {
      const next = { ...d };
      // Moving on snaps everything behind you to full.
      for (let k = 0; k < Math.min(i, stories.length); k++) next[stories[k].id] = true;
      return next;
    });
    setIdx(i);
    setStart(t);
    setNow(t);
    setReader(null);
  }, [idx, stories]);

  // Deep link: /?story=<id> opens the reader sheet.
  useEffect(() => {
    const id = params.get('story');
    if (!id) return;
    params.delete('story');
    setParams(params, { replace: true });
    api.story(id).then(r => setReader(r.story)).catch(() => showToast('that story is no longer available.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navHandlers: NavHandlers = { onProfile: () => nav('/profile'), onFilter: () => nav('/filters'), onView: setView };
  const staleText = feed.stale && feed.fetchedAt
    ? `${!online || feed.error?.offline ? 'no connection' : "couldn't refresh"} · showing stories from ${clock(feed.fetchedAt)}`
    : null;

  let body: React.ReactNode;
  if (feed.status === 'loading') body = view === 'swipe' ? <FeedSkeleton nav={navHandlers} /> : <ListSkeleton />;
  else if (feed.status === 'offline') body = <OfflineState onRetry={feed.refresh} />;
  else if (feed.status === 'error') body = <LoadError error={feed.error} onRetry={feed.refresh} />;
  else if (!stories.length) body = <EmptyFeed nav={navHandlers} />;
  else if (view === 'list') body = <ListView stories={stories} track={track} nav={navHandlers} onRead={setReader} />;
  else body = <SwipeFeed stories={stories} idx={idx} track={track} pct={pct} done={done} goTo={goTo} nav={navHandlers} onRead={setReader} onRefresh={feed.refresh} />;

  return (
    <div className="screen">
      {body}
      {staleText && (
        <div role="status" className="toast" style={{ position: 'absolute', top: T(108), left: '50%', transform: 'translateX(-50%)', zIndex: 6, display: 'flex', alignItems: 'center', gap: 6, animation: 'tnFade 150ms ease-out' }}>
          <Icon name="wifi-off" size={14} color="var(--toast-fg)" />{staleText}
        </div>
      )}
      {reader && <ReaderSheet story={reader} onClose={() => setReader(null)} />}
      {filtersOpen && <FilterSheet onClose={() => nav('/', { replace: true })} />}
    </div>
  );
}

/* ---------------- swipe ---------------- */

function SwipeFeed({ stories, idx, track, pct, done, goTo, nav, onRead, onRefresh }: {
  stories: Story[]; idx: number; track: number[]; pct: number; done: Record<string, boolean>; goTo: (i: number) => void;
  nav: NavHandlers; onRead: (s: Story) => void; onRefresh: () => Promise<void>;
}) {
  const { isLiked, isSaved, toggleLike, toggleSave, showToast } = useStore();
  const ref = useRef<HTMLDivElement>(null);
  const [toastFor, setToastFor] = useState<string | null>(null);
  const [tipFor, setTipFor] = useState<string | null>(null);
  const [burstFor, setBurstFor] = useState<string | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullStart = useRef<number | null>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(t => window.clearTimeout(t)), []);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  // Restore the position when coming back from the list view.
  useEffect(() => {
    const el = ref.current;
    if (el && idx) el.scrollTo({ top: idx * el.clientHeight });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One gesture, one story: stories plus the caught-up card are the pages.
  const { page, animateTo } = useSnapPager(ref, stories.length + 1);
  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    goTo(Math.round(el.scrollTop / el.clientHeight));
  };
  const scrollToIdx = (i: number) => animateTo(i);

  // A light tick each time a new story settles, like the feed apps people already know.
  const prevIdx = useRef(idx);
  useEffect(() => {
    if (prevIdx.current !== idx) haptic(idx >= stories.length ? 'success' : 'tick');
    prevIdx.current = idx;
  }, [idx, stories.length]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, [role="dialog"]')) return;
      if (e.key === 'ArrowDown' || e.key === 'j' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); page(1); }
      if (e.key === 'ArrowUp' || e.key === 'k' || e.key === 'PageUp') { e.preventDefault(); page(-1); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [page]);

  const like = (s: Story) => {
    const on = !isLiked(s.id);
    toggleLike(s);
    haptic(on ? 'like' : 'tick');
    if (on) { setBurstFor(s.id); later(() => setBurstFor(b => (b === s.id ? null : b)), 400); }
  };
  const save = (s: Story) => {
    const on = toggleSave(s);
    haptic(on ? 'save' : 'tick');
    setToastFor(on ? s.id : null);
    if (on) later(() => setToastFor(t => (t === s.id ? null : t)), 1800);
  };

  // Double-tap anywhere on a story to like it; the heart pops where you tapped.
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const doubleTap = useDoubleTap((x, y) => {
    const s = stories[idx];
    if (!s || s.removed) return;
    if (!isLiked(s.id)) like(s);
    else haptic('like');
    const id = Date.now();
    setHearts(h => [...h, { id, x, y }]);
    later(() => setHearts(h => h.filter(v => v.id !== id)), 900);
  });
  const share = async (s: Story) => {
    const r = await shareStory(s);
    if (r === 'copied') { setTipFor(s.id); later(() => setTipFor(t => (t === s.id ? null : t)), 1400); }
    if (r === 'failed') showToast("couldn't copy the link.");
  };

  // L4 · Pull down on the first card to check for new stories.
  const onTouchStart = (e: React.TouchEvent) => { pullStart.current = (ref.current?.scrollTop ?? 1) <= 0 ? e.touches[0].clientY : null; };
  const onTouchMove = (e: React.TouchEvent) => {
    if (pullStart.current == null || refreshing) return;
    const dy = e.touches[0].clientY - pullStart.current;
    setPull(dy > 0 ? Math.min(90, dy * 0.5) : 0);
  };
  const onTouchEnd = async () => {
    pullStart.current = null;
    if (pull > 56 && !refreshing) {
      setRefreshing(true);
      setPull(64);
      await onRefresh().catch(() => {});
      setRefreshing(false);
    }
    setPull(0);
  };

  const timeUp = !!(stories[idx] && (done[stories[idx].id] || pct >= 100));
  const savedHere = stories.filter(s => isSaved(s.id)).length;
  const now = Date.now();

  return (
    <>
      {pull > 0 && (
        <div style={{ position: 'absolute', top: T(60), left: 0, right: 0, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} role="status">
          <Icon name="loading" size={18} color="var(--signal)" spin={refreshing} style={{ transform: refreshing ? undefined : `rotate(${pull * 4}deg)` }} />
          <span style={{ font: '500 13px/1 var(--font)', color: 'var(--gray)' }}>{refreshing ? 'checking for new stories' : pull > 56 ? 'release to refresh' : 'pull to refresh'}</span>
        </div>
      )}
      <div ref={ref} onScroll={onScroll} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} {...doubleTap} className="no-scrollbar pager" aria-label="today's stories"
        style={{ position: 'absolute', inset: 0, transform: pull ? `translateY(${pull}px)` : undefined, transition: pullStart.current == null ? 'transform 200ms' : 'none', borderRadius: pull ? '20px 20px 0 0' : undefined, boxShadow: pull ? '0 -1px 0 var(--rule)' : undefined }}>
        {stories.map((s, i) => (
          <div key={s.id} style={{ position: 'relative', height: '100%', scrollSnapAlign: 'start', scrollSnapStop: 'always' }} aria-hidden={i !== idx || undefined}>
            {Math.abs(i - idx) <= 2 && (s.removed ? (
              <FeedStateCard track={track} nav={nav}>
                <StateMessage icon="news" title="this story is no longer available." body="the publisher removed it. swipe up for the next one." />
                <Chevron state="loop" />
              </FeedStateCard>
            ) : (
              <FeedCard story={s} track={track} now={now} {...nav}
                liked={isLiked(s.id)} saved={isSaved(s.id)} burst={burstFor === s.id ? 'anim' : 'none'}
                toast={toastFor === s.id ? 'saved to reading list' : ''} shareTip={tipFor === s.id}
                chev={i === idx && timeUp ? 'pulse' : 'none'}
                onLike={() => like(s)} onSave={() => save(s)} onShare={() => share(s)} onRead={() => onRead(s)} />
            ))}
          </div>
        ))}
        <div style={{ position: 'relative', height: '100%', scrollSnapAlign: 'start' }}>
          <CaughtUp segments={stories.length} count={stories.filter(s => !s.removed).length} saved={savedHere} onTop={() => scrollToIdx(0)} />
        </div>
      </div>
      {hearts.map(h => (
        <div key={h.id} aria-hidden style={{ position: 'absolute', left: h.x - 48, top: h.y - 48, width: 96, height: 96, borderRadius: '50%', background: 'color-mix(in srgb, var(--alert-tint) 92%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 8, animation: 'tnHeartPop 850ms cubic-bezier(.2,.8,.2,1) forwards', boxShadow: '0 12px 32px rgba(255,59,59,.18)' }}>
          <Icon name="favourite" size={52} color="var(--alert)" />
        </div>
      ))}
    </>
  );
}

/** 13 · You're caught up. Final card of the day's queue. */
function CaughtUp({ segments, count, saved, onTop }: { segments: number; count: number; saved: number; onTop: () => void }) {
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <ProgressTrack track={Array(segments).fill(100)} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px', textAlign: 'center' }}>
        <EditorialMark />
        <h3 style={{ margin: '24px 0 0', font: '700 24px/1.25 var(--font)', letterSpacing: '-0.03em' }}>you're caught up.</h3>
        <p style={{ margin: '8px 0 0', maxWidth: 260, font: '400 14px/1.6 var(--font)', color: 'var(--gray)' }}>that's everything for today. nine seconds at a time.</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 32 }}>
          <Stat v={count} l="stories" />
          <div style={{ width: 1, height: 32, background: 'var(--rule)' }} />
          <Stat v={count * STORY_SECONDS} l="seconds" />
          <div style={{ width: 1, height: 32, background: 'var(--rule)' }} />
          <Stat v={saved} l="saved" />
        </div>
        <button onClick={onTop} style={{ marginTop: 32, padding: '14px 28px', border: 0, borderRadius: 50, background: 'var(--signal)', color: '#FFFFFF', font: '600 14px/1 var(--font)', cursor: 'pointer' }}>back to top</button>
      </div>
    </div>
  );
}

/* ---------------- list ---------------- */

/** 14 · List view. For scanning; swipe stays the default on launch. */
function ListView({ stories, track, nav, onRead }: { stories: Story[]; track: number[]; nav: NavHandlers; onRead: (s: Story) => void }) {
  const [cat, setCat] = useState<string | null>(null);
  const cats = useMemo(() => [...new Set(stories.filter(s => !s.removed).map(s => s.cat))], [stories]);
  const now = Date.now();
  const rows = stories.map((s, i) => ({ s, prog: track[i] })).filter(r => !r.s.removed && (!cat || r.s.cat === cat));
  const chip = (on: boolean) => ({ flex: 'none', padding: '8px 14px', borderRadius: 50, border: 0, background: on ? 'var(--signal)' : 'var(--rule)', color: on ? '#FFFFFF' : 'var(--ink)', font: '600 13px/1 var(--font)', cursor: 'pointer' } as const);
  return (
    <>
      <FeedNav {...nav} view="list" showFilter={false} top={62} />
      <div className="no-scrollbar" role="tablist" style={{ position: 'absolute', top: T(108), left: 0, right: 0, display: 'flex', gap: 8, padding: '0 20px', overflowX: 'auto' }}>
        <button role="tab" aria-selected={!cat} style={chip(!cat)} onClick={() => setCat(null)}>All</button>
        {cats.map(c => <button key={c} role="tab" aria-selected={cat === c} style={chip(cat === c)} onClick={() => setCat(c)}>{c}</button>)}
      </div>
      <div className="no-scrollbar" style={{ position: 'absolute', top: T(156), left: 0, right: 0, bottom: 0, overflowY: 'auto', padding: '0 16px', paddingBottom: 'calc(var(--sb) + 16px)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map(({ s, prog }) => (
          <button key={s.id} onClick={() => onRead(s)} className="card row-btn frost" style={{ flex: 'none', padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, border: '1px solid var(--rule)', background: 'var(--card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className="pill-cat" style={{ padding: '4px 8px', fontSize: 10 }}>{s.cat}</span>
              {s.type === 'breaking' && <span style={{ padding: '4px 8px', borderRadius: 50, background: 'var(--alert)', color: '#FFFFFF', font: '700 10px/1.2 var(--font)', letterSpacing: '.12em', textTransform: 'uppercase' }}>Breaking</span>}
              {locationTag(s) && <span style={{ font: '500 11px/1 var(--font)', color: 'var(--gray)' }}>{locationTag(s)}</span>}
            </div>
            <h4 style={{ margin: 0, font: '700 20px/1.25 var(--font)', letterSpacing: '-0.03em', color: 'var(--headline)', textWrap: 'pretty' }}>{s.title}</h4>
            <p style={{ margin: 0, font: '400 13px/1.5 var(--font)', color: 'var(--gray)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.summary}</p>
            <div style={{ alignSelf: 'stretch', display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
              <span style={{ flex: 'none', font: '500 12px/1 var(--font)', color: 'var(--ink)' }}>{s.source} <span style={{ color: 'var(--gray)', fontWeight: 400 }}>· {timeAgo(s.publishedAt, now)}</span></span>
              <div style={{ flex: 1, height: 2, borderRadius: 1, background: 'var(--rule)', overflow: 'hidden' }}><div style={{ height: '100%', width: `${prog}%`, background: 'var(--signal)' }} /></div>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

/** L2 · List view skeleton. Four placeholder cards. */
function ListSkeleton() {
  return (
    <div aria-busy="true" aria-label="loading stories">
      <div style={{ position: 'absolute', top: T(62), left: 20, right: 20, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Wordmark size="xs" />
      </div>
      <div style={{ position: 'absolute', top: T(112), left: 20, right: 20, display: 'flex', gap: 8 }}>
        <Shimmer w={48} h={30} /><Shimmer w={90} h={30} /><Shimmer w={80} h={30} /><Shimmer w={70} h={30} />
      </div>
      <div style={{ position: 'absolute', top: T(160), left: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Shimmer w={72} h={18} /><Shimmer w="100%" h={20} /><Shimmer w="70%" h={20} />
            <Shimmer w="100%" h={12} r={6} /><Shimmer w="84%" h={12} r={6} />
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><Shimmer w={110} h={12} r={6} /><Shimmer w="100%" h={2} r={1} style={{ flex: 1 }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- reader ---------------- */

/** 15 · Reader sheet, with L3's loading context while the extra paragraphs arrive. */
export function ReaderSheet({ story, onClose }: { story: Story; onClose: () => void }) {
  const [full, setFull] = useState<Story | null>(story.more ? story : null);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    let alive = true;
    api.story(story.id)
      .then(r => alive && setFull(r.story))
      .catch(e => { if (!alive) return; if (e instanceof ApiError && (e.status === 410 || e.status === 404)) setGone(true); else setFull({ ...story, more: [] }); });
    return () => { alive = false; };
  }, [story]);
  const s = full ?? story;
  return (
    <Sheet onClose={onClose} label={s.title}>
      <div style={{ padding: '8px 24px 64px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <span className="pill-cat">{s.cat}</span>
        <h2 style={{ margin: '16px 0 0', font: '700 32px/1.25 var(--font)', letterSpacing: '-0.03em', color: 'var(--headline)', textWrap: 'pretty' }}>{s.title}</h2>
        {gone ? (
          <p style={{ margin: '20px 0 0', font: '400 16px/1.7 var(--font)', color: 'var(--gray)' }}>this story is no longer available. the publisher removed it.</p>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
              <div style={{ width: 20, height: 20, borderRadius: 5, background: 'var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '700 10px/1 var(--font)', color: 'var(--gray)' }}>{s.source[0]}</div>
              <span style={{ font: '500 13px/1 var(--font)' }}>{s.source}</span>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--gray)' }} />
              <span style={{ font: '400 12px/1 var(--font)', color: 'var(--gray)' }}>{timeAgo(s.publishedAt)}</span>
            </div>
            <div style={{ width: 40, height: 1, background: 'var(--rule)', margin: '20px 0' }} />
            <p style={{ margin: 0, font: '400 16px/1.7 var(--font)', color: 'var(--body)' }}>{s.summary}</p>
            {full ? full.more?.map(m => (
              <div key={m.h} style={{ display: 'contents' }}>
                <span className="eyebrow" style={{ marginTop: 24 }}>{m.h}</span>
                <p style={{ margin: '8px 0 0', font: '400 16px/1.7 var(--font)', color: 'var(--body)' }}>{m.p}</p>
              </div>
            )) : (
              <div style={{ alignSelf: 'stretch', marginTop: 28 }} aria-busy="true" aria-label="loading more context">
                <Shimmer w={90} h={11} r={5.5} style={{ marginBottom: 14 }} />
                {['100%', '96%', '100%', '72%'].map((w, i) => <Shimmer key={i} w={w} h={14} r={7} style={{ marginBottom: 12 }} />)}
                <div style={{ height: 16 }} />
                <Shimmer w={110} h={11} r={5.5} style={{ marginBottom: 14 }} />
                {['100%', '92%', '60%'].map((w, i) => <Shimmer key={i} w={w} h={14} r={7} style={{ marginBottom: 12 }} />)}
              </div>
            )}
            <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ marginTop: 32, font: '600 14px/1 var(--font)', color: 'var(--signal)' }}>open original article →</a>
          </>
        )}
      </div>
    </Sheet>
  );
}

/* ---------------- filters ---------------- */


/** F1 · Filter sheet. Multi-select everything; empty groups mean "any". */
function FilterSheet({ onClose }: { onClose: () => void }) {
  const nav = useNavigate();
  const { prefs, updatePrefs } = useStore();
  const f = prefs.filters;
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    const t = window.setTimeout(() => {
      api.feedCount(f, prefs.places).then(r => alive && setCount(r.count)).catch(() => alive && setCount(null));
    }, 200);
    return () => { alive = false; window.clearTimeout(t); };
  }, [f, prefs.places]);

  const groups = filterGroups(prefs);
  const toggle = (k: keyof Filters, v: string) => updatePrefs(toggleFilter(k, v));

  return (
    <Sheet onClose={onClose} top={64} label="filters" scroll={false}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 20px 16px', borderBottom: '.5px solid var(--rule)', flex: 'none' }}>
        <h3 style={{ margin: 0, font: '700 24px/1 var(--font)', letterSpacing: '-0.03em' }}>filters</h3>
        <button className="link-btn" onClick={() => updatePrefs({ filters: { cov: [], cty: [], plc: [], top: [], typ: [] } })} style={{ font: '500 14px/1 var(--font)', color: 'var(--gray)' }}>reset</button>
      </div>
      <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {groups.map(g => (
          <div key={g.k} style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12 }} role="group" aria-label={g.t}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="eyebrow">{g.t}</span>
              <span style={{ font: '400 12px/1 var(--font)', color: 'var(--gray)' }}>{f[g.k].length ? `${f[g.k].length} selected` : 'any'}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {g.items.map(t => {
                const on = f[g.k].includes(t);
                return (
                  <button key={t} aria-pressed={on} className={`chip-sm${on ? ' is-on' : ''}`} onClick={() => toggle(g.k, t)}>
                    {on && <Icon name="tick" size={13} color="var(--signal)" style={{ animation: 'tnPop 200ms ease-out both' }} />}{t}
                  </button>
                );
              })}
              {g.add && (
                <button onClick={() => nav(g.add!)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '9px 12px', borderRadius: 50, border: '.5px dashed var(--gray-2)', background: 'transparent', font: '600 13px/1 var(--font)', color: 'var(--gray)', cursor: 'pointer' }}>
                  <Icon name="add" size={13} color="var(--gray)" />add
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '12px 20px', paddingBottom: 'calc(var(--sb) + 6px)', borderTop: '.5px solid var(--rule)', background: 'var(--surface)', flex: 'none' }}>
        <Button onClick={onClose} disabled={count === 0}>{showLabel(count)}</Button>
      </div>
    </Sheet>
  );
}

/* ---------------- states ---------------- */

/** E1 · Offline on launch. */
function OfflineState({ onRetry }: { onRetry: () => void }) {
  const nav = useNavigate();
  return (
    <>
      <StateMessage icon="wifi-disconnected" title="you're offline." body="check your connection. your saved stories are still here." />
      <Footer>
        <Button onClick={() => nav('/saved')}>read saved stories</Button>
        <Button variant="secondary" onClick={onRetry}>try again</Button>
      </Footer>
    </>
  );
}

/** E3 · Feed didn't load. Retry, with a reference for support. */
function LoadError({ error, onRetry }: { error: ApiError | null; onRetry: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <>
      <StateMessage icon="cloud-off" title="today's stories didn't load." body="something went wrong on our side. it's usually fixed within a minute." />
      <Footer>
        <Button loading={busy} onClick={async () => { setBusy(true); await Promise.resolve(onRetry()); setBusy(false); }}>try again</Button>
        <span style={{ textAlign: 'center', font: '400 11px/1 var(--font)', color: 'var(--gray)' }}>
          error {error?.status || 503}{error?.ref ? ` · ref ${error.ref}` : ''}
        </span>
      </Footer>
    </>
  );
}

/** E6 · Nothing nearby, or nothing matches the filters. */
function EmptyFeed({ nav }: { nav: NavHandlers }) {
  const navigate = useNavigate();
  const { prefs, updatePrefs } = useStore();
  const home = prefs.places.find(p => p.kind === 'home') ?? prefs.places[0];
  const hyper = !!home && prefs.filters.cov.includes('Neighbourhood') && prefs.coverage.includes('hyper');
  const wider = home ? RADII.find(r => r > home.radiusKm) : undefined;
  return (
    <FeedStateCard track={[]} nav={nav}>
      {hyper ? (
        <>
          <StateMessage icon="location-user" title="quiet around here." body={`no stories within ${home.radiusKm} km of ${home.area} today.`} />
          <Footer bottom={56}>
            {wider && <Button onClick={() => updatePrefs(p => ({ places: p.places.map(x => (x.id === home.id ? { ...x, radiusKm: wider } : x)) }))}>widen to {wider} km</Button>}
            {home.city && (
              <button className="link-btn" style={{ textAlign: 'center', font: '600 14px/1 var(--font)', color: 'var(--ink)' }}
                onClick={() => updatePrefs(p => ({
                  coverage: p.coverage.includes('city') ? p.coverage : [...p.coverage, 'city'],
                  filters: { ...p.filters, cov: uniq([...p.filters.cov, 'City']), plc: p.filters.plc.length ? uniq([...p.filters.plc, home.city]) : [] },
                }))}>
                show {home.city} stories
              </button>
            )}
          </Footer>
        </>
      ) : (
        <>
          <StateMessage icon="search-remove" title="nothing matches your filters." body="try fewer filters, or go back to the ones you picked when you started." />
          <Footer bottom={56}>
            <Button onClick={() => updatePrefs(p => ({ filters: filtersFromPrefs(p) }))}>reset filters</Button>
            <button className="link-btn" onClick={() => navigate('/filters')} style={{ textAlign: 'center', font: '600 14px/1 var(--font)', color: 'var(--ink)' }}>adjust filters</button>
          </Footer>
        </>
      )}
    </FeedStateCard>
  );
}

