import { RoomType } from "./room";

export interface Reservation {
  id: string;
  roomId: string;
  type: RoomType;
  guests: number;
  breakfast: boolean;
  checkIn: string;   // YYYY-MM-DD
  checkOut: string;  // YYYY-MM-DD
  total: number;     // to be computed by PricingEngine
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  createdAt: string; // ISO timestamp
}
