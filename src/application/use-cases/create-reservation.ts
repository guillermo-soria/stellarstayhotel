import { Reservation } from "../../domain/entities/reservation";
import { ReservationRepoPort } from "../ports/reservation-repo.port";

export class CreateReservation {
  constructor(private reservations: ReservationRepoPort) {}
  async execute(input: Reservation) {
    await this.reservations.create(input);
    return input;
  }
}
