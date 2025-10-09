import { CachePort, CacheMetricsPort } from '../../application/ports/cache.port';

interface Entry {
  v: unknown;
  exp: number; // epoch ms
}

class BasicMetrics implements CacheMetricsPort {
  private hits = 0;
  private misses = 0;
  recordHit(): void { this.hits++; }
  recordMiss(): void { this.misses++; }
  snapshot() { const total = this.hits + this.misses; return { hits: this.hits, misses: this.misses, hitRate: total ? this.hits / total : 0 }; }
}

export class InMemoryCache implements CachePort {
  private store = new Map<string, Entry>();
  private metrics = new BasicMetrics();
  constructor(private defaultTTLSeconds = 60) {}

  async get<T>(key: string): Promise<T | undefined> {
    const e = this.store.get(key);
    if (!e) { this.metrics.recordMiss(); return undefined; }
    if (Date.now() > e.exp) { this.store.delete(key); this.metrics.recordMiss(); return undefined; }
    this.metrics.recordHit();
    return e.v as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = (ttlSeconds ?? this.defaultTTLSeconds) * 1000;
    this.store.set(key, { v: value, exp: Date.now() + ttl });
  }

  async del(key: string | string[]): Promise<void> {
    if (Array.isArray(key)) key.forEach(k => this.store.delete(k));
    else this.store.delete(key);
  }

  stats() { return this.metrics.snapshot(); }
}

export const globalInMemoryCache = new InMemoryCache(90);
