import type { CSSProperties } from 'react';

/** The primary wordmark: Epilogue italic 400 "The" over Epilogue 800 "News". */
export function Wordmark({ size = 'md', inverse, style }: { size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; inverse?: boolean; style?: CSSProperties }) {
  const s = {
    xs: [10, 18, -1], sm: [12, 20, -1], md: [16, 28, -2], lg: [20, 36, -2], xl: [28, 56, -2],
  }[size];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1, ...style }} aria-label="The News" role="img">
      <span style={{ font: `italic 400 ${s[0]}px/1 var(--font)`, color: inverse ? '#8E8E93' : 'var(--gray)' }}>The</span>
      <span style={{ font: `800 ${s[1]}px/1 var(--font)`, letterSpacing: s[2], color: inverse ? '#FAFAF8' : 'var(--ink)' }}>News</span>
    </div>
  );
}

/** Logo 1a, "Nine": nine cells, nine seconds; the blue cell is the story you are on. */
export function LogoNine({ size = 40, dark }: { size?: number; dark?: boolean }) {
  const cell = size * 0.16, gap = size * 0.06, fg = dark ? '#FAFAF8' : '#0A0A0A', bg = dark ? '#0A0A0A' : '#FAFAF8';
  return (
    <div role="img" aria-label="The News" style={{
      flex: 'none', width: size, height: size, borderRadius: size * 0.225, background: bg, boxShadow: `0 0 0 1px ${dark ? '#0A0A0A' : '#E3E3DF'}`,
      display: 'grid', placeContent: 'center', gridTemplateColumns: `repeat(3, ${cell}px)`, gap,
    }}>
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} style={{ width: cell, height: cell, borderRadius: cell * 0.24, background: i === 8 ? '#0055FF' : fg }} />
      ))}
    </div>
  );
}

/** Logo 1b, "Stack": two cards mid-swipe with the progress segment on top. */
export function LogoStack({ size = 40, dark }: { size?: number; dark?: boolean }) {
  const k = size / 100, fg = dark ? '#FAFAF8' : '#0A0A0A', bg = dark ? '#0A0A0A' : '#FAFAF8', stroke = Math.max(1, 3 * k);
  return (
    <div role="img" aria-label="The News" style={{ flex: 'none', position: 'relative', width: size, height: size, borderRadius: size * 0.225, background: bg, boxShadow: `0 0 0 1px ${dark ? '#0A0A0A' : '#E3E3DF'}`, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 28 * k, top: 16 * k, width: 44 * k, height: 56 * k, borderRadius: 8 * k, border: `${stroke}px solid ${fg}`, opacity: 0.3 }} />
      <div style={{ position: 'absolute', left: 22 * k, top: 26 * k, width: 56 * k, height: 58 * k, borderRadius: 9 * k, border: `${stroke}px solid ${fg}`, background: dark ? '#0A0A0A' : '#FFFFFF' }}>
        <div style={{ position: 'absolute', left: 7 * k, right: 7 * k, top: 8 * k, height: Math.max(1.5, 4 * k), borderRadius: 2 * k, background: '#F0F0EE', overflow: 'hidden' }}>
          <div style={{ width: '60%', height: '100%', background: '#0055FF' }} />
        </div>
        <div style={{ position: 'absolute', left: 7 * k, top: 20 * k, width: 34 * k, height: 6 * k, borderRadius: 2 * k, background: fg }} />
        <div style={{ position: 'absolute', left: 7 * k, top: 31 * k, width: 24 * k, height: 6 * k, borderRadius: 2 * k, background: fg }} />
      </div>
    </div>
  );
}
