export interface CachePort {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string | string[]): Promise<void>;
}

export interface CacheMetricsPort {
  recordHit(key: string): void;
  recordMiss(key: string): void;
  snapshot(): { hits: number; misses: number; hitRate: number };
}
