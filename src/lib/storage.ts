/** localStorage that never throws (private mode, quota, disabled storage). */
export const storage = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(`tn:${key}`);
      return raw == null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown) {
    try { localStorage.setItem(`tn:${key}`, JSON.stringify(value)); } catch { /* storage unavailable */ }
  },
  remove(key: string) {
    try { localStorage.removeItem(`tn:${key}`); } catch { /* storage unavailable */ }
  },
};
