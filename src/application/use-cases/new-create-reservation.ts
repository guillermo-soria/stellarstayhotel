import { ReservationRepoPort } from "../ports/reservation-repo.port";
import { RoomRepoPort } from "../ports/room-repo.port";
import { PricingEngine } from "../../domain/services/pricing-engine";

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
      const err: any = new Error('ROOM_NOT_FOUND');
      err.code = 'ROOM_NOT_FOUND';
      throw err;
    }
    if (room.type !== p.type) {
      const err: any = new Error('ROOM_TYPE_MISMATCH');
      err.code = 'ROOM_TYPE_MISMATCH';
      throw err;
    }
    if (p.guests > room.capacity) {
      const err: any = new Error('OVER_CAPACITY');
      err.code = 'OVER_CAPACITY';
      throw err;
    }

    const nights = Math.round(
      (new Date(p.checkOut).setHours(0,0,0,0) - new Date(p.checkIn).setHours(0,0,0,0))
      / (1000*60*60*24)
    );
    if (nights <= 0) {
      const err: any = new Error('INVALID_RANGE');
      err.code = 'INVALID_RANGE';
      throw err;
    }

    // 2) Idempotencia: si ya existe, devolverla (replay-safe)
    const existing = await this.reservations.findByIdempotencyKey(p.idempotencyKey);
    if (existing) return { created: false, reservation: existing };

    // 3) Solapamiento
    const overlap = await this.reservations.hasOverlap(p.roomId, p.checkIn, p.checkOut);
    if (overlap) {
      const err: any = new Error('DATE_OVERLAP');
      err.code = 'DATE_OVERLAP';
      throw err;
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
