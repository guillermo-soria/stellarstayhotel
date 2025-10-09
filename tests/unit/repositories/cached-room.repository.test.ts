import { CachedRoomRepository } from '../../../src/infrastructure/repositories/cached-room.repository';
import { InMemoryCache } from '../../../src/infrastructure/cache/in-memory.cache';
import type { RoomRepoPort, FindAvailableParams, RoomSummary } from '../../../src/application/ports/room-repo.port';

class FakeRoomRepo implements RoomRepoPort {
  public calls = 0;
  private rooms: RoomSummary[];
  constructor() {
    this.rooms = [
      { id: 'room-001', number: 'room-001', type: 'king', capacity: 3 },
      { id: 'room-002', number: 'room-002', type: 'junior', capacity: 2 },
    ];
  }
  async findAvailable(_p: FindAvailableParams): Promise<{ items: RoomSummary[]; nextCursor: string | null }> {
    this.calls++;
    return { items: this.rooms, nextCursor: null };
  }
  async getById(id: string): Promise<RoomSummary | null> {
    return this.rooms.find(r => r.id === id) ?? null;
  }
}

describe('CachedRoomRepository', () => {
  test('returns cached result for same params and version (hit)', async () => {
    const inner = new FakeRoomRepo();
    const cache = new InMemoryCache(60);
    let version = 0;
    const repo = new CachedRoomRepository(inner, cache, () => version, 60);

    const params: FindAvailableParams = {
      checkIn: new Date('2030-01-01'),
      checkOut: new Date('2030-01-05'),
      guests: 2,
      type: 'king',
      limit: 20,
      cursor: null,
    };

    const first = await repo.findAvailable(params);
    const second = await repo.findAvailable(params);

    expect(inner.calls).toBe(1);
    expect(second).toEqual(first);
  });

  test('misses cache when version changes (invalidation)', async () => {
    const inner = new FakeRoomRepo();
    const cache = new InMemoryCache(60);
    let version = 0;
    const repo = new CachedRoomRepository(inner, cache, () => version, 60);

    const params: FindAvailableParams = {
      checkIn: new Date('2030-02-01'),
      checkOut: new Date('2030-02-03'),
      guests: 2,
      type: 'junior',
      limit: 20,
      cursor: null,
    };

    await repo.findAvailable(params); // populate
    version++; // simulate invalidation
    await repo.findAvailable(params); // fetch again

    expect(inner.calls).toBe(2);
  });

  test('TTL expiration evicts entries', async () => {
    jest.useFakeTimers();
    const inner = new FakeRoomRepo();
    const cache = new InMemoryCache(1); // 1s TTL
    let version = 0;
    const repo = new CachedRoomRepository(inner, cache, () => version, 1);

    const params: FindAvailableParams = {
      checkIn: new Date('2030-03-01'),
      checkOut: new Date('2030-03-02'),
      guests: 2,
      limit: 20,
      cursor: null,
    };

    await repo.findAvailable(params);
    // advance time beyond TTL
    jest.advanceTimersByTime(1500);
    await repo.findAvailable(params);

    expect(inner.calls).toBe(2);

    jest.useRealTimers();
  });
});
