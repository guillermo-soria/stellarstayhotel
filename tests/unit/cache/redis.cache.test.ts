import { RedisCache } from '../../../src/infrastructure/cache/redis.cache';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
describe('RedisCache', () => {
  let cache: RedisCache;
  beforeAll(() => {
    cache = new RedisCache(2, REDIS_URL); // TTL 2s para pruebas
  });

  afterAll(async () => {
    await cache['client'].quit();
  });

  it('set and get should store and retrieve values', async () => {
    await cache.set('foo', { bar: 42 });
    const val = await cache.get<{ bar: number }>('foo');
    expect(val).toEqual({ bar: 42 });
  });

  it('should expire values after TTL', async () => {
    await cache.set('expire', 'soon', 1); // 1s TTL
    await new Promise(res => setTimeout(res, 1100));
    const val = await cache.get('expire');
    expect(val).toBeUndefined();
  });

  it('should delete values', async () => {
    await cache.set('todelete', 'bye');
    await cache.del('todelete');
    const val = await cache.get('todelete');
    expect(val).toBeUndefined();
  });

  it('should track hit/miss metrics', async () => {
    await cache.set('metrics', 'ok');
    await cache.get('metrics'); // hit
    await cache.get('metrics'); // hit
    await cache.get('notfound'); // miss
    const stats = cache.stats();
    expect(stats.hits).toBeGreaterThanOrEqual(2);
    expect(stats.misses).toBeGreaterThanOrEqual(1);
    expect(stats.hitRate).toBeGreaterThan(0);
  });
});
