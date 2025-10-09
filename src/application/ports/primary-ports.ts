// Primary Ports (Incoming interfaces)

export interface CreateReservationRequest {
  roomId: string;
  type: 'junior' | 'king' | 'presidential';
  checkIn: Date;
  checkOut: Date;
  guests: number;
  breakfast?: boolean;
  idempotencyKey: string;
}

export interface ReservationResponse {
  id: string;
  roomId: string;
  type: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  breakfast: boolean;
  totalCents: number;
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED';
  createdAt: Date;
  created: boolean;
}

export interface ReservationView {
  id: string;
  roomId: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  breakfast: boolean;
  totalCents: number;
  status: string;
  createdAt: Date;
}

export interface AvailabilityQuery {
  checkIn: Date;
  checkOut: Date;
  guests: number;
  type?: 'junior' | 'king' | 'presidential';
  breakfast?: boolean;
  includeBreakdown?: boolean;
}

export interface AvailableRoomsResponse {
  rooms: AvailableRoomWithPricing[];
  paging: {
    limit: number;
    nextCursor: string | null;
  };
}

export interface AvailableRoomWithPricing {
  roomId: string;
  type: string;
  capacity: number;
  baseRate: number;
  priceCentsPerNight: number;
  totalCents: number;
  nights: number;
  breakdown?: PriceBreakdown[];
}

export interface PriceBreakdown {
  date: string;
  baseCents: number;
  weekendUpliftCents: number;
  lengthDiscountCents: number;
  breakfastCents: number;
  subtotalCents: number;
}

export interface QuoteRequest {
  roomType: 'junior' | 'king' | 'presidential';
  checkIn: Date;
  checkOut: Date;
  guests: number;
  breakfast?: boolean;
}

export interface QuoteResponse {
  nights: number;
  currency: 'USD';
  totalCents: number;
  perNight: PriceBreakdown[];
}

// Primary Ports (Incoming)
export interface CreateReservationPort {
  execute(request: CreateReservationRequest): Promise<ReservationResponse>;
}

export interface QueryReservationPort {
  findById(id: string): Promise<ReservationView | null>;
  findByIdempotencyKey(key: string): Promise<ReservationView | null>;
}

export interface RoomAvailabilityPort {
  findAvailable(query: AvailabilityQuery): Promise<AvailableRoomsResponse>;
}

export interface PricingCalculationPort {
  calculateQuote(input: QuoteRequest): Promise<QuoteResponse>;
}
