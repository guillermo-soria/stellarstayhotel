import { CreateReservation } from '../../src/application/use-cases/new-create-reservation';
import { NewInMemoryReservationRepository } from '../../src/infrastructure/repositories/new-in-memory-reservation.repository';
import { NewInMemoryRoomRepository } from '../../src/infrastructure/repositories/new-in-memory-room.repository';
import { PricingEngine } from '../../src/domain/services/pricing-engine';

describe('CreateReservation Use Case', () => {
  let createReservation: CreateReservation;
  let reservationRepo: NewInMemoryReservationRepository;
  let roomRepo: NewInMemoryRoomRepository;
  let pricingEngine: PricingEngine;

  beforeEach(() => {
    // Create fresh instances for each test to avoid shared state
    reservationRepo = new NewInMemoryReservationRepository();
    roomRepo = new NewInMemoryRoomRepository();
    pricingEngine = new PricingEngine();
    
    createReservation = new CreateReservation(
      reservationRepo,
      roomRepo,
      pricingEngine
    );
  });

  const createDate = (dateStr: string): Date => new Date(dateStr + 'T00:00:00Z');

  describe('Successful Reservation Creation', () => {
    it('should create a valid reservation with all business rules applied', async () => {
      const input = {
        idempotencyKey: 'test-key-unique-001',
        roomId: 'r-101',
        type: 'junior' as const,
        checkIn: createDate('2025-01-10'), // Use future dates
        checkOut: createDate('2025-01-12'),
        guests: 2,
        breakfast: true
      };

      const result = await createReservation.execute(input);

      expect(result.created).toBe(true);
      expect(result.reservation).toBeDefined();
      
      const reservation = result.reservation;
      expect(reservation.id).toBeDefined();
      expect(reservation.roomId).toBe('r-101');
      expect(reservation.checkIn).toEqual(input.checkIn);
      expect(reservation.checkOut).toEqual(input.checkOut);
      expect(reservation.guests).toBe(2);
      expect(reservation.breakfast).toBe(true);
      expect(reservation.totalCents).toBeGreaterThan(0);
      expect(reservation.status).toBe('CONFIRMED');
      expect(reservation.createdAt).toBeDefined();
    });

    it('should calculate correct pricing for reservation', async () => {
      const input = {
        idempotencyKey: 'pricing-test-unique-002',
        roomId: 'r-102', // Use different room
        type: 'junior' as const,
        checkIn: createDate('2025-01-15'), // Use future dates
        checkOut: createDate('2025-01-17'),
        guests: 2,
        breakfast: true
      };

      const result = await createReservation.execute(input);
      
      expect(result.created).toBe(true);
      
      // 2 nights * $60 + breakfast (2 guests * 2 nights * $5)
      const expectedTotal = 12000 + 2000; // $120 + $20 = $140
      expect(result.reservation.totalCents).toBe(expectedTotal);
    });
  });

  describe('Idempotency', () => {
    it('should return same result for duplicate idempotency key', async () => {
      const input = {
        idempotencyKey: 'duplicate-key-unique-003',
        roomId: 'r-102', // Use existing room
        type: 'junior' as const,
        checkIn: createDate('2025-01-20'),
        checkOut: createDate('2025-01-22'),
        guests: 2,
        breakfast: true
      };

      // First request
      const firstResult = await createReservation.execute(input);
      expect(firstResult.created).toBe(true);

      // Second request with same idempotency key
      const secondResult = await createReservation.execute(input);
      expect(secondResult.created).toBe(false); // Not created, returned existing

      expect(secondResult.reservation.id).toBe(firstResult.reservation.id);
      expect(secondResult.reservation.totalCents).toBe(firstResult.reservation.totalCents);
    });

    it('should create different reservations for different idempotency keys', async () => {
      const baseInput = {
        roomId: 'r-201',
        type: 'king' as const,
        checkIn: createDate('2025-01-25'),
        checkOut: createDate('2025-01-27'),
        guests: 2,
        breakfast: false
      };

      const firstResult = await createReservation.execute({
        ...baseInput,
        idempotencyKey: 'key-unique-004'
      });

      // Use different room and dates for second reservation
      const secondResult = await createReservation.execute({
        ...baseInput,
        roomId: 'r-202', // Different room
        checkIn: createDate('2025-01-30'),
        checkOut: createDate('2025-02-01'),
        idempotencyKey: 'key-unique-005'
      });

      expect(firstResult.created).toBe(true);
      expect(secondResult.created).toBe(true);
      expect(secondResult.reservation.id).not.toBe(firstResult.reservation.id);
    });
  });

  describe('Validation Errors', () => {
    it('should reject reservation for non-existent room', async () => {
      const input = {
        idempotencyKey: 'invalid-room-unique-006',
        roomId: 'non-existent-room',
        type: 'junior' as const,
        checkIn: createDate('2025-02-05'),
        checkOut: createDate('2025-02-07'),
        guests: 2,
        breakfast: false
      };

      await expect(createReservation.execute(input)).rejects.toThrow('ROOM_NOT_FOUND');
    });

    it('should reject reservation with mismatched room type', async () => {
      const input = {
        idempotencyKey: 'type-mismatch-unique-007',
        roomId: 'r-101', // junior room
        type: 'presidential' as const, // wrong type
        checkIn: createDate('2025-02-10'),
        checkOut: createDate('2025-02-12'),
        guests: 2,
        breakfast: false
      };

      await expect(createReservation.execute(input)).rejects.toThrow('ROOM_TYPE_MISMATCH');
    });

    it('should reject reservation exceeding room capacity', async () => {
      const input = {
        idempotencyKey: 'capacity-exceeded-unique-008',
        roomId: 'r-101', // junior room (capacity 2)
        type: 'junior' as const,
        checkIn: createDate('2025-02-15'),
        checkOut: createDate('2025-02-17'),
        guests: 5, // exceeds capacity
        breakfast: false
      };

      await expect(createReservation.execute(input)).rejects.toThrow('OVER_CAPACITY');
    });

    it('should reject reservation with invalid date range', async () => {
      const input = {
        idempotencyKey: 'invalid-dates-unique-009',
        roomId: 'r-101',
        type: 'junior' as const,
        checkIn: createDate('2025-02-20'),
        checkOut: createDate('2025-02-18'), // checkout before checkin
        guests: 2,
        breakfast: false
      };

      await expect(createReservation.execute(input)).rejects.toThrow('INVALID_RANGE');
    });
  });

  describe('Room Availability Conflicts', () => {
    it('should reject reservation for unavailable room', async () => {
      // Create first reservation
      const firstReservation = {
        idempotencyKey: 'first-booking-unique-010',
        roomId: 'r-101', // Use existing room
        type: 'junior' as const,
        checkIn: createDate('2025-03-01'),
        checkOut: createDate('2025-03-03'),
        guests: 2,
        breakfast: false
      };

      const firstResult = await createReservation.execute(firstReservation);
      expect(firstResult.created).toBe(true);

      // Try to create overlapping reservation
      const conflictingReservation = {
        idempotencyKey: 'conflicting-booking-unique-011',
        roomId: 'r-101', // Same room
        type: 'junior' as const,
        checkIn: createDate('2025-03-02'), // overlaps with first reservation
        checkOut: createDate('2025-03-04'),
        guests: 1,
        breakfast: false
      };

      await expect(createReservation.execute(conflictingReservation)).rejects.toThrow('DATE_OVERLAP');
    });

    it('should allow back-to-back reservations', async () => {
      // Create first reservation
      const firstReservation = {
        idempotencyKey: 'first-sequential-unique-012',
        roomId: 'r-201', // Use existing room
        type: 'king' as const,
        checkIn: createDate('2025-03-10'),
        checkOut: createDate('2025-03-12'),
        guests: 2,
        breakfast: false
      };

      const firstResult = await createReservation.execute(firstReservation);
      expect(firstResult.created).toBe(true);

      // Create back-to-back reservation (checkout = checkin)
      const sequentialReservation = {
        idempotencyKey: 'second-sequential-unique-013',
        roomId: 'r-201', // Same room
        type: 'king' as const,
        checkIn: createDate('2025-03-12'), // same as first checkout
        checkOut: createDate('2025-03-14'),
        guests: 2,
        breakfast: false
      };

      const sequentialResult = await createReservation.execute(sequentialReservation);
      expect(sequentialResult.created).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single night reservation', async () => {
      const input = {
        idempotencyKey: 'single-night-unique-014',
        roomId: 'r-301',
        type: 'presidential' as const,
        checkIn: createDate('2025-03-15'), // Saturday
        checkOut: createDate('2025-03-16'),
        guests: 1,
        breakfast: false
      };

      const result = await createReservation.execute(input);

      expect(result.created).toBe(true);
      // Presidential room on Saturday: $150 + 25% weekend uplift
      const expectedTotal = 15000 + 3750; // $150 + $37.50 = $187.50
      expect(result.reservation.totalCents).toBe(expectedTotal);
    });

    it('should handle maximum capacity booking', async () => {
      const input = {
        idempotencyKey: 'max-capacity-unique-015',
        roomId: 'r-302',
        type: 'presidential' as const,
        checkIn: createDate('2025-03-20'),
        checkOut: createDate('2025-03-21'),
        guests: 5, // max capacity for presidential
        breakfast: true
      };

      const result = await createReservation.execute(input);

      expect(result.created).toBe(true);
      expect(result.reservation.guests).toBe(5);
      // Should include breakfast for all 5 guests
      const breakfastCost = 5 * 1 * 500; // 5 guests * 1 night * $5
      expect(result.reservation.totalCents).toBeGreaterThan(15000 + breakfastCost);
    });

    it('should handle long stay with discounts', async () => {
      const input = {
        idempotencyKey: 'long-stay-unique-016',
        roomId: 'r-105',
        type: 'junior' as const,
        checkIn: createDate('2025-04-01'),
        checkOut: createDate('2025-04-11'), // 10 nights
        guests: 2,
        breakfast: false
      };

      const result = await createReservation.execute(input);

      expect(result.created).toBe(true);
      // 10 nights should get $12/night discount
      expect(result.reservation.totalCents).toBeLessThan(10 * 6000); // Less than base price
    });
  });
});
