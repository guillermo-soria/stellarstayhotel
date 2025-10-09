import { ReservationRepoPort, CreateReservationParams } from "../ports/reservation-repo.port";

export class CreateReservation {
  constructor(private reservations: ReservationRepoPort) {}
  async execute(input: CreateReservationParams) {
    const reservation = await this.reservations.create(input);
    return reservation;
  }
}
