import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { defaultPrefs, filtersFromPrefs, type Prefs, type Story, type User } from '../../shared/domain';
import { api, ApiError, type LibraryPayload } from './api';
import { storage } from './storage';

type Saved = { story: Story; at: number };
type Op = { op: 'save' | 'unsave' | 'like' | 'unlike'; id: string };

interface Library { saved: Saved[]; liked: string[]; history: Saved[] }

interface Store {
  booting: boolean;
  online: boolean;
  user: User | null;
  prefs: Prefs;
  library: Library;
  sessionExpired: boolean;
  toast: { id: number; text: string } | null;
  updatePrefs: (patch: Partial<Prefs> | ((p: Prefs) => Partial<Prefs>)) => void;
  finishOnboarding: () => void;
  /** Syncs local state with the account; resolves to whether onboarding is already done. */
  signedIn: (user: User) => Promise<boolean>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  dismissExpired: () => void;
  isSaved: (id: string) => boolean;
  isLiked: (id: string) => boolean;
  toggleSave: (story: Story) => boolean;
  toggleLike: (story: Story) => void;
  markRead: (story: Story) => void;
  clearHistory: () => Promise<void>;
  showToast: (text: string) => void;
  refreshMe: () => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

export const useStore = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside StoreProvider');
  return s;
};

const EMPTY_LIB: Library = { saved: [], liked: [], history: [] };

function applyTheme(theme: Prefs['theme']) {
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#121212' : '#EBD6C8');
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [booting, setBooting] = useState(true);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [user, setUser] = useState<User | null>(() => storage.get<User | null>('user', null));
  const [prefs, setPrefs] = useState<Prefs>(() => ({ ...defaultPrefs(), ...storage.get<Partial<Prefs>>('prefs', {}) }));
  const [library, setLibrary] = useState<Library>(() => storage.get('library', EMPTY_LIB));
  const [sessionExpired, setSessionExpired] = useState(false);
  const [toast, setToast] = useState<Store['toast']>(null);
  const userRef = useRef(user);
  userRef.current = user;
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const toastTimer = useRef<number>(0);
  const pushTimer = useRef<number>(0);
  const historyBuf = useRef<string[]>([]);

  const showToast = useCallback((text: string) => {
    window.clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), text });
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  }, []);

  // Any authenticated call that comes back "session expired" surfaces the signed-out dialog.
  const guard = useCallback(async <T,>(p: Promise<T>): Promise<T | undefined> => {
    try {
      return await p;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setUser(null);
        setSessionExpired(true);
        return undefined;
      }
      throw e;
    }
  }, []);

  useEffect(() => { storage.set('prefs', prefs); applyTheme(prefs.theme); }, [prefs]);
  useEffect(() => { storage.set('library', library); }, [library]);
  useEffect(() => { storage.set('user', user); }, [user]);

  useEffect(() => {
    if (prefs.theme !== 'system') return;
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const on = () => applyTheme('system');
    mq?.addEventListener('change', on);
    return () => mq?.removeEventListener('change', on);
  }, [prefs.theme]);

  const flushOps = useCallback(async () => {
    if (!userRef.current || !navigator.onLine) return;
    const ops = storage.get<Op[]>('ops', []);
    while (ops.length) {
      const o = ops[0];
      try {
        if (o.op === 'save' || o.op === 'unsave') await api.save(o.id, o.op === 'save');
        else await api.like(o.id, o.op === 'like');
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) { setUser(null); setSessionExpired(true); }
        break;
      }
      ops.shift();
      storage.set('ops', ops);
    }
    if (historyBuf.current.length) {
      const ids = historyBuf.current.splice(0);
      await guard(api.history(ids)).catch(() => historyBuf.current.push(...ids));
    }
  }, [guard]);

  const queue = useCallback((op: Op) => {
    const ops = storage.get<Op[]>('ops', []).filter(o => o.id !== op.id || (o.op.includes('save') !== op.op.includes('save')));
    ops.push(op);
    storage.set('ops', ops);
    void flushOps();
  }, [flushOps]);

  const pushPrefs = useCallback((p: Prefs) => {
    window.clearTimeout(pushTimer.current);
    pushTimer.current = window.setTimeout(() => {
      if (userRef.current && navigator.onLine) void guard(api.putPrefs(p)).catch(() => {});
    }, 600);
  }, [guard]);

  const updatePrefs = useCallback<Store['updatePrefs']>(patch => {
    setPrefs(p => {
      const next = { ...p, ...(typeof patch === 'function' ? patch(p) : patch), updatedAt: Date.now() };
      pushPrefs(next);
      return next;
    });
  }, [pushPrefs]);

  const finishOnboarding = useCallback(() => {
    updatePrefs(p => ({ onboarded: true, filters: filtersFromPrefs(p) }));
  }, [updatePrefs]);

  const fromPayload = (lib: LibraryPayload): Library => ({ saved: lib.saved, liked: lib.liked, history: lib.history });

  /** Reconciles local state with the account after any sign-in. */
  const signedIn = useCallback(async (u: User) => {
    setUser(u);
    setSessionExpired(false);
    storage.set('wasSignedIn', true);
    const [remote, lib] = await Promise.all([
      api.getPrefs().catch(() => ({ prefs: null })),
      api.mergeLibrary({
        saved: library.saved.map(s => ({ id: s.story.id, at: s.at })),
        liked: library.liked,
        history: library.history.map(h => ({ id: h.story.id, at: h.at })),
      }).catch(() => null),
    ]);
    const local = prefsRef.current;
    let onboarded = local.onboarded;
    if (remote.prefs && (!local.onboarded || remote.prefs.updatedAt > local.updatedAt)) {
      const next = { ...defaultPrefs(), ...remote.prefs };
      prefsRef.current = next;
      setPrefs(next);
      onboarded = next.onboarded;
    } else if (local.onboarded) {
      void api.putPrefs(local).catch(() => {});
    }
    if (lib) setLibrary(fromPayload(lib));
    void flushOps();
    return onboarded;
  }, [library, flushOps]);

  const refreshMe = useCallback(async () => {
    try {
      const me = await api.me();
      if (me.user) {
        if (!userRef.current || userRef.current.id !== me.user.id) await signedIn(me.user);
        else {
          setUser(me.user);
          const [remote, lib] = await Promise.all([api.getPrefs().catch(() => ({ prefs: null })), api.library().catch(() => null)]);
          if (remote.prefs && remote.prefs.updatedAt > prefsRef.current.updatedAt) setPrefs({ ...defaultPrefs(), ...remote.prefs });
          if (lib) {
            // Keep locally queued changes on top of the server copy.
            const ops = storage.get<Op[]>('ops', []);
            setLibrary(l => {
              const next = fromPayload(lib);
              for (const o of ops) {
                if (o.op === 'save' && !next.saved.some(s => s.story.id === o.id)) {
                  const s = l.saved.find(x => x.story.id === o.id);
                  if (s) next.saved.unshift(s);
                }
                if (o.op === 'unsave') next.saved = next.saved.filter(s => s.story.id !== o.id);
                if (o.op === 'like' && !next.liked.includes(o.id)) next.liked.push(o.id);
                if (o.op === 'unlike') next.liked = next.liked.filter(x => x !== o.id);
              }
              return next;
            });
          }
          void flushOps();
        }
      } else {
        setUser(null);
        if (me.sessionExpired || storage.get('wasSignedIn', false)) setSessionExpired(!!userRef.current || storage.get('wasSignedIn', false));
      }
    } catch (e) {
      if (!(e instanceof ApiError && e.offline)) throw e;
    }
  }, [signedIn, flushOps]);

  useEffect(() => {
    let alive = true;
    const started = performance.now();
    refreshMe().catch(() => {}).finally(() => {
      // Keep the splash up long enough to read, but never block on it.
      const wait = Math.max(0, 700 - (performance.now() - started));
      window.setTimeout(() => alive && setBooting(false), wait);
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const up = () => { setOnline(true); void flushOps(); };
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, [flushOps]);

  const logout = useCallback(async () => {
    await api.logout().catch(() => {});
    storage.set('wasSignedIn', false);
    storage.remove('ops');
    storage.remove('feed');
    setUser(null);
    setSessionExpired(false);
    setPrefs(defaultPrefs());
    setLibrary(EMPTY_LIB);
  }, []);

  const deleteAccount = useCallback(async () => {
    await api.deleteAccount();
    await logout();
  }, [logout]);

  const isSaved = useCallback((id: string) => library.saved.some(s => s.story.id === id), [library.saved]);
  const isLiked = useCallback((id: string) => library.liked.includes(id), [library.liked]);

  const toggleSave = useCallback((story: Story) => {
    const on = !library.saved.some(s => s.story.id === story.id);
    setLibrary(l => ({ ...l, saved: on ? [{ story, at: Date.now() }, ...l.saved] : l.saved.filter(s => s.story.id !== story.id) }));
    queue({ op: on ? 'save' : 'unsave', id: story.id });
    return on;
  }, [library.saved, queue]);

  const toggleLike = useCallback((story: Story) => {
    const on = !library.liked.includes(story.id);
    setLibrary(l => ({ ...l, liked: on ? [...l.liked, story.id] : l.liked.filter(x => x !== story.id) }));
    queue({ op: on ? 'like' : 'unlike', id: story.id });
  }, [library.liked, queue]);

  const markRead = useCallback((story: Story) => {
    if (story.removed) return;
    setLibrary(l => ({ ...l, history: [{ story, at: Date.now() }, ...l.history.filter(h => h.story.id !== story.id)].slice(0, 200) }));
    historyBuf.current.push(story.id);
    window.setTimeout(() => void flushOps(), 1500);
  }, [flushOps]);

  const clearHistory = useCallback(async () => {
    setLibrary(l => ({ ...l, history: [] }));
    if (userRef.current) await guard(api.clearHistory()).catch(() => {});
  }, [guard]);

  const value = useMemo<Store>(() => ({
    booting, online, user, prefs, library, sessionExpired, toast, updatePrefs, finishOnboarding, signedIn, logout, deleteAccount,
    dismissExpired: () => { setSessionExpired(false); storage.set('wasSignedIn', false); },
    isSaved, isLiked, toggleSave, toggleLike, markRead, clearHistory, showToast, refreshMe,
  }), [booting, online, user, prefs, library, sessionExpired, toast, updatePrefs, finishOnboarding, signedIn, logout, deleteAccount,
    isSaved, isLiked, toggleSave, toggleLike, markRead, clearHistory, showToast, refreshMe]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
