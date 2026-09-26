import type { ReactNode } from 'react';
import { headlineSize, locationTag, timeAgo, type Story } from '../../shared/domain';
import { Icon } from './Icon';
import { Wordmark } from './Brand';
import { GlassBg } from './Glass';
import { B, Shimmer, T } from './ui';

export type View = 'swipe' | 'list';

export interface NavHandlers {
  onProfile?: () => void;
  onFilter?: () => void;
  onView?: (v: View) => void;
  filtersActive?: boolean;
}

/** The nine-second segments across the top of the feed. `track` holds each segment's fill, 0–100. */
export function ProgressTrack({ track }: { track: number[] }) {
  return (
    <div style={{ position: 'absolute', top: T(56), left: 16, right: 16, display: 'flex', gap: 3 }} aria-hidden>
      {track.map((w, i) => (
        <div key={i} style={{ flex: 1, height: 2.5, borderRadius: 2, background: 'var(--rule)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${w}%`, background: 'var(--signal)', transition: 'width 100ms linear' }} />
        </div>
      ))}
    </div>
  );
}

export function FeedNav({ onProfile, onFilter, onView, filtersActive, view = 'swipe', showFilter = true, top = 70 }: NavHandlers & { view?: View; showFilter?: boolean; top?: number }) {
  const round = { width: 28, height: 28, padding: 0, border: 0, borderRadius: '50%', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' } as const;
  return (
    <div style={{ position: 'absolute', top: T(top), left: 20, right: 20, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 4 }}>
      <button aria-label="profile" className="lg" onClick={onProfile} style={round}><GlassBg /><Icon name="user" size={16} color="var(--glass-icon)" /></button>
      <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}><Wordmark size="xs" /></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {showFilter && (
          <button aria-label="filters" className="lg" onClick={onFilter} style={{ ...round, position: 'relative' }}>
            <GlassBg />
            <Icon name="filter" size={15} color="var(--glass-icon)" />
            {filtersActive && <span style={{ position: 'absolute', top: 1, right: 1, width: 7, height: 7, borderRadius: '50%', background: 'var(--signal)', border: '1.5px solid var(--rule)' }} />}
          </button>
        )}
        <div role="radiogroup" aria-label="feed view" className="lg" style={{ display: 'flex', padding: 2, borderRadius: 50 }}>
          <GlassBg />
          {(['swipe', 'list'] as const).map(v => (
            <button key={v} role="radio" aria-checked={view === v} aria-label={v === 'swipe' ? 'swipe view' : 'list view'} onClick={() => onView?.(v)}
              style={{ width: showFilter ? 28 : 30, height: 24, padding: 0, border: 0, borderRadius: 50, background: view === v ? 'color-mix(in srgb, var(--card) 82%, transparent)' : 'transparent', boxShadow: view === v ? '0 1px 3px rgba(10,10,10,.08)' : undefined, transition: 'background 180ms', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Icon name={v === 'swipe' ? 'layers' : 'list'} size={14} color={view === v ? 'var(--ink)' : 'var(--gray-2)'} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
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
  const actionBtn = { position: 'relative', width: 36, height: 36, padding: 0, border: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'transparent' } as const;
  return (
    <article aria-label={s.title} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <ProgressTrack track={p.track} />
      <FeedNav {...p} />
      {p.toast && (
        <div role="status" className="toast" style={{ position: 'absolute', top: T(112), left: '50%', transform: 'translateX(-50%)', zIndex: 5, animation: 'tnFade 150ms ease-out' }}>{p.toast}</div>
      )}
      <div style={{ position: 'absolute', top: T(112), bottom: B(150), left: 24, right: 64, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start' }}>
        {s.type === 'breaking' && (
          <span style={{ marginBottom: 8, padding: '4px 10px', borderRadius: 50, background: 'var(--alert)', color: '#FFFFFF', font: '700 10px/1.2 var(--font)', letterSpacing: '.12em', textTransform: 'uppercase' }}>Breaking</span>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <span className="pill-cat">{s.cat}</span>
          {loc && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, font: '500 12px/1 var(--font)', color: 'var(--gray)' }}>
              <Icon name="location" size={14} color="var(--gray)" />{loc}
            </span>
          )}
        </div>
        <h2 style={{ margin: '16px 0 0', fontFamily: 'var(--font)', fontWeight: 700, letterSpacing: '-0.03em', fontSize: `calc(${headlineSize(s.title)}px * var(--ts, 1))`, lineHeight: 1.2, color: 'var(--headline)', textWrap: 'pretty', display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 'none' }}>{s.title}</h2>
        <div style={{ width: 40, height: 1, background: 'var(--rule)', margin: '20px 0 16px', flex: 'none' }} />
        <p style={{ margin: 0, font: '400 calc(16px * var(--ts, 1))/1.65 var(--font)', color: 'var(--body)', textWrap: 'pretty', overflow: 'hidden', minHeight: 0 }}>{s.summary}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 24, flex: 'none' }}>
          <div style={{ width: 20, height: 20, borderRadius: 5, background: 'var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '700 10px/1 var(--font)', color: 'var(--gray)' }}>{s.source[0]}</div>
          <span style={{ font: '500 13px/1 var(--font)', color: 'var(--ink)' }}>{s.source}</span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--gray)' }} />
          <span style={{ font: '400 12px/1 var(--font)', color: 'var(--gray)' }}>{timeAgo(s.publishedAt, p.now)}</span>
        </div>
      </div>
      <div style={{ position: 'absolute', right: 14, bottom: B(124), display: 'flex', flexDirection: 'column', gap: 16, zIndex: 4 }}>
        <button aria-label={p.liked ? 'unlike' : 'like'} aria-pressed={!!p.liked} onClick={p.onLike} className={`lg${p.liked ? ' is-like' : ''}`} style={actionBtn}>
          <GlassBg />
          <Icon key={p.liked ? 'on' : 'off'} name="favourite" size={24} color={p.liked ? 'var(--alert)' : 'var(--glass-icon)'} style={p.liked ? { animation: 'tnHeart 300ms ease-out' } : undefined} />
          {p.liked && p.burst && p.burst !== 'none' && (
            <div style={{ position: 'absolute', inset: 6, pointerEvents: 'none' }}>
              {DOTS.map(([x, y], i) => (
                <span key={i} style={{ position: 'absolute', left: x, top: y, width: 4, height: 4, borderRadius: '50%', background: 'var(--alert)', ...(p.burst === 'anim' ? { opacity: 0, animation: 'tnBurst 300ms ease-out' } : { opacity: 0.35 }) }} />
              ))}
            </div>
          )}
        </button>
        <button aria-label="share" onClick={p.onShare} className="lg" style={actionBtn}>
          <GlassBg />
          <Icon name="share" size={22} color="var(--glass-icon)" />
          {p.shareTip && <span role="status" className="toast" style={{ position: 'absolute', right: 42, top: 9, padding: '6px 10px' }}>copied.</span>}
        </button>
        <button aria-label={p.saved ? 'remove bookmark' : 'bookmark'} aria-pressed={!!p.saved} onClick={p.onSave} className={`lg${p.saved ? ' is-save' : ''}`} style={actionBtn}>
          <GlassBg />
          {p.saved
            ? <Icon key="on" name="bookmark-check" size={24} color="var(--signal)" style={{ animation: 'tnHeart 300ms ease-out' }} />
            : <Icon key="off" name="bookmark" size={24} color="var(--glass-icon)" />}
        </button>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: B(58), display: 'flex', justifyContent: 'center' }}>
        <button onClick={p.onRead} className="lg" style={{ padding: '10px 18px', border: 0, borderRadius: 50, background: 'transparent', cursor: 'pointer', font: '600 14px/1 var(--font)', color: 'var(--signal)' }}><GlassBg />read full article →</button>
      </div>
      <Chevron state={p.chev ?? 'none'} />
    </article>
  );
}

export function Chevron({ state }: { state: 'none' | 'pulse' | 'mid' | 'loop' }) {
  return (
    <div style={{ position: 'absolute', left: '50%', bottom: `max(calc(var(--sb) - 10px), 6px)`, transform: 'translateX(-50%)', width: 20, height: 20 }} aria-hidden>
      {state !== 'none' && (
        <Icon name="arrow-up" size={20} color="var(--gray)" style={
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
  const line = (w: string, i: number) => <Shimmer key={i} w={w} h={14} r={7} style={{ marginBottom: 13 }} />;
  return (
    <div style={{ position: 'absolute', inset: 0 }} aria-busy="true" aria-label="loading stories">
      <ProgressTrack track={Array(segments).fill(0)} />
      <FeedNav {...nav} />
      <div style={{ position: 'absolute', top: T(112), bottom: B(150), left: 24, right: 64, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Shimmer w={84} h={22} />
        <div style={{ height: 16 }} />
        <Shimmer w="100%" h={30} /><div style={{ height: 8 }} />
        <Shimmer w="94%" h={30} /><div style={{ height: 8 }} />
        <Shimmer w="58%" h={30} />
        <div style={{ height: 36 }} />
        {['100%', '97%', '100%', '92%', '98%', '100%', '88%', '64%'].map(line)}
        <div style={{ height: 12 }} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Shimmer w={20} h={20} /><Shimmer w={120} h={12} r={6} /></div>
      </div>
      <div style={{ position: 'absolute', right: 20, bottom: B(130), display: 'flex', flexDirection: 'column', gap: 28 }}>
        <Shimmer w={24} h={24} /><Shimmer w={24} h={24} /><Shimmer w={24} h={24} />
      </div>
      <div style={{ position: 'absolute', left: '50%', bottom: B(58), transform: 'translateX(-50%)' }}><Shimmer w={140} h={14} r={7} /></div>
    </div>
  );
}
