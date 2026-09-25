import type { CSSProperties } from 'react';

/** The primary wordmark: Rethink Sans italic 400 "The" over Rethink Sans 800 "News". */
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

/** The logo symbol, "Nine": nine cells, nine seconds; the blue cell is the story you are on. */
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
