// src/domain/services/pricing-engine.ts
export type RoomType = 'junior' | 'king' | 'presidential';

export interface QuoteInput {
  roomType: RoomType;
  checkIn: Date;   // inclusive
  checkOut: Date;  // exclusive
  guests: number;
  breakfast?: boolean; // default false
}

export interface NightBreakdown {
  date: string;             // YYYY-MM-DD (night)
  baseCents: number;        // base per night
  weekendUpliftCents: number; // +25% if Sat/Sun
  lengthDiscountCents: number; // -$4/-$8/-$12 per night based on stay length
  breakfastCents: number;   // $5 * guests per night
  subtotalCents: number;    // base + uplift - discount + breakfast
}

export interface QuoteResult {
  nights: number;
  currency: 'USD';
  totalCents: number;
  perNight: NightBreakdown[];
}

/**
 * Pricing Rules (applied in order):
 * - Base rate: Junior $60, King $90, Presidential $150
 * - Weekend uplift: +25% Saturday/Sunday (applied per night)
 * - Length discounts (per night, based on total nights):
 *    4–6 nights: -$4   | 7–9 nights: -$8   | 10+ nights: -$12
 * - Breakfast: +$5 per guest per night
 */
export class PricingEngine {
  private static BASE: Record<RoomType, number> = {
    junior: 60_00,        // in cents
    king: 90_00,
    presidential: 150_00,
  };

  quote(input: QuoteInput): QuoteResult {
    const { roomType, checkIn, checkOut, guests, breakfast = false } = input;

    const nights = this.diffNights(checkIn, checkOut);
    if (nights <= 0) {
      throw new Error('INVALID_RANGE: checkOut must be after checkIn by at least 1 night.');
    }

    const basePerNight = PricingEngine.BASE[roomType];

    const lengthDiscountCents = this.lengthDiscountPerNight(nights); // per night
    const breakfastPerNightCents = breakfast ? 5_00 * Math.max(guests, 0) : 0;

    let totalCents = 0;
    const perNight: NightBreakdown[] = [];

    // Iterate through nights
    let d = this.atMidnight(checkIn);
    for (let i = 0; i < nights; i++) {
      const isWeekend = this.isWeekend(d);
      const weekendUpliftCents = isWeekend ? Math.round(basePerNight * 0.25) : 0;

      // base + uplift - discount + breakfast
      const subtotal =
        basePerNight +
        weekendUpliftCents -
        lengthDiscountCents +
        breakfastPerNightCents;

      totalCents += subtotal;

      perNight.push({
        date: this.yyyyMmDd(d),
        baseCents: basePerNight,
        weekendUpliftCents,
        lengthDiscountCents,
        breakfastCents: breakfastPerNightCents,
        subtotalCents: subtotal,
      });

      d = this.addDays(d, 1);
    }

    return {
      nights,
      currency: 'USD',
      totalCents,
      perNight,
    };
  }

  // ----- helpers -----

  private atMidnight(dt: Date): Date {
    const d = new Date(dt);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private addDays(dt: Date, days: number): Date {
    const d = new Date(dt);
    d.setDate(d.getDate() + days);
    return d;
  }

  private diffNights(checkIn: Date, checkOut: Date): number {
    const a = this.atMidnight(checkIn).getTime();
    const b = this.atMidnight(checkOut).getTime();
    return Math.round((b - a) / (1000 * 60 * 60 * 24));
    // checkOut is exclusive (last night is checkOut-1)
  }

  private isWeekend(d: Date): boolean {
    const day = d.getDay(); // 0 = Sunday, 6 = Saturday
    return day === 0 || day === 6;
  }

  private lengthDiscountPerNight(nights: number): number {
    if (nights >= 10) return 12_00;
    if (nights >= 7)  return 8_00;
    if (nights >= 4)  return 4_00;
    return 0;
  }

  private yyyyMmDd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }
}
