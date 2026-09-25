import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// Guards the visual system: every class the components rely on must exist in the stylesheet.
const css = readFileSync('src/styles.css', 'utf8');

describe('stylesheet contract', () => {
  it.each([
    ['Rethink Sans is the only font', "--font: 'Rethink Sans Variable'"],
    ['gradient base', '.grad-bg {'],
    ['peach/blue blend', '.grad-mix::before'],
    ['blend motion', '@keyframes tnPeach'],
    ['screen fade in', '.route-in {'],
    ['screen fade out', '.route-out {'],
    ['entrance rise', '.rise {'],
    ['staggered lists', '.stagger > :nth-child(1)'],
    ['feed pager', '.pager {'],
    ['double-tap heart', '@keyframes tnHeartPop'],
    ['liquid glass', '.lg__tint {'],
    ['glass lens edge', '.lg__lens {'],
    ['frosted glass', '.frost {'],
    ['skeleton shimmer', '.shimmer {'],
  ])('%s', (_label, rule) => {
    expect(css).toContain(rule);
  });

  it('keeps glass GPU-only (no per-frame SVG filters)', () => {
    expect(css).not.toMatch(/filter:\s*url\(/);
  });

  it('uses no other font family', () => {
    expect(css).not.toMatch(/Epilogue|Inter\b|Roboto|Helvetica/);
  });
});
