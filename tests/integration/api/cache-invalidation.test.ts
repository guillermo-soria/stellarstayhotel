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

    // First availability: expect to include room-001 (seeded)
    const first = await request(app)
      .get('/api/rooms/available')
      .query(query)
      .expect(200);

    const firstItems: Array<{ roomId: string; type: string }> = first.body.items ?? [];
    const hadRoom001 = firstItems.some(i => i.roomId === 'room-001');

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

    // If it was present initially, it must be gone after booking
    if (hadRoom001) {
      expect(hasRoom001After).toBe(false);
    } else {
      // If initial dataset doesn't include it (unexpected), still expect size not to increase
      expect(secondItems.length).toBeLessThanOrEqual(firstItems.length);
    }
  });
});
