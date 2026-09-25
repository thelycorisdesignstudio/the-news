import { useCallback, useEffect, useRef, useState } from 'react';
import type { Filters, Place, Story } from '../../shared/domain';
import { api, ApiError } from './api';
import { storage } from './storage';

interface Cached { key: string; stories: Story[]; fetchedAt: number }

export type FeedStatus = 'loading' | 'ready' | 'error' | 'offline';

const STALE_MS = 30 * 60_000;
const feedKey = (f: Filters, places: Place[]) => JSON.stringify([f, places.map(p => [p.lat, p.lon, p.radiusKm, p.area, p.city])]);

export const cachedFeed = () => storage.get<Cached | null>('feed', null);

/**
 * The day's queue. It stays stable while you read; it refreshes on pull-to-refresh, when filters
 * change, or at launch once it is more than 30 minutes old. Offline, the last queue keeps working.
 */
export function useFeed(filters: Filters, places: Place[], paused = false) {
  const key = feedKey(filters, places);
  const [state, setState] = useState<{ status: FeedStatus; stories: Story[]; fetchedAt: number | null; error: ApiError | null; stale: boolean }>(() => {
    const c = cachedFeed();
    return c && c.key === key
      ? { status: 'ready', stories: c.stories, fetchedAt: c.fetchedAt, error: null, stale: !navigator.onLine }
      : { status: 'loading', stories: [], fetchedAt: null, error: null, stale: false };
  });
  const inflight = useRef(0);

  const load = useCallback(async (opts: { keepQueue?: boolean } = {}) => {
    const id = ++inflight.current;
    const c = cachedFeed();
    const keep = opts.keepQueue && c?.key === key ? c.stories.map(s => s.id) : [];
    setState(s => (s.stories.length ? s : { ...s, status: 'loading', error: null }));
    try {
      const res = await api.feed(filters, places, keep);
      if (id !== inflight.current) return;
      const fetchedAt = Date.now();
      storage.set('feed', { key, stories: res.stories, fetchedAt });
      setState({ status: 'ready', stories: res.stories, fetchedAt, error: null, stale: false });
    } catch (e) {
      if (id !== inflight.current) return;
      const err = e instanceof ApiError ? e : new ApiError(500, 'something went wrong on our side.');
      const fallback = cachedFeed();
      if (fallback?.stories.length) {
        // Cached cards keep working; the banner explains.
        setState({ status: 'ready', stories: fallback.stories, fetchedAt: fallback.fetchedAt, error: err, stale: true });
      } else {
        setState({ status: err.offline ? 'offline' : 'error', stories: [], fetchedAt: null, error: err, stale: false });
      }
    }
    // filters/places are captured through `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (paused) return;
    const c = cachedFeed();
    if (c && c.key === key && Date.now() - c.fetchedAt < STALE_MS && navigator.onLine) {
      setState({ status: 'ready', stories: c.stories, fetchedAt: c.fetchedAt, error: null, stale: false });
      return;
    }
    void load({ keepQueue: true });
  }, [key, paused, load]);

  // Live: when the newsroom publishes, new stories join the end of the queue. The card you're on
  // and everything before it stay where they are; stories already queued pick up edits (e.g. breaking).
  const merging = useRef(false);
  const merge = useCallback(async () => {
    if (merging.current) return;
    merging.current = true;
    try {
      const c = cachedFeed();
      if (!c || c.key !== key) return;
      const res = await api.feed(filters, places, c.stories.map(s => s.id));
      const fresh = new Map(res.stories.map(s => [s.id, s]));
      const have = new Set(c.stories.map(s => s.id));
      const added = res.stories.filter(s => !have.has(s.id) && !s.removed);
      if (!added.length && !c.stories.some(s => fresh.has(s.id) && JSON.stringify(fresh.get(s.id)) !== JSON.stringify(s))) return;
      const stories = [...c.stories.map(s => fresh.get(s.id) ?? s), ...added];
      const fetchedAt = Date.now();
      storage.set('feed', { key, stories, fetchedAt });
      setState(st => (st.status === 'ready' ? { ...st, stories, fetchedAt, stale: false, error: null } : st));
    } catch {
      // A missed live update is harmless: the next refresh brings everything in.
    } finally {
      merging.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (paused || typeof EventSource === 'undefined') return;
    const es = new EventSource('/api/stream');
    let t = 0;
    // Bursts of publishes arrive together; one merge covers them.
    const on = () => { window.clearTimeout(t); t = window.setTimeout(() => void merge(), 1500); };
    es.addEventListener('stories', on);
    return () => { window.clearTimeout(t); es.close(); };
  }, [paused, merge]);

  // Coming back online after showing the cached queue: quietly refresh.
  useEffect(() => {
    const on = () => { if (state.stale) void load({ keepQueue: true }); };
    window.addEventListener('online', on);
    return () => window.removeEventListener('online', on);
  }, [state.stale, load]);

  return { ...state, refresh: () => load({ keepQueue: false }) };
}
