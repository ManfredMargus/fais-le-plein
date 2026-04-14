const TTL_MS = process.env.NODE_ENV === 'development' ? 60 * 1000 : 10 * 60 * 1000; // 1min dev, 10min prod

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const store = new Map<string, CacheEntry<any>>();

export function getCached<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > TTL_MS) {
    store.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCache<T>(key: string, data: T): void {
  store.set(key, { data, timestamp: Date.now() });
}

export function clearCache(key?: string): void {
  if (key) store.delete(key);
  else store.clear();
}
