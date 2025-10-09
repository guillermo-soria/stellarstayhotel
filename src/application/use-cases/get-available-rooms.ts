import { RoomRepoPort } from "../ports/room-repo.port";
import { DateRange } from "../../domain/entities/room";
import { PricingEngine, QuoteInput } from "../../domain/services/pricing-engine";

export interface AvailableRoomWithPricing {
  roomId: string;
  type: "junior" | "king" | "presidential";
  capacity: number;
  baseRate: number;
  priceCentsPerNight: number;
  totalCents: number;
  nights: number;
  breakdown?: {
    date: string;
    baseCents: number;
    weekendUpliftCents: number;
    lengthDiscountCents: number;
    breakfastCents: number;
    subtotalCents: number;
  }[];
}

export class GetAvailableRooms {
  constructor(
    private rooms: RoomRepoPort,
    private pricingEngine: PricingEngine
  ) {}

  async execute(params: {
    dateRange: DateRange;
    guests: number;
    type?: "junior" | "king" | "presidential";
    breakfast?: boolean;
    includeBreakdown?: boolean;
  }): Promise<AvailableRoomWithPricing[]> {
    // Get available rooms from repository
    const roomsResult = await this.rooms.findAvailable({
      checkIn: new Date(params.dateRange.checkIn),
      checkOut: new Date(params.dateRange.checkOut),
      guests: params.guests,
      type: params.type,
      limit: 20,
      cursor: null,
    });

    // Calculate pricing for each room
    const roomsWithPricing: AvailableRoomWithPricing[] = [];

    for (const room of roomsResult.items) {
      try {
        const quoteInput: QuoteInput = {
          roomType: room.type,
          checkIn: new Date(params.dateRange.checkIn),
          checkOut: new Date(params.dateRange.checkOut),
          guests: params.guests,
          breakfast: params.breakfast || false,
        };

        const quote = this.pricingEngine.quote(quoteInput);
        const avgPricePerNight = Math.round(quote.totalCents / quote.nights);

        // Get base rate from pricing engine static property
        const baseRate = (this.pricingEngine as any).constructor.BASE[room.type];

        roomsWithPricing.push({
          roomId: room.id,
          type: room.type,
          capacity: room.capacity,
          baseRate: baseRate,
          priceCentsPerNight: avgPricePerNight,
          totalCents: quote.totalCents,
          nights: quote.nights,
          breakdown: params.includeBreakdown ? quote.perNight : undefined,
        });
      } catch (error) {
        // Skip rooms with pricing errors (e.g., invalid date ranges)
        console.warn(`Failed to calculate pricing for room ${room.id}:`, error);
      }
    }

    return roomsWithPricing;
  }
}
