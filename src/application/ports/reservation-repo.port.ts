import { Reservation } from "../../domain/entities/reservation";

export interface ReservationRepoPort {
  create(reservation: Reservation): Promise<void>;
  getById(id: string): Promise<Reservation | null>;
}
