import { PricingEngine, RoomType, QuoteInput } from '../../src/domain/services/pricing-engine';

describe('PricingEngine', () => {
  let pricingEngine: PricingEngine;

  beforeEach(() => {
    pricingEngine = new PricingEngine();
  });

  const createDate = (dateStr: string): Date => new Date(dateStr + 'T00:00:00Z');

  describe('Base Pricing Calculation', () => {
    it('should calculate correct base price for junior room on weekdays', () => {
      // Use actual weekdays: Dec 3-5, 2024 (Tuesday-Thursday)
      const quote = pricingEngine.quote({
        roomType: 'junior',
        checkIn: createDate('2024-12-03'),
        checkOut: createDate('2024-12-05'),
        guests: 2,
        breakfast: false
      });

      expect(quote.totalCents).toBe(12000); // 2 nights * $60 = $120
      expect(quote.nights).toBe(2);
      expect(quote.currency).toBe('USD');
      // Should be no weekend uplift
      quote.perNight.forEach(night => {
        expect(night.weekendUpliftCents).toBe(0);
      });
    });

    it('should calculate correct base price for king room on weekdays', () => {
      // Use weekdays: Dec 3-6, 2024 (Tuesday-Friday)
      const quote = pricingEngine.quote({
        roomType: 'king',
        checkIn: createDate('2024-12-03'),
        checkOut: createDate('2024-12-06'),
        guests: 2,
        breakfast: false
      });

      expect(quote.totalCents).toBe(27000); // 3 nights * $90 = $270
      expect(quote.nights).toBe(3);
    });

    it('should calculate correct base price for presidential room on weekday', () => {
      // Use weekday: Dec 3-4, 2024 (Tuesday-Wednesday)
      const quote = pricingEngine.quote({
        roomType: 'presidential',
        checkIn: createDate('2024-12-03'),
        checkOut: createDate('2024-12-04'),
        guests: 2,
        breakfast: false
      });

      expect(quote.totalCents).toBe(15000); // 1 night * $150 = $150
      expect(quote.nights).toBe(1);
    });
  });

  describe('Weekend Uplift (+25%)', () => {
    it('should apply weekend uplift for Saturday night', () => {
      // Saturday Dec 15, 2024 to Sunday Dec 16, 2024
      const quote = pricingEngine.quote({
        roomType: 'junior',
        checkIn: createDate('2024-12-15'),
        checkOut: createDate('2024-12-16'),
        guests: 2,
        breakfast: false
      });

      const basePrice = 6000; // 1 night * $60
      const weekendUplift = 1500; // 25% of $60
      const expectedTotal = basePrice + weekendUplift;

      expect(quote.totalCents).toBe(expectedTotal);
      expect(quote.perNight[0].weekendUpliftCents).toBe(weekendUplift);
    });

    it('should apply weekend uplift for Sunday night', () => {
      // Sunday Dec 22, 2024 to Monday Dec 23, 2024 (Dec 22 is Sunday)
      const quote = pricingEngine.quote({
        roomType: 'junior',
        checkIn: createDate('2024-12-22'),
        checkOut: createDate('2024-12-23'),
        guests: 2,
        breakfast: false
      });

      const basePrice = 6000; // 1 night * $60
      const weekendUplift = 1500; // 25% of $60
      const expectedTotal = basePrice + weekendUplift;

      expect(quote.totalCents).toBe(expectedTotal);
      expect(quote.perNight[0].weekendUpliftCents).toBe(weekendUplift);
    });

    it('should not apply weekend uplift for weekday nights', () => {
      // Tuesday Dec 3, 2024 to Thursday Dec 5, 2024
      const quote = pricingEngine.quote({
        roomType: 'junior',
        checkIn: createDate('2024-12-03'),
        checkOut: createDate('2024-12-05'),
        guests: 2,
        breakfast: false
      });

      expect(quote.totalCents).toBe(12000); // Base price only
      quote.perNight.forEach(night => {
        expect(night.weekendUpliftCents).toBe(0);
      });
    });

    it('should apply partial weekend uplift for mixed stay', () => {
      // Friday Dec 6, 2024 to Monday Dec 9, 2024 (includes weekend)
      const quote = pricingEngine.quote({
        roomType: 'junior',
        checkIn: createDate('2024-12-06'),
        checkOut: createDate('2024-12-09'),
        guests: 2,
        breakfast: false
      });

      // Should have some weekend uplift but not for all nights
      const totalWeekendUplift = quote.perNight.reduce((sum, night) => sum + night.weekendUpliftCents, 0);
      expect(totalWeekendUplift).toBeGreaterThan(0);
      expect(totalWeekendUplift).toBeLessThan(3 * 1500); // Not all nights have uplift
    });
  });

  describe('Length Discounts', () => {
    it('should apply $4/night discount for 4-6 nights', () => {
      const quote = pricingEngine.quote({
        roomType: 'junior',
        checkIn: createDate('2024-12-01'),
        checkOut: createDate('2024-12-05'),
        guests: 2,
        breakfast: false
      });

      expect(quote.nights).toBe(4);
      quote.perNight.forEach(night => {
        expect(night.lengthDiscountCents).toBe(400); // $4 discount per night
      });
    });

    it('should apply $8/night discount for 7-9 nights', () => {
      const quote = pricingEngine.quote({
        roomType: 'junior',
        checkIn: createDate('2024-12-01'),
        checkOut: createDate('2024-12-08'),
        guests: 2,
        breakfast: false
      });

      expect(quote.nights).toBe(7);
      quote.perNight.forEach(night => {
        expect(night.lengthDiscountCents).toBe(800); // $8 discount per night
      });
    });

    it('should apply $12/night discount for 10+ nights', () => {
      const quote = pricingEngine.quote({
        roomType: 'junior',
        checkIn: createDate('2024-12-01'),
        checkOut: createDate('2024-12-11'),
        guests: 2,
        breakfast: false
      });

      expect(quote.nights).toBe(10);
      quote.perNight.forEach(night => {
        expect(night.lengthDiscountCents).toBe(1200); // $12 discount per night
      });
    });

    it('should not apply discount for stays less than 4 nights', () => {
      const quote = pricingEngine.quote({
        roomType: 'junior',
        checkIn: createDate('2024-12-03'),
        checkOut: createDate('2024-12-06'),
        guests: 2,
        breakfast: false
      });

      expect(quote.nights).toBe(3);
      quote.perNight.forEach(night => {
        expect(night.lengthDiscountCents).toBe(0);
      });
    });
  });

  describe('Breakfast Add-on', () => {
    it('should add breakfast cost when requested', () => {
      const quote = pricingEngine.quote({
        roomType: 'junior',
        checkIn: createDate('2024-12-03'),
        checkOut: createDate('2024-12-05'),
        guests: 2,
        breakfast: true
      });

      const expectedBreakfast = 2000; // 2 guests * 2 nights * $5
      const totalBreakfast = quote.perNight.reduce((sum, night) => sum + night.breakfastCents, 0);
      
      expect(totalBreakfast).toBe(expectedBreakfast);
      quote.perNight.forEach(night => {
        expect(night.breakfastCents).toBe(1000); // 2 guests * $5 per night
      });
    });

    it('should not add breakfast cost when not requested', () => {
      const quote = pricingEngine.quote({
        roomType: 'junior',
        checkIn: createDate('2024-12-03'),
        checkOut: createDate('2024-12-05'),
        guests: 2,
        breakfast: false
      });

      quote.perNight.forEach(night => {
        expect(night.breakfastCents).toBe(0);
      });
    });

    it('should calculate breakfast for multiple guests correctly', () => {
      const quote = pricingEngine.quote({
        roomType: 'king',
        checkIn: createDate('2024-12-03'),
        checkOut: createDate('2024-12-04'),
        guests: 4,
        breakfast: true
      });

      expect(quote.perNight[0].breakfastCents).toBe(2000); // 4 guests * $5
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle weekend + length discount + breakfast correctly', () => {
      // 7-night stay including weekend with breakfast
      const quote = pricingEngine.quote({
        roomType: 'king',
        checkIn: createDate('2024-12-06'), // Friday
        checkOut: createDate('2024-12-13'), // Friday
        guests: 2,
        breakfast: true
      });

      expect(quote.nights).toBe(7);
      
      // Should have weekend uplift for some nights
      const totalWeekendUplift = quote.perNight.reduce((sum, night) => sum + night.weekendUpliftCents, 0);
      expect(totalWeekendUplift).toBeGreaterThan(0);
      
      // Should have length discount for all nights (7 nights = $8/night)
      quote.perNight.forEach(night => {
        expect(night.lengthDiscountCents).toBe(800);
      });
      
      // Should have breakfast for all nights
      quote.perNight.forEach(night => {
        expect(night.breakfastCents).toBe(1000); // 2 guests * $5
      });
    });

    it('should provide detailed per-night breakdown', () => {
      const quote = pricingEngine.quote({
        roomType: 'presidential',
        checkIn: createDate('2024-12-01'),
        checkOut: createDate('2024-12-08'),
        guests: 3,
        breakfast: true
      });

      expect(quote.perNight).toHaveLength(7);
      
      quote.perNight.forEach((night, index) => {
        // Verify all breakdown fields are present
        expect(night).toHaveProperty('date');
        expect(night).toHaveProperty('baseCents');
        expect(night).toHaveProperty('weekendUpliftCents');
        expect(night).toHaveProperty('lengthDiscountCents');
        expect(night).toHaveProperty('breakfastCents');
        expect(night).toHaveProperty('subtotalCents');
        
        // Verify date format
        expect(night.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        
        // Verify calculation consistency
        const calculated = night.baseCents + night.weekendUpliftCents 
                          - night.lengthDiscountCents + night.breakfastCents;
        expect(night.subtotalCents).toBe(calculated);
      });
      
      // Verify total calculation
      const calculatedTotal = quote.perNight.reduce((sum, night) => sum + night.subtotalCents, 0);
      expect(quote.totalCents).toBe(calculatedTotal);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single night stays', () => {
      const quote = pricingEngine.quote({
        roomType: 'junior',
        checkIn: createDate('2024-12-03'), // Tuesday (weekday)
        checkOut: createDate('2024-12-04'),
        guests: 1,
        breakfast: false
      });

      expect(quote.totalCents).toBe(6000); // 1 night * $60
      expect(quote.nights).toBe(1);
      expect(quote.perNight).toHaveLength(1);
    });

    it('should throw error for invalid date ranges', () => {
      expect(() => {
        pricingEngine.quote({
          roomType: 'junior',
          checkIn: createDate('2024-12-05'),
          checkOut: createDate('2024-12-03'), // checkOut before checkIn
          guests: 1,
          breakfast: false
        });
      }).toThrow('INVALID_RANGE');
    });

    it('should throw error for same check-in and check-out dates', () => {
      expect(() => {
        pricingEngine.quote({
          roomType: 'junior',
          checkIn: createDate('2024-12-03'),
          checkOut: createDate('2024-12-03'), // same date
          guests: 1,
          breakfast: false
        });
      }).toThrow('INVALID_RANGE');
    });

    it('should handle extended stays with maximum discount', () => {
      const quote = pricingEngine.quote({
        roomType: 'junior',
        checkIn: createDate('2024-12-01'),
        checkOut: createDate('2024-12-31'),
        guests: 2,
        breakfast: false
      });

      expect(quote.nights).toBe(30);
      // Should apply $12/night discount (highest tier)
      quote.perNight.forEach(night => {
        expect(night.lengthDiscountCents).toBe(1200);
      });
    });
  });
});
