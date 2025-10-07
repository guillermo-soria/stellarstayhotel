import { RoomType } from "../entities/room";

export interface PricingInput {
  roomType: RoomType;
  nights: number;
  checkIn: string;
  checkOut: string;
  guests: number;
  breakfast: boolean;
}

export interface PricingOutput {
  pricePerNight: number;
  nights: number;
  breakfastTotal: number;
  total: number;
  currency: "USD";
}

export class PricingEngine {
  // Stub implementation
  quote(_input: PricingInput): PricingOutput {
    return {
      pricePerNight: 0,
      nights: 0,
      breakfastTotal: 0,
      total: 0,
      currency: "USD",
    };
  }
}
