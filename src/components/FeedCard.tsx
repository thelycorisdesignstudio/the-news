import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { headlineSize, locationTag, timeAgo, type Story } from '../../shared/domain';
import { Icon } from './Icon';
import { Wordmark } from './Brand';
import { B, Shimmer, T } from './ui';

export type View = 'swipe' | 'list';

export interface NavHandlers {
  onProfile?: () => void;
  onFilter?: () => void;
  onView?: (v: View) => void;
  filtersActive?: boolean;
}

/** Segments shown at once. A day of 60 stories would otherwise shrink the segments to dots. */
const TRACK_WINDOW = 16;

/**
 * The nine-second segments across the top of the feed. `track` holds each segment's fill, 0–100. Long
 * queues show a window around the current story; the end segments fade to say there's more either way.
 */
export function ProgressTrack({ track }: { track: number[] }) {
  const n = track.length;
  const current = Math.max(0, track.findIndex(w => w < 100) === -1 ? n - 1 : track.findIndex(w => w < 100));
  const start = n <= TRACK_WINDOW ? 0 : Math.min(Math.max(0, current - 5), n - TRACK_WINDOW);
  const shown = track.slice(start, start + TRACK_WINDOW);
  return (
    <div style={{ position: 'absolute', top: T(56), left: 16, right: 16, display: 'flex', gap: 3 }} aria-hidden>
      {shown.map((w, j) => {
        const more = (j === 0 && start > 0) || (j === shown.length - 1 && start + TRACK_WINDOW < n);
        return (
          <div key={start + j} style={{ flex: 1, height: 2, borderRadius: 1, background: 'var(--rule-2)', overflow: 'hidden', opacity: more ? 0.45 : 1 }}>
            <div style={{ height: '100%', width: `${w}%`, background: 'var(--signal)', transition: 'width 100ms linear' }} />
          </div>
        );
      })}
    </div>
  );
}

export function FeedNav({ onProfile, onFilter, onView, filtersActive, view = 'swipe', showFilter = true, top = 68 }: NavHandlers & { view?: View; showFilter?: boolean; top?: number }) {
  const round = { width: 40, height: 40 } as const;
  return (
    <div style={{ position: 'absolute', top: T(top), left: 16, right: 16, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 4 }}>
      <button aria-label="profile" className="ctl ctl-icon" onClick={onProfile} style={round}><Icon name="user" size={17} /></button>
      <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}><Wordmark size="xs" /></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {showFilter && (
          <button aria-label="filters" className="ctl ctl-icon" onClick={onFilter} style={round}>
            <Icon name="filter" size={16} />
            {filtersActive && <span style={{ position: 'absolute', top: 2, right: 2, width: 8, height: 8, borderRadius: '50%', background: 'var(--ink)', border: '1.5px solid var(--surface)' }} />}
          </button>
        )}
        <div role="radiogroup" aria-label="feed view" style={{ display: 'flex', padding: 2, borderRadius: 50, border: '1px solid var(--line-soft)', background: 'color-mix(in srgb, var(--card) 62%, transparent)' }}>
          {(['swipe', 'list'] as const).map(v => (
            <button key={v} role="radio" aria-checked={view === v} aria-label={v === 'swipe' ? 'swipe view' : 'list view'} onClick={() => onView?.(v)}
              style={{ width: 34, height: 34, padding: 0, border: 0, borderRadius: 50, background: view === v ? 'var(--signal)' : 'transparent', transition: 'background 180ms', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Icon name={v === 'swipe' ? 'layers' : 'list'} size={15} color={view === v ? 'var(--on-signal)' : 'var(--gray)'} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Where the story card sits: under the nav, above the home indicator. */
const CARD = { top: T(120), bottom: B(58), left: 14, right: 14 } as const;

/**
 * Clamps a paragraph to the whole lines that fit its slot, so a long summary ends on a full line with an
 * ellipsis instead of being sliced through the middle of a line.
 */
function useFitLines(key: unknown) {
  const slot = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<number>();
  useLayoutEffect(() => {
    const el = slot.current;
    if (!el) return;
    const fit = () => {
      const p = el.firstElementChild as HTMLElement | null;
      if (!p) return;
      const lh = parseFloat(getComputedStyle(p).lineHeight);
      if (lh > 0) setLines(Math.max(1, Math.floor((el.clientHeight + 1) / lh)));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [key]);
  return { slot, lines };
}

const DOTS = [[28, 10], [19, -6], [1, -6], [-8, 10], [1, 26], [19, 26]];

export interface FeedCardProps extends NavHandlers {
  story: Story;
  track: number[];
  liked?: boolean;
  saved?: boolean;
  toast?: string;
  shareTip?: boolean;
  chev?: 'none' | 'pulse' | 'mid';
  /** Whether the heart burst just happened (animate) or is shown as a still. */
  burst?: 'anim' | 'frozen' | 'none';
  onLike?: () => void;
  onSave?: () => void;
  onShare?: () => void;
  onRead?: () => void;
  now?: number;
}

export function FeedCard(p: FeedCardProps) {
  const s = p.story;
  const loc = locationTag(s);
  const { slot, lines } = useFitLines(s.id);
  return (
    <article aria-label={s.title} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <ProgressTrack track={p.track} />
      <FeedNav {...p} />
      {p.toast && (
        <div role="status" className="toast" style={{ position: 'absolute', bottom: `calc(${B(58)} + 78px)`, left: '50%', transform: 'translateX(-50%)', zIndex: 5, animation: 'tnFade 150ms ease-out' }}>{p.toast}</div>
      )}
      <div className="story-card" style={CARD}>
        <div style={{ position: 'absolute', inset: 0, padding: '22px 20px 16px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, flex: 'none' }}>
            {s.type === 'breaking' && (
              <span style={{ padding: '5px 10px', borderRadius: 50, background: 'var(--alert)', color: '#FFFFFF', font: '700 10.5px/1.2 var(--font)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Breaking</span>
            )}
            <span className="pill-cat">{s.cat}</span>
            {loc && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, font: '600 12px/1 var(--font)', color: 'var(--gray)' }}>
                <Icon name="location" size={14} color="var(--gray)" />{loc}
              </span>
            )}
          </div>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '30px 0 16px' }}>
            <h2 style={{ margin: 0, fontFamily: 'var(--font)', fontWeight: 800, letterSpacing: '-0.035em', fontSize: `calc(${headlineSize(s.title)}px * var(--ts, 1))`, lineHeight: 1.14, color: 'var(--headline)', textWrap: 'pretty', display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 'none' }}>{s.title}</h2>
            <div style={{ width: 36, height: 2, borderRadius: 1, background: 'var(--ink)', margin: '18px 0 14px', flex: 'none' }} />
            <div ref={slot} style={{ flex: 1, minHeight: 0 }}>
              <p style={{ margin: 0, font: '400 calc(16px * var(--ts, 1))/1.6 var(--font)', color: 'var(--body)', textWrap: 'pretty', overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: lines, visibility: lines ? undefined : 'hidden' }}>{s.summary}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '800 10px/1 var(--font)', color: 'var(--ink)' }}>{s.source[0]}</div>
            <span style={{ font: '700 13px/1 var(--font)', color: 'var(--ink)' }}>{s.source}</span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--gray)' }} />
            <span style={{ font: '500 12px/1 var(--font)', color: 'var(--gray)' }}>{timeAgo(s.publishedAt, p.now)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 16, flex: 'none' }}>
            <button onClick={p.onRead} className="ctl read-pill" aria-label="read full article" style={{ borderColor: 'var(--line)' }}>
              read full article<span className="btn__arrow" aria-hidden><Icon name="arrow-right" size={16} /></span>
            </button>
            <div style={{ display: 'flex', gap: 6 }}>
              <button aria-label={p.liked ? 'unlike' : 'like'} aria-pressed={!!p.liked} onClick={p.onLike} className={`ctl ctl-icon${p.liked ? ' is-like' : ''}`}>
                <Icon key={p.liked ? 'on' : 'off'} name="favourite" size={19} color={p.liked ? 'var(--alert)' : 'currentColor'} style={p.liked ? { animation: 'tnHeart 300ms ease-out' } : undefined} />
                {p.liked && p.burst && p.burst !== 'none' && (
                  <div style={{ position: 'absolute', inset: 8, pointerEvents: 'none' }}>
                    {DOTS.map(([x, y], i) => (
                      <span key={i} style={{ position: 'absolute', left: x * 0.85, top: y * 0.85, width: 4, height: 4, borderRadius: '50%', background: 'var(--alert)', ...(p.burst === 'anim' ? { opacity: 0, animation: 'tnBurst 300ms ease-out' } : { opacity: 0.35 }) }} />
                    ))}
                  </div>
                )}
              </button>
              <button aria-label="share" onClick={p.onShare} className="ctl ctl-icon">
                <Icon name="share" size={18} />
                {p.shareTip && <span role="status" className="toast" style={{ position: 'absolute', bottom: 48, right: -4, padding: '6px 10px' }}>copied.</span>}
              </button>
              <button aria-label={p.saved ? 'remove bookmark' : 'bookmark'} aria-pressed={!!p.saved} onClick={p.onSave} className={`ctl ctl-icon${p.saved ? ' is-save' : ''}`}>
                {p.saved
                  ? <Icon key="on" name="bookmark-check" size={19} style={{ animation: 'tnHeart 300ms ease-out' }} />
                  : <Icon key="off" name="bookmark" size={19} />}
              </button>
            </div>
          </div>
        </div>
      </div>
      <Chevron state={p.chev ?? 'none'} />
    </article>
  );
}

export function Chevron({ state }: { state: 'none' | 'pulse' | 'mid' | 'loop' }) {
  return (
    <div style={{ position: 'absolute', left: '50%', bottom: `max(calc(var(--sb) - 10px), 6px)`, transform: 'translateX(-50%)', width: 20, height: 20 }} aria-hidden>
      {state !== 'none' && (
        <Icon name="arrow-up" size={18} color="var(--gray)" style={
          state === 'pulse' ? { animation: 'tnPulse 600ms linear 1' } : state === 'loop' ? { animation: 'tnPulse 600ms linear infinite' } : { opacity: 0.6 }} />
      )}
    </div>
  );
}

/** Frame for full-screen states inside the swipe queue (removed story, nothing nearby). */
export function FeedStateCard({ track, nav, children }: { track: number[]; nav: NavHandlers; children: ReactNode }) {
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <ProgressTrack track={track} />
      <FeedNav {...nav} />
      {children}
    </div>
  );
}

/** L1: first load. Same geometry as a real card. */
export function FeedSkeleton({ nav, segments = 8 }: { nav: NavHandlers; segments?: number }) {
  const line = (w: string, i: number) => <Shimmer key={i} w={w} h={14} r={7} style={{ marginBottom: 12 }} />;
  return (
    <div style={{ position: 'absolute', inset: 0 }} aria-busy="true" aria-label="loading stories">
      <ProgressTrack track={Array(segments).fill(0)} />
      <FeedNav {...nav} />
      <div className="story-card" style={CARD}>
        <div style={{ position: 'absolute', inset: 0, padding: '22px 20px 16px', display: 'flex', flexDirection: 'column' }}>
          <Shimmer w={84} h={22} r={11} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Shimmer w="100%" h={30} /><div style={{ height: 8 }} />
            <Shimmer w="94%" h={30} /><div style={{ height: 8 }} />
            <Shimmer w="58%" h={30} />
            <div style={{ height: 34 }} />
            {['100%', '97%', '100%', '92%', '98%', '64%'].map(line)}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Shimmer w={22} h={22} r={6} /><Shimmer w={120} h={12} r={6} /></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <Shimmer w={168} h={42} r={21} />
            <div style={{ display: 'flex', gap: 6 }}><Shimmer w={40} h={40} r={20} /><Shimmer w={40} h={40} r={20} /><Shimmer w={40} h={40} r={20} /></div>
          </div>
        </div>
      </div>
    </div>
  );
}
