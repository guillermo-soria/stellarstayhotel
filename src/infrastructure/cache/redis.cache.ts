import { CachePort, CacheMetricsPort } from '../../application/ports/cache.port';
import { createClient, RedisClientType } from 'redis';
import { env } from '../config/env';

class RedisMetrics implements CacheMetricsPort {
  private hits = 0;
  private misses = 0;
  recordHit(): void { this.hits++; }
  recordMiss(): void { this.misses++; }
  snapshot() { const total = this.hits + this.misses; return { hits: this.hits, misses: this.misses, hitRate: total ? this.hits / total : 0 }; }
}

export class RedisCache implements CachePort {
  private client: RedisClientType;
  private metrics = new RedisMetrics();
  constructor(private defaultTTLSeconds = 60, redisUrl = env.REDIS_URL) {
    this.client = createClient({ url: redisUrl });
    this.client.connect();
  }

  async get<T>(key: string): Promise<T | undefined> {
    const val = await this.client.get(key);
    if (val === null) { this.metrics.recordMiss(); return undefined; }
    this.metrics.recordHit();
    return JSON.parse(val) as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? this.defaultTTLSeconds;
    await this.client.set(key, JSON.stringify(value), { EX: ttl });
  }

  async del(key: string | string[]): Promise<void> {
    if (Array.isArray(key)) await this.client.del(key);
    else await this.client.del(key);
  }

  stats() { return this.metrics.snapshot(); }
}
