import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// Guards the visual system: every class the components rely on must exist in the stylesheet.
const css = readFileSync('src/styles.css', 'utf8');

describe('stylesheet contract', () => {
  it.each([
    ['Rethink Sans is the only font', "--font: 'Rethink Sans Variable'"],
    ['paper base', '.grad-bg {'],
    ['gradient belt', '.grad-mix::before'],
    ['belt motion', '@keyframes tnBelt'],
    ['belt colours', '--belt: radial-gradient('],
    ['screen fade in', '.route-in {'],
    ['screen fade out', '.route-out {'],
    ['entrance rise', '.rise {'],
    ['staggered lists', '.stagger > :nth-child(1)'],
    ['feed pager', '.pager {'],
    ['double-tap heart', '@keyframes tnHeartPop'],
    ['line controls', '.ctl {'],
    ['selected fills with ink', '.ctl-on {'],
    ['arrow button', '.btn__arrow {'],
    ['story card with belt', '.story-card::before'],
    ['splash', '.splash__mark span'],
    ['skeleton shimmer', '.shimmer {'],
  ])('%s', (_label, rule) => {
    expect(css).toContain(rule);
  });

  it('keeps motion GPU-only (no per-frame SVG filters)', () => {
    expect(css).not.toMatch(/filter:\s*url\(/);
  });

  it('uses no other font family', () => {
    expect(css).not.toMatch(/Epilogue|Inter\b|Roboto|Helvetica/);
  });
});
