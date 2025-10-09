import { RoomRepoPort, FindAvailableParams, RoomSummary } from '../../application/ports/room-repo.port';
import { CachePort } from '../../application/ports/cache.port';

const buildAvailKey = (p: FindAvailableParams, version: number) =>
  `avail:v${version}:${p.checkIn.toISOString().slice(0,10)}:${p.checkOut.toISOString().slice(0,10)}:${p.guests}:${p.type ?? 'any'}:${p.limit ?? '20'}:${p.cursor ?? '0'}`;

export class CachedRoomRepository implements RoomRepoPort {
  constructor(private inner: RoomRepoPort, private cache: CachePort, private versionProvider: () => number, private ttlSeconds = 60) {}

  async getById(id: string): Promise<RoomSummary | null> {
    // Simple pass-through for now (could add per-room cache later)
    return this.inner.getById(id);
  }

  async findAvailable(params: FindAvailableParams): Promise<{ items: RoomSummary[]; nextCursor: string | null }> {
    const version = this.versionProvider();
    const key = buildAvailKey(params, version);
    const cached = await this.cache.get<{ items: RoomSummary[]; nextCursor: string | null }>(key);
    if (cached) return cached;

    const fresh = await this.inner.findAvailable(params);
    await this.cache.set(key, fresh, this.ttlSeconds);
    return fresh;
  }
}
