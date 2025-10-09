import { ReservationRepoPort } from "../ports/reservation-repo.port";
import { RoomRepoPort } from "../ports/room-repo.port";
import { PricingEngine } from "../../domain/services/pricing-engine";
import { AppError } from "../../infrastructure/errors/app-error";

export class CreateReservation {
  constructor(
    private reservations: ReservationRepoPort,
    private rooms: RoomRepoPort,
    private pricing: PricingEngine
  ) {}

  async execute(p: {
    roomId: string;
    type: 'junior' | 'king' | 'presidential';
    checkIn: Date;
    checkOut: Date;
    guests: number;
    breakfast?: boolean;
    idempotencyKey: string;
  }) {
    // 1) Validaciones de dominio
    const room = await this.rooms.getById(p.roomId);
    if (!room) {
      throw new AppError({ code: 'ROOM_NOT_FOUND', status: 404 });
    }
    if (room.type !== p.type) {
      throw new AppError({ code: 'ROOM_TYPE_MISMATCH', status: 400 });
    }
    if (p.guests > room.capacity) {
      throw new AppError({ code: 'OVER_CAPACITY', status: 400 });
    }

    const nights = Math.round(
      (new Date(p.checkOut).setHours(0,0,0,0) - new Date(p.checkIn).setHours(0,0,0,0))
      / (1000*60*60*24)
    );
    if (nights <= 0) {
      throw new AppError({ code: 'INVALID_RANGE', status: 400 });
    }

    // 2) Idempotencia: si ya existe, devolverla (replay-safe)
    const existing = await this.reservations.findByIdempotencyKey(p.idempotencyKey);
    if (existing) return { created: false, reservation: existing };

    // 3) Solapamiento
    const overlap = await this.reservations.hasOverlap(p.roomId, p.checkIn, p.checkOut);
    if (overlap) {
      throw new AppError({ code: 'DATE_OVERLAP', status: 409 });
    }

    // 4) Precio (única fuente de verdad)
    const pricing = new PricingEngine();
    const quote = pricing.quote({
      roomType: p.type,
      checkIn: p.checkIn,
      checkOut: p.checkOut,
      guests: p.guests,
      breakfast: !!p.breakfast
    });

    // 5) Crear
    const created = await this.reservations.create({
      roomId: p.roomId,
      checkIn: p.checkIn,
      checkOut: p.checkOut,
      guests: p.guests,
      breakfast: !!p.breakfast,
      idempotencyKey: p.idempotencyKey,
      totalCents: quote.totalCents
    });

    return { created: true, reservation: created };
  }
}
