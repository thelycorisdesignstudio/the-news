import { useNavigate } from 'react-router-dom';
import { Wordmark } from '../components/Brand';
import { LoaderBar } from '../components/ui';
import { GlassBg } from '../components/Glass';
import { storage } from '../lib/storage';

/** 01 · Splash. Wordmark at 2×; the loader is the only colour on screen. */
export function Splash() {
  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }} aria-busy="true">
      <Wordmark size="lg" />
      <div style={{ marginTop: 24 }}><LoaderBar width={40} kind="fill" /></div>
    </div>
  );
}

const LANDING_CATS = ['AI Models', 'AI Policy', 'Robotics', 'Big Tech', 'Startups', 'Cybersecurity', 'Space', 'World', 'Markets', 'Science', 'Health'];
const FEATURES = [
  { n: '01', t: 'nine seconds a story.', d: "Every story is edited down to what happened, why it matters and who reported it. A quiet timer shows when you've had enough time." },
  { n: '02', t: "swipe, don't scroll.", d: 'One full-screen card at a time. Swipe up for the next story, down to go back. No endless list, no autoplay.' },
  { n: '03', t: 'a finish line.', d: "The day's queue ends. When you're caught up, we tell you, and you can put your phone down." },
];

/** 02 · Landing, first launch only. Blue on the two CTAs only. */
export function Landing() {
  const nav = useNavigate();
  const start = () => { storage.set('seenLanding', true); nav('/welcome'); };
  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', paddingTop: 'calc(var(--st) + 12px)' }}>
        <Wordmark size="sm" />
        <button onClick={start} className="lg lg-signal" style={{ padding: '10px 16px', border: 0, borderRadius: 50, background: 'transparent', color: '#FFFFFF', font: '600 13px/1 var(--font)', cursor: 'pointer' }}><GlassBg />Start Reading</button>
      </div>
      <div style={{ padding: '56px 24px 0', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <span className="eyebrow" style={{ letterSpacing: '.08em' }}>AI &amp; technology, daily</span>
        <h1 style={{ margin: '16px 0 0', font: '700 38px/1.1 var(--font)', letterSpacing: '-0.03em', color: 'var(--ink)' }}>be dangerously well informed.</h1>
        <p style={{ margin: '16px 0 0', font: '300 16px/1.6 var(--font)', color: 'var(--gray)', textWrap: 'pretty' }}>The day's most important stories in AI and technology, one full-screen card each. Read in nine seconds, swipe for the next.</p>
        <button onClick={start} className="lg lg-signal" style={{ marginTop: 32, padding: '16px 28px', border: 0, borderRadius: 50, background: 'transparent', color: '#FFFFFF', font: '600 16px/1 var(--font)', cursor: 'pointer' }}><GlassBg />start reading free</button>
      </div>
      <div style={{ padding: '56px 24px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span className="eyebrow" style={{ letterSpacing: '.08em' }}>what we cover</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {LANDING_CATS.map(t => <span key={t} style={{ padding: '8px 14px', borderRadius: 50, background: 'var(--rule)', font: '600 13px/1 var(--font)', color: 'var(--ink)' }}>{t}</span>)}
        </div>
      </div>
      <div style={{ padding: '48px 20px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {FEATURES.map(f => (
          <div key={f.n} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ font: '600 11px/1 var(--font)', color: 'var(--gray)', letterSpacing: '.06em' }}>{f.n}</span>
            <h3 style={{ margin: 0, font: '700 20px/1.25 var(--font)', letterSpacing: '-0.03em' }}>{f.t}</h3>
            <p style={{ margin: 0, font: '400 14px/1.6 var(--font)', color: 'var(--gray)' }}>{f.d}</p>
          </div>
        ))}
      </div>
      <div style={{ margin: '48px 20px 0', padding: '20px 0', borderTop: '1px solid var(--rule)', borderBottom: '1px solid var(--rule)', display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 1fr', alignItems: 'center', textAlign: 'center' }}>
        <Stat v="9s" l="per story" /><div style={{ height: 32, background: 'var(--rule)' }} />
        <Stat v="8" l="stories a day" /><div style={{ height: 32, background: 'var(--rule)' }} />
        <Stat v="14" l="topics" />
      </div>
      <footer style={{ padding: '48px 24px 16px', paddingBottom: 'calc(var(--sb) + 22px)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
        <Wordmark size="sm" />
        <span style={{ font: '400 13px/1.4 var(--font)', color: 'var(--gray)' }}>nine seconds. the whole picture.</span>
        <div style={{ display: 'flex', gap: 16, font: '500 12px/1 var(--font)' }}>
          <a href="/about" onClick={e => { e.preventDefault(); nav('/about'); }} style={{ color: 'var(--gray)' }}>About</a>
          <a href="/privacy" onClick={e => { e.preventDefault(); nav('/privacy'); }} style={{ color: 'var(--gray)' }}>Privacy</a>
          <a href="/terms" onClick={e => { e.preventDefault(); nav('/terms'); }} style={{ color: 'var(--gray)' }}>Terms</a>
        </div>
        <span style={{ marginTop: 8, font: '400 11px/1 var(--font)', color: 'var(--gray)' }}>A Lycoris Product</span>
      </footer>
    </div>
  );
}

export function Stat({ v, l }: { v: string | number; l: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ font: '600 18px/1 var(--font)' }}>{v}</span>
      <span style={{ font: '400 11px/1 var(--font)', color: 'var(--gray)' }}>{l}</span>
    </div>
  );
}
