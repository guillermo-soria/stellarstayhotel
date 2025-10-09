import request from 'supertest';
import express from 'express';
import { router } from '../../../src/adapters/http/routes';
import { errorMiddleware } from '../../../src/infrastructure/errors/error-middleware';

describe('API Routes Integration', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/', router);
    app.use(errorMiddleware);
  });

  describe('Health Endpoints', () => {
    it('GET /health should return 200', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });

    it('GET /ready should return 200', async () => {
      const response = await request(app)
        .get('/ready')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('checks');
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

      expect(response.body).toHaveProperty('rooms');
      expect(Array.isArray(response.body.rooms)).toBe(true);
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
