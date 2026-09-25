import type { Filters, Place, Prefs, Story, User } from '../../shared/domain';

export class ApiError extends Error {
  constructor(public status: number, message: string, public body: Record<string, unknown> = {}) {
    super(message);
  }
  get code() { return this.body.code as string | undefined; }
  get fields() { return (this.body.fields ?? {}) as Record<string, string>; }
  get ref() { return this.body.ref as string | undefined; }
  /** True when the request never reached the server. */
  get offline() { return this.status === 0; }
  /** True when something answered, but not our API (it isn't running, or a proxy/host is in the way). */
  get unreachable() { return this.code === 'unreachable'; }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "you're offline.");
  }
  const text = await res.text();
  let data: Record<string, unknown> = {};
  let json = false;
  try { data = text ? JSON.parse(text) : {}; json = true; } catch { /* not our API: a proxy or host error page */ }
  // Our API always answers in JSON. Anything else means the request never got to it.
  if (!json || (!res.ok && typeof data.status !== 'number')) {
    throw new ApiError(res.status || 502, "we couldn't reach The News server. try again in a moment.", { code: 'unreachable' });
  }
  if (!res.ok) throw new ApiError(res.status, (data.error as string) || 'something went wrong on our side.', data);
  return data as T;
}

export interface LibraryPayload {
  saved: { story: Story; at: number }[];
  liked: string[];
  history: { story: Story; at: number }[];
}

export const api = {
  me: () => call<{ user: User | null; sessionExpired: boolean }>('GET', '/auth/me'),
  providers: () => call<{ google: boolean; apple: boolean; demo: boolean; dummy?: boolean }>('GET', '/auth/providers'),
  demo: () => call<{ user: User }>('POST', '/auth/demo'),
  signup: (b: { name: string; email: string; password: string; terms: boolean }) => call<{ user: User } | { pending: true; email: string; resendIn: number; devCode?: string }>('POST', '/auth/signup', b),
  verify: (email: string, code: string) => call<{ user: User }>('POST', '/auth/verify', { email, code }),
  resend: (email: string) => call<{ resendIn: number; devCode?: string }>('POST', '/auth/resend', { email }),
  login: (email: string, password: string) => call<{ user: User }>('POST', '/auth/login', { email, password }),
  forgot: (email: string) => call<{ ok: true; devLink?: string }>('POST', '/auth/forgot', { email }),
  reset: (token: string, password: string) => call<{ user: User }>('POST', '/auth/reset', { token, password }),
  logout: () => call<{ ok: true }>('POST', '/auth/logout'),
  deleteAccount: () => call<{ ok: true }>('DELETE', '/auth/me'),

  feed: (filters: Filters, places: Place[], keep: string[] = []) => call<{ stories: Story[]; generatedAt: string }>('POST', '/feed', { filters, places, keep }),
  feedCount: (filters: Filters, places: Place[]) => call<{ count: number }>('POST', '/feed/count', { filters, places }),
  story: (id: string) => call<{ story: Story }>('GET', `/stories/${encodeURIComponent(id)}`),

  searchPlaces: (q: string, country?: string) => call<{ places: Omit<Place, 'id' | 'kind' | 'label' | 'radiusKm'>[] }>('GET', `/geo/search?q=${encodeURIComponent(q)}${country ? `&country=${country}` : ''}`),
  reverse: (lat: number, lon: number) => call<{ place: Omit<Place, 'id' | 'kind' | 'label' | 'radiusKm'> }>('GET', `/geo/reverse?lat=${lat}&lon=${lon}`),

  getPrefs: () => call<{ prefs: Prefs | null }>('GET', '/prefs'),
  putPrefs: (prefs: Prefs) => call<{ prefs: Prefs }>('PUT', '/prefs', { prefs }),
  library: () => call<LibraryPayload>('GET', '/library'),
  mergeLibrary: (b: { saved: { id: string; at: number }[]; liked: string[]; history: { id: string; at: number }[] }) => call<LibraryPayload>('POST', '/library/merge', b),
  save: (id: string, on: boolean) => call(on ? 'PUT' : 'DELETE', `/saved/${encodeURIComponent(id)}`),
  like: (id: string, on: boolean) => call(on ? 'PUT' : 'DELETE', `/liked/${encodeURIComponent(id)}`),
  history: (ids: string[]) => call('POST', '/history', { ids }),
  clearHistory: () => call('DELETE', '/history'),

  pushKey: () => call<{ publicKey: string | null }>('GET', '/push/key'),
  pushSubscribe: (subscription: PushSubscriptionJSON) => call('POST', '/push/subscribe', { subscription }),
  pushUnsubscribe: () => call('POST', '/push/unsubscribe'),
};
