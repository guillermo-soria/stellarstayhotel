import request from 'supertest';
import express from 'express';
import { router } from '../../../src/adapters/http/routes';
import { errorMiddleware } from '../../../src/infrastructure/errors/error-middleware';
import { reservationsRepo } from '../../../src/adapters/http/controllers/reservations.controller';

describe('API Routes Integration', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/', router);
    app.use(errorMiddleware);
  });

  beforeEach(() => {
    // Clear repository state between tests
    reservationsRepo.clearAll();
  });

  describe('Health Endpoints', () => {
    it('GET /health should return 200', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });

    it('GET /ready should return readiness status', async () => {
      const response = await request(app)
        .get('/ready');

      // Ready endpoint can return 200 (ready) or 503 (not ready)
      expect([200, 503]).toContain(response.status);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('checks');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('responseTime');
    });
  });

  describe('Room Availability API', () => {
    it('GET /api/rooms/available should return available rooms', async () => {
      const response = await request(app)
        .get('/api/rooms/available')
        .query({
          checkIn: '2024-12-01',
          checkOut: '2024-12-03',
          guests: 2,
          type: 'junior'
        })
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    it('should validate required parameters', async () => {
      await request(app)
        .get('/api/rooms/available')
        .query({
          checkIn: '2024-12-01',
          // Missing checkOut, guests
        })
        .expect(400);
    });
  });

  describe('Reservation API', () => {
    it('POST /api/reservations should create reservation', async () => {
      const reservationData = {
        roomId: 'r-101',
        type: 'junior',
        checkIn: '2024-12-01',
        checkOut: '2024-12-03',
        guests: 2,
        breakfast: true
      };

      const response = await request(app)
        .post('/api/reservations')
        .set('Idempotency-Key', 'test-key-123')
        .send(reservationData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('status', 'CONFIRMED');
    });

    it('should enforce idempotency', async () => {
      const reservationData = {
        roomId: 'r-102',
        type: 'junior',
        checkIn: '2024-12-04',
        checkOut: '2024-12-06',
        guests: 2,
        breakfast: false
      };

      // First request
      const response1 = await request(app)
        .post('/api/reservations')
        .set('Idempotency-Key', 'idempotent-key-456')
        .send(reservationData)
        .expect(201);

      // Second request with same key
      const response2 = await request(app)
        .post('/api/reservations')
        .set('Idempotency-Key', 'idempotent-key-456')
        .send(reservationData)
        .expect(200); // Should return existing reservation

      expect(response1.body.id).toBe(response2.body.id);
    });
  });
});
