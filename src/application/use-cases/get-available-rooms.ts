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
    const rooms = await this.rooms.findAvailable({
      ...params,
      limit: 20,
      cursor: null,
    });

    // Calculate pricing for each room
    const roomsWithPricing: AvailableRoomWithPricing[] = [];

    for (const room of rooms) {
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

        roomsWithPricing.push({
          roomId: room.roomId,
          type: room.type,
          capacity: room.capacity,
          baseRate: room.baseRate,
          priceCentsPerNight: avgPricePerNight,
          totalCents: quote.totalCents,
          nights: quote.nights,
          breakdown: params.includeBreakdown ? quote.perNight : undefined,
        });
      } catch (error) {
        // Skip rooms with pricing errors (e.g., invalid date ranges)
        console.warn(`Failed to calculate pricing for room ${room.roomId}:`, error);
      }
    }

    return roomsWithPricing;
  }
}
