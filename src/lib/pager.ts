import { useCallback, useEffect, useRef, type RefObject } from 'react';

let hapticsOn = true;
/** The reader can turn haptics off in their profile. */
export const setHaptics = (on: boolean) => { hapticsOn = on; };

/** Short vibrations where the device supports them (Android, most PWAs). Silent elsewhere. */
export function haptic(kind: 'tick' | 'like' | 'save' | 'success' | 'warn') {
  if (!hapticsOn) return;
  const pattern = { tick: 8, like: [10, 40, 14], save: 12, success: [8, 60, 8], warn: [30, 40, 30] }[kind];
  try { navigator.vibrate?.(pattern); } catch { /* not supported */ }
}

/** Wheel silence that ends a gesture. Trackpad momentum events come every 8–60ms, even on slow devices. */
const QUIET_MS = 260;

const easeOutQuart = (p: number) => 1 - Math.pow(1 - p, 4);

/**
 * Full-screen paging for the swipe feed, TikTok-style: one gesture moves exactly one story.
 * Touch uses the browser's own scroll-snap (fast, native momentum). Wheel, trackpad, keyboard and
 * mouse-drag are driven here: a flick glides to the next page and any momentum tail is swallowed,
 * so a hard flick never skips stories.
 */
export function useSnapPager(ref: RefObject<HTMLDivElement | null>, pages: number) {
  const raf = useRef(0);
  const pagesRef = useRef(pages);
  pagesRef.current = pages;

  const animateTo = useCallback((index: number) => {
    const el = ref.current;
    if (!el) return;
    const h = el.clientHeight;
    const target = Math.max(0, Math.min(pagesRef.current - 1, index)) * h;
    const from = el.scrollTop;
    const d = target - from;
    cancelAnimationFrame(raf.current);
    if (Math.abs(d) < 1) return;
    el.classList.add('is-gliding');
    const dur = Math.min(720, 340 + (Math.abs(d) / h) * 90);
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      el.scrollTop = from + d * easeOutQuart(p);
      if (p < 1) raf.current = requestAnimationFrame(step);
      else el.classList.remove('is-gliding');
    };
    raf.current = requestAnimationFrame(step);
  }, [ref]);

  const current = useCallback(() => {
    const el = ref.current;
    return el ? Math.round(el.scrollTop / el.clientHeight) : 0;
  }, [ref]);

  const page = useCallback((dir: 1 | -1) => animateTo(current() + dir), [animateTo, current]);

  // Wheel and trackpad: accumulate a little, move one page, then ignore inertia until it settles.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let acc = 0, locked = false, last = 0, unlock = 0;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      const now = performance.now();
      const gap = now - last;
      last = now;
      // Momentum keeps arriving for a second or more after a flick, and on a busy main thread it arrives in
      // clumps. Stay locked until the glide has finished and the wheel has been quiet for a moment.
      if (locked || el.classList.contains('is-gliding')) {
        locked = true;
        window.clearTimeout(unlock);
        unlock = window.setTimeout(() => { locked = false; acc = 0; }, QUIET_MS);
        return;
      }
      if (gap > 220) acc = 0;
      acc += e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      if (Math.abs(acc) >= 30) {
        page(acc > 0 ? 1 : -1);
        acc = 0;
        locked = true;
        window.clearTimeout(unlock);
        unlock = window.setTimeout(() => { locked = false; acc = 0; }, 460);
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => { el.removeEventListener('wheel', onWheel); window.clearTimeout(unlock); };
  }, [ref, page]);

  // Mouse drag behaves like a finger: follow the pointer, then settle by distance or flick speed.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let start: { y: number; top: number; index: number; moved: boolean; samples: { y: number; t: number }[] } | null = null;
    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      if ((e.target as HTMLElement).closest('button, a, input, [role="dialog"]')) return;
      cancelAnimationFrame(raf.current);
      start = { y: e.clientY, top: el.scrollTop, index: current(), moved: false, samples: [{ y: e.clientY, t: performance.now() }] };
    };
    const move = (e: PointerEvent) => {
      if (!start) return;
      const dy = e.clientY - start.y;
      if (!start.moved && Math.abs(dy) < 6) return;
      if (!start.moved) { start.moved = true; el.classList.add('is-dragging'); }
      const max = el.scrollHeight - el.clientHeight;
      let top = start.top - dy;
      if (top < 0) top *= 0.35;
      if (top > max) top = max + (top - max) * 0.35;
      el.scrollTop = top;
      start.samples.push({ y: e.clientY, t: performance.now() });
      if (start.samples.length > 6) start.samples.shift();
    };
    const up = (e: PointerEvent) => {
      if (!start) return;
      const s = start;
      start = null;
      if (!s.moved) return;
      el.classList.remove('is-dragging');
      const a = s.samples[0], b = s.samples[s.samples.length - 1];
      const v = (a.y - b.y) / Math.max(1, b.t - a.t); // px/ms, positive = towards the next story
      const dy = e.clientY - s.y;
      const h = el.clientHeight;
      let target = s.index;
      if (-dy > h * 0.18 || v > 0.45) target = s.index + 1;
      else if (dy > h * 0.18 || v < -0.45) target = s.index - 1;
      animateTo(target);
      // A drag is not a click.
      const swallow = (ev: MouseEvent) => { ev.stopPropagation(); ev.preventDefault(); };
      window.addEventListener('click', swallow, { capture: true, once: true });
      window.setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0);
    };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [ref, animateTo, current]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  return { page, animateTo };
}

/**
 * Double-tap detection that ignores buttons and links, returning the tap point relative to `el`.
 * A single tap does nothing, so there is no delay on the controls.
 */
export function useDoubleTap(onDouble: (x: number, y: number) => void) {
  const last = useRef<{ t: number; x: number; y: number } | null>(null);
  const downAt = useRef<{ t: number; x: number; y: number } | null>(null);
  return {
    onPointerDown: (e: React.PointerEvent) => { downAt.current = { t: performance.now(), x: e.clientX, y: e.clientY }; },
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
      const d = downAt.current;
      downAt.current = null;
      if (!d || (e.target as HTMLElement).closest('button, a, input')) return;
      const now = performance.now();
      if (now - d.t > 260 || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10) return; // a drag, not a tap
      const prev = last.current;
      if (prev && now - prev.t < 320 && Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < 40) {
        last.current = null;
        const r = e.currentTarget.getBoundingClientRect();
        onDouble(e.clientX - r.left, e.clientY - r.top);
      } else {
        last.current = { t: now, x: e.clientX, y: e.clientY };
      }
    },
  };
}
