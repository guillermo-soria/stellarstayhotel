import { RoomType } from "../services/pricing-engine";

export interface DateRange {
  checkIn: string;   // YYYY-MM-DD
  checkOut: string;  // YYYY-MM-DD (exclusive)
}

export interface Room {
  id: string;
  type: RoomType;
  capacity: number;
  baseRate: number;
}

export { RoomType };
