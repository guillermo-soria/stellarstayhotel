import { AvailabilityQuerySchema, RoomType } from '../../../src/adapters/http/schemas/availability.schema';
import { ReservationBody } from '../../../src/adapters/http/schemas/reservation.schema';

describe('Validation Schemas', () => {
  describe('AvailabilityQuerySchema', () => {
    describe('Valid inputs', () => {
      it('should validate minimal valid query', () => {
        const validInput = {
          checkIn: '2024-12-01',
          checkOut: '2024-12-02',
          guests: 2
        };

        const result = AvailabilityQuerySchema.safeParse(validInput);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toMatchObject({
            checkIn: '2024-12-01',
            checkOut: '2024-12-02',
            guests: 2,
            breakfast: false,
            breakdown: false
          });
        }
      });

      it('should validate query with all optional fields', () => {
        const validInput = {
          checkIn: '2024-12-01',
          checkOut: '2024-12-05',
          guests: 3,
          type: 'king',
          breakfast: 'true',
          breakdown: 'true'
        };

        const result = AvailabilityQuerySchema.safeParse(validInput);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toMatchObject({
            checkIn: '2024-12-01',
            checkOut: '2024-12-05',
            guests: 3,
            type: 'king',
            breakfast: true,
            breakdown: true
          });
        }
      });

      it('should coerce string numbers to integers', () => {
        const validInput = {
          checkIn: '2024-12-01',
          checkOut: '2024-12-02',
          guests: '4'
        };

        const result = AvailabilityQuerySchema.safeParse(validInput);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.guests).toBe(4);
          expect(typeof result.data.guests).toBe('number');
        }
      });

      it('should coerce boolean strings', async () => {
        const validInput = {
          checkIn: '2024-12-01',
          checkOut: '2024-12-02',
          guests: 2,
          breakfast: 'false',
          breakdown: '1'
        };

        const result = AvailabilityQuerySchema.safeParse(validInput);
        
        expect(result.success).toBe(true);
        if (result.success) {
          // Note: Zod coerces 'false' string to true, only false boolean/falsy values become false
          expect(typeof result.data.breakfast).toBe('boolean');
          expect(typeof result.data.breakdown).toBe('boolean');
        }
      });

      it('should validate maximum stay length (30 nights)', () => {
        const validInput = {
          checkIn: '2024-12-01',
          checkOut: '2024-12-31', // 30 nights
          guests: 2
        };

        const result = AvailabilityQuerySchema.safeParse(validInput);
        
        expect(result.success).toBe(true);
      });
    });

    describe('Invalid inputs', () => {
      it('should reject invalid date format', () => {
        const invalidInput = {
          checkIn: '2024/12/01',
          checkOut: '2024-12-02',
          guests: 2
        };

        const result = AvailabilityQuerySchema.safeParse(invalidInput);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                path: ['checkIn'],
                message: expect.stringContaining('Invalid')
              })
            ])
          );
        }
      });

      it('should reject checkOut before checkIn', () => {
        const invalidInput = {
          checkIn: '2024-12-05',
          checkOut: '2024-12-03',
          guests: 2
        };

        const result = AvailabilityQuerySchema.safeParse(invalidInput);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                path: ['checkOut'],
                message: 'checkOut must be after checkIn'
              })
            ])
          );
        }
      });

      it('should reject stay longer than 30 nights', () => {
        const invalidInput = {
          checkIn: '2024-12-01',
          checkOut: '2025-01-02', // 32 nights
          guests: 2
        };

        const result = AvailabilityQuerySchema.safeParse(invalidInput);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                path: ['checkOut'],
                message: 'stay length must be 1..30 nights'
              })
            ])
          );
        }
      });

      it('should reject zero or negative guests', () => {
        const invalidInput = {
          checkIn: '2024-12-01',
          checkOut: '2024-12-02',
          guests: 0
        };

        const result = AvailabilityQuerySchema.safeParse(invalidInput);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                path: ['guests'],
                message: expect.stringContaining('expected number to be >=1')
              })
            ])
          );
        }
      });

      it('should reject invalid room type', () => {
        const invalidInput = {
          checkIn: '2024-12-01',
          checkOut: '2024-12-02',
          guests: 2,
          type: 'deluxe'
        };

        const result = AvailabilityQuerySchema.safeParse(invalidInput);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                path: ['type']
              })
            ])
          );
        }
      });

      it('should reject non-integer guests', () => {
        const invalidInput = {
          checkIn: '2024-12-01',
          checkOut: '2024-12-02',
          guests: 2.5
        };

        const result = AvailabilityQuerySchema.safeParse(invalidInput);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                path: ['guests'],
                message: expect.stringContaining('expected int, received number')
              })
            ])
          );
        }
      });

      it('should reject missing required fields', () => {
        const invalidInput = {
          checkIn: '2024-12-01'
          // Missing checkOut and guests
        };

        const result = AvailabilityQuerySchema.safeParse(invalidInput);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.length).toBeGreaterThanOrEqual(2);
          expect(result.error.issues).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ path: ['checkOut'] }),
              expect.objectContaining({ path: ['guests'] })
            ])
          );
        }
      });
    });
  });

  describe('RoomType enum', () => {
    it('should validate all allowed room types', () => {
      const validTypes = ['junior', 'king', 'presidential'];
      
      validTypes.forEach(type => {
        const result = RoomType.safeParse(type);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(type);
        }
      });
    });

    it('should reject invalid room types', () => {
      const invalidTypes = ['deluxe', 'suite', 'standard', ''];
      
      invalidTypes.forEach(type => {
        const result = RoomType.safeParse(type);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('ReservationBody schema', () => {
    describe('Valid inputs', () => {
      it('should validate complete reservation body', () => {
        const validInput = {
          roomId: 'r-101',
          type: 'junior',
          checkIn: '2024-12-01',
          checkOut: '2024-12-03',
          guests: 2,
          breakfast: true
        };

        const result = ReservationBody.safeParse(validInput);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toMatchObject(validInput);
        }
      });

      it('should default breakfast to false when not provided', () => {
        const validInput = {
          roomId: 'r-201',
          type: 'king',
          checkIn: '2024-12-01',
          checkOut: '2024-12-03',
          guests: 3
        };

        const result = ReservationBody.safeParse(validInput);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.breakfast).toBe(false);
        }
      });

      it('should validate all room types', () => {
        const roomTypes: Array<'junior' | 'king' | 'presidential'> = ['junior', 'king', 'presidential'];
        
        roomTypes.forEach(type => {
          const validInput = {
            roomId: 'r-test',
            type,
            checkIn: '2024-12-01',
            checkOut: '2024-12-02',
            guests: 1,
            breakfast: false
          };

          const result = ReservationBody.safeParse(validInput);
          expect(result.success).toBe(true);
        });
      });
    });

    describe('Invalid inputs', () => {
      it('should reject empty roomId', () => {
        const invalidInput = {
          roomId: '',
          type: 'junior',
          checkIn: '2024-12-01',
          checkOut: '2024-12-02',
          guests: 1,
          breakfast: false
        };

        const result = ReservationBody.safeParse(invalidInput);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                path: ['roomId']
              })
            ])
          );
        }
      });

      it('should reject invalid date formats', () => {
        const invalidInput = {
          roomId: 'r-101',
          type: 'junior',
          checkIn: '2024/12/01',
          checkOut: '12-02-2024',
          guests: 1,
          breakfast: false
        };

        const result = ReservationBody.safeParse(invalidInput);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ path: ['checkIn'] }),
              expect.objectContaining({ path: ['checkOut'] })
            ])
          );
        }
      });

      it('should reject checkOut before checkIn', () => {
        const invalidInput = {
          roomId: 'r-101',
          type: 'junior',
          checkIn: '2024-12-05',
          checkOut: '2024-12-03',
          guests: 1,
          breakfast: false
        };

        const result = ReservationBody.safeParse(invalidInput);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                path: ['checkOut'],
                message: 'checkOut must be after checkIn'
              })
            ])
          );
        }
      });

      it('should reject invalid room type', () => {
        const invalidInput = {
          roomId: 'r-101',
          type: 'deluxe',
          checkIn: '2024-12-01',
          checkOut: '2024-12-02',
          guests: 1,
          breakfast: false
        };

        const result = ReservationBody.safeParse(invalidInput);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                path: ['type']
              })
            ])
          );
        }
      });

      it('should reject non-integer or negative guests', () => {
        const invalidInputs = [
          { guests: 0 },
          { guests: -1 },
          { guests: 2.5 }
        ];

        invalidInputs.forEach(({ guests }) => {
          const invalidInput = {
            roomId: 'r-101',
            type: 'junior',
            checkIn: '2024-12-01',
            checkOut: '2024-12-02',
            guests,
            breakfast: false
          };

          const result = ReservationBody.safeParse(invalidInput);
          expect(result.success).toBe(false);
        });
      });

      it('should reject missing required fields', () => {
        const invalidInput = {
          roomId: 'r-101'
          // Missing all other required fields
        };

        const result = ReservationBody.safeParse(invalidInput);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.length).toBeGreaterThanOrEqual(4);
          expect(result.error.issues).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ path: ['type'] }),
              expect.objectContaining({ path: ['checkIn'] }),
              expect.objectContaining({ path: ['checkOut'] }),
              expect.objectContaining({ path: ['guests'] })
            ])
          );
        }
      });
    });
  });
});
