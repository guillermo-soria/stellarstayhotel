import { NewInMemoryReservationRepository } from '../../../src/infrastructure/repositories/new-in-memory-reservation.repository';
import { CreateReservationParams, ReservationDTO } from '../../../src/application/ports/reservation-repo.port';

describe('NewInMemoryReservationRepository', () => {
  let repository: NewInMemoryReservationRepository;

  // Helper function to create test dates
  const createDate = (dateStr: string): Date => new Date(dateStr + 'T00:00:00Z');
  
  beforeEach(() => {
    repository = new NewInMemoryReservationRepository();
    repository.clearAll(); // Clear any existing data from previous tests
  });

  describe('create', () => {
    it('should create a new reservation with all required fields', async () => {
      const params: CreateReservationParams = {
        roomId: 'r-101',
        checkIn: createDate('2024-12-01'),
        checkOut: createDate('2024-12-03'),
        guests: 2,
        breakfast: true,
        totalCents: 15000,
        idempotencyKey: 'test-key-001'
      };

      const reservation = await repository.create(params);

      expect(reservation).toBeDefined();
      expect(reservation.id).toBeTruthy();
      expect(reservation.roomId).toBe(params.roomId);
      expect(reservation.checkIn).toEqual(params.checkIn);
      expect(reservation.checkOut).toEqual(params.checkOut);
      expect(reservation.guests).toBe(params.guests);
      expect(reservation.breakfast).toBe(params.breakfast);
      expect(reservation.totalCents).toBe(params.totalCents);
      expect(reservation.status).toBe('CONFIRMED');
      expect(reservation.createdAt).toBeInstanceOf(Date);
      expect(reservation.idempotencyKey).toBe(params.idempotencyKey);
    });

    it('should generate unique IDs for different reservations', async () => {
      const params1: CreateReservationParams = {
        roomId: 'r-101',
        checkIn: createDate('2024-12-01'),
        checkOut: createDate('2024-12-03'),
        guests: 2,
        breakfast: false,
        totalCents: 12000,
        idempotencyKey: 'key-001'
      };

      const params2: CreateReservationParams = {
        roomId: 'r-102',
        checkIn: createDate('2024-12-05'),
        checkOut: createDate('2024-12-07'),
        guests: 1,
        breakfast: true,
        totalCents: 8000,
        idempotencyKey: 'key-002'
      };

      const reservation1 = await repository.create(params1);
      const reservation2 = await repository.create(params2);

      expect(reservation1.id).not.toBe(reservation2.id);
      expect(reservation1.roomId).toBe('r-101');
      expect(reservation2.roomId).toBe('r-102');
    });

    it('should handle reservation without idempotency key', async () => {
      const params: CreateReservationParams = {
        roomId: 'r-201',
        checkIn: createDate('2024-12-10'),
        checkOut: createDate('2024-12-12'),
        guests: 3,
        breakfast: false,
        totalCents: 18000,
        idempotencyKey: '' // Empty string for this test
      };

      const reservation = await repository.create(params);

      expect(reservation).toBeDefined();
      expect(reservation.idempotencyKey).toBe('');
      expect(reservation.roomId).toBe('r-201');
    });

    it('should handle falsy breakfast value correctly', async () => {
      const params: CreateReservationParams = {
        roomId: 'r-101',
        checkIn: createDate('2024-12-01'),
        checkOut: createDate('2024-12-02'),
        guests: 1,
        breakfast: false,
        totalCents: 6000,
        idempotencyKey: 'breakfast-false-test'
      };

      const reservation = await repository.create(params);

      expect(reservation.breakfast).toBe(false);
    });
  });

  describe('Idempotency', () => {
    it('should return same reservation for duplicate idempotency key', async () => {
      const params: CreateReservationParams = {
        roomId: 'r-101',
        checkIn: createDate('2024-12-01'),
        checkOut: createDate('2024-12-03'),
        guests: 2,
        breakfast: true,
        totalCents: 15000,
        idempotencyKey: 'duplicate-test'
      };

      const firstCall = await repository.create(params);
      const secondCall = await repository.create(params);

      expect(firstCall).toEqual(secondCall);
      expect(firstCall.id).toBe(secondCall.id);
    });

    it('should ignore parameter changes for existing idempotency key', async () => {
      const originalParams: CreateReservationParams = {
        roomId: 'r-101',
        checkIn: createDate('2024-12-01'),
        checkOut: createDate('2024-12-03'),
        guests: 2,
        breakfast: true,
        totalCents: 15000,
        idempotencyKey: 'ignore-changes-test'
      };

      const modifiedParams: CreateReservationParams = {
        roomId: 'r-999', // Different room
        checkIn: createDate('2024-12-10'), // Different dates
        checkOut: createDate('2024-12-15'),
        guests: 5, // Different guests
        breakfast: false, // Different breakfast
        totalCents: 99999, // Different total
        idempotencyKey: 'ignore-changes-test' // Same key
      };

      const firstReservation = await repository.create(originalParams);
      const secondReservation = await repository.create(modifiedParams);

      // Should return original reservation, ignoring modified params
      expect(secondReservation).toEqual(firstReservation);
      expect(secondReservation.roomId).toBe('r-101'); // Original value
      expect(secondReservation.totalCents).toBe(15000); // Original value
    });

    it('should create different reservations for different idempotency keys', async () => {
      const params1: CreateReservationParams = {
        roomId: 'r-101',
        checkIn: createDate('2024-12-01'),
        checkOut: createDate('2024-12-03'),
        guests: 2,
        breakfast: true,
        totalCents: 15000,
        idempotencyKey: 'key-1'
      };

      const params2: CreateReservationParams = {
        ...params1,
        idempotencyKey: 'key-2'
      };

      const reservation1 = await repository.create(params1);
      const reservation2 = await repository.create(params2);

      expect(reservation1.id).not.toBe(reservation2.id);
      expect(reservation1.idempotencyKey).toBe('key-1');
      expect(reservation2.idempotencyKey).toBe('key-2');
    });
  });

  describe('getById', () => {
    it('should return reservation when valid id is provided', async () => {
      const params: CreateReservationParams = {
        roomId: 'r-101',
        checkIn: createDate('2024-12-01'),
        checkOut: createDate('2024-12-03'),
        guests: 2,
        breakfast: true,
        totalCents: 15000,
        idempotencyKey: 'get-by-id-test'
      };

      const created = await repository.create(params);
      const retrieved = await repository.getById(created.id);

      expect(retrieved).toEqual(created);
    });

    it('should return null when reservation does not exist', async () => {
      const result = await repository.getById('non-existent-id');
      expect(result).toBeNull();
    });

    it('should return null for empty string id', async () => {
      const result = await repository.getById('');
      expect(result).toBeNull();
    });
  });

  describe('findByIdempotencyKey', () => {
    it('should return reservation when valid idempotency key is provided', async () => {
      const params: CreateReservationParams = {
        roomId: 'r-101',
        checkIn: createDate('2024-12-01'),
        checkOut: createDate('2024-12-03'),
        guests: 2,
        breakfast: true,
        totalCents: 15000,
        idempotencyKey: 'find-by-key-test'
      };

      const created = await repository.create(params);
      const retrieved = await repository.findByIdempotencyKey('find-by-key-test');

      expect(retrieved).toEqual(created);
    });

    it('should return null when idempotency key does not exist', async () => {
      const result = await repository.findByIdempotencyKey('non-existent-key');
      expect(result).toBeNull();
    });

    it('should return null for reservation created with empty idempotency key', async () => {
      const params: CreateReservationParams = {
        roomId: 'r-101',
        checkIn: createDate('2024-12-01'),
        checkOut: createDate('2024-12-03'),
        guests: 2,
        breakfast: true,
        totalCents: 15000,
        idempotencyKey: ''
      };

      await repository.create(params);
      const result = await repository.findByIdempotencyKey('any-key');

      expect(result).toBeNull();
    });
  });

  describe('hasOverlap', () => {
    beforeEach(async () => {
      // Create some test reservations
      await repository.create({
        roomId: 'r-101',
        checkIn: createDate('2024-12-05'),
        checkOut: createDate('2024-12-10'),
        guests: 2,
        breakfast: false,
        totalCents: 15000,
        idempotencyKey: 'overlap-test-1'
      });

      await repository.create({
        roomId: 'r-101',
        checkIn: createDate('2024-12-15'),
        checkOut: createDate('2024-12-20'),
        guests: 2,
        breakfast: false,
        totalCents: 15000,
        idempotencyKey: 'overlap-test-2'
      });

      await repository.create({
        roomId: 'r-102',
        checkIn: createDate('2024-12-05'),
        checkOut: createDate('2024-12-10'),
        guests: 1,
        breakfast: false,
        totalCents: 10000,
        idempotencyKey: 'overlap-test-3'
      });
    });

    describe('Overlapping reservations', () => {
      it('should detect overlap when new reservation is completely within existing', async () => {
        const hasOverlap = await repository.hasOverlap(
          'r-101',
          createDate('2024-12-06'),
          createDate('2024-12-08')
        );

        expect(hasOverlap).toBe(true);
      });

      it('should detect overlap when new reservation completely contains existing', async () => {
        const hasOverlap = await repository.hasOverlap(
          'r-101',
          createDate('2024-12-01'),
          createDate('2024-12-25')
        );

        expect(hasOverlap).toBe(true);
      });

      it('should detect overlap when new reservation starts before and ends during existing', async () => {
        const hasOverlap = await repository.hasOverlap(
          'r-101',
          createDate('2024-12-03'),
          createDate('2024-12-07')
        );

        expect(hasOverlap).toBe(true);
      });

      it('should detect overlap when new reservation starts during and ends after existing', async () => {
        const hasOverlap = await repository.hasOverlap(
          'r-101',
          createDate('2024-12-08'),
          createDate('2024-12-12')
        );

        expect(hasOverlap).toBe(true);
      });

      it('should detect overlap when dates are exactly the same', async () => {
        const hasOverlap = await repository.hasOverlap(
          'r-101',
          createDate('2024-12-05'),
          createDate('2024-12-10')
        );

        expect(hasOverlap).toBe(true);
      });
    });

    describe('Non-overlapping reservations', () => {
      it('should not detect overlap for back-to-back reservations (check-out = check-in)', async () => {
        const hasOverlap = await repository.hasOverlap(
          'r-101',
          createDate('2024-12-10'), // Starts when existing ends
          createDate('2024-12-15')
        );

        expect(hasOverlap).toBe(false);
      });

      it('should not detect overlap for reservation ending before existing starts', async () => {
        const hasOverlap = await repository.hasOverlap(
          'r-101',
          createDate('2024-12-01'),
          createDate('2024-12-03') // Ends well before existing starts (Dec 5)
        );

        expect(hasOverlap).toBe(false);
      });

      it('should not detect overlap for reservation starting after existing ends', async () => {
        const hasOverlap = await repository.hasOverlap(
          'r-101',
          createDate('2024-12-20'), // Starts when existing ends
          createDate('2024-12-25')
        );

        expect(hasOverlap).toBe(false);
      });

      it('should not detect overlap for different rooms', async () => {
        const hasOverlap = await repository.hasOverlap(
          'r-999', // Different room
          createDate('2024-12-06'),
          createDate('2024-12-08')
        );

        expect(hasOverlap).toBe(false);
      });

      it('should not detect overlap when no reservations exist for room', async () => {
        const hasOverlap = await repository.hasOverlap(
          'r-301',
          createDate('2024-12-06'),
          createDate('2024-12-08')
        );

        expect(hasOverlap).toBe(false);
      });
    });

    describe('Edge cases', () => {
      it('should handle same check-in and check-out dates', async () => {
        const hasOverlap = await repository.hasOverlap(
          'r-101',
          createDate('2024-12-07'),
          createDate('2024-12-07') // Same day, within existing reservation
        );

        expect(hasOverlap).toBe(true); // Zero-duration within existing should overlap
      });

      it('should handle inverted date range gracefully', async () => {
        const hasOverlap = await repository.hasOverlap(
          'r-101',
          createDate('2024-12-10'), // Later date
          createDate('2024-12-06')  // Earlier date
        );

        // Should not crash, behavior depends on implementation
        expect(typeof hasOverlap).toBe('boolean');
      });

      it('should check overlap across multiple existing reservations', async () => {
        // This overlaps with the first reservation (Dec 5-10)
        const hasOverlap1 = await repository.hasOverlap(
          'r-101',
          createDate('2024-12-08'),
          createDate('2024-12-12')
        );

        // This overlaps with the second reservation (Dec 15-20)
        const hasOverlap2 = await repository.hasOverlap(
          'r-101',
          createDate('2024-12-18'),
          createDate('2024-12-22')
        );

        expect(hasOverlap1).toBe(true);
        expect(hasOverlap2).toBe(true);
      });
    });
  });
});
