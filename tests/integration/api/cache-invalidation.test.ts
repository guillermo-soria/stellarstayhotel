import request from 'supertest';
import express from 'express';
import { router } from '../../../src/adapters/http/routes';
import { errorMiddleware } from '../../../src/infrastructure/errors/error-middleware';
import { reservationRepo } from '../../../src/infrastructure/container';

/**
 * Integration test to verify cache invalidation on reservation creation.
 * Flow:
 *  - Query availability for a given range/type (fills cache vN)
 *  - Create a reservation overlapping that range for room-001
 *  - Query availability again with same params (should be vN+1 key -> recompute)
 *  - Assert room-001 is not present anymore
 */
describe('Cache invalidation on reservation', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/', router);
    app.use(errorMiddleware);
  });

  beforeEach(async () => {
    await reservationRepo.clearAll();
  });

  it('removes booked room from availability on subsequent query', async () => {
    const query = {
      checkIn: '2031-01-10',
      checkOut: '2031-01-12',
      guests: 2,
      type: 'junior'
    } as const;

    // Snapshot readiness (to read cache metrics/version)
    const readyBefore = await request(app).get('/ready').expect(200);
    const versionBefore: number | undefined = readyBefore.body?.checks?.cache?.availabilityVersion;

    // First availability: expect to include room-001 (seeded)
    const first = await request(app)
      .get('/api/rooms/available')
      .query(query)
      .expect(200);

    const firstItems: Array<{ roomId: string; type: string }> = first.body.items ?? [];
    const hadRoom001 = firstItems.some(i => i.roomId === 'room-001');
    expect(hadRoom001).toBe(true);

    // Create reservation for room-001 overlapping same range
    const reservationData = {
      roomId: 'room-001',
      type: 'junior',
      checkIn: query.checkIn,
      checkOut: query.checkOut,
      guests: query.guests,
      breakfast: false,
    };

    await request(app)
      .post('/api/reservations')
      .set('Idempotency-Key', `cache-inv-${Date.now()}`)
      .send(reservationData)
      .expect(201);

    // Second availability: should exclude room-001 now
    const second = await request(app)
      .get('/api/rooms/available')
      .query(query)
      .expect(200);

    const secondItems: Array<{ roomId: string; type: string }> = second.body.items ?? [];
    const hasRoom001After = secondItems.some(i => i.roomId === 'room-001');

    expect(hasRoom001After).toBe(false);

    // Version should have increased at least by 1
    const readyAfter = await request(app).get('/ready').expect(200);
    const versionAfter: number | undefined = readyAfter.body?.checks?.cache?.availabilityVersion;
    if (typeof versionBefore === 'number' && typeof versionAfter === 'number') {
      expect(versionAfter).toBeGreaterThan(versionBefore);
    }
  });
});
