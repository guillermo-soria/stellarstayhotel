import { Reservation } from "../../domain/entities/reservation";

export interface CreateReservationParams {
  roomId: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  breakfast?: boolean;
  idempotencyKey: string;
  totalCents: number;
}

export interface ReservationDTO {
  id: string;
  roomId: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  breakfast: boolean;
  totalCents: number;
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED';
  createdAt: Date;
  idempotencyKey?: string | null;
}

export interface ReservationRepoPort {
  create(p: CreateReservationParams): Promise<ReservationDTO>;
  getById(id: string): Promise<ReservationDTO | null>;
  findByIdempotencyKey(key: string): Promise<ReservationDTO | null>;
  hasOverlap(roomId: string, checkIn: Date, checkOut: Date): Promise<boolean>;
}
