import { randomUUID } from "crypto";
import {
  ReservationRepoPort,
  CreateReservationParams,
  ReservationDTO
} from "../../application/ports/reservation-repo.port";

const STORE = new Map<string, ReservationDTO>();                 // id -> dto
const BY_IDEMPOTENCY = new Map<string, string>();                // idem -> id

export class NewInMemoryReservationRepository implements ReservationRepoPort {
  async create(p: CreateReservationParams): Promise<ReservationDTO> {
    // Idempotencia guardada
    if (p.idempotencyKey) {
      const existingId = BY_IDEMPOTENCY.get(p.idempotencyKey);
      if (existingId) return STORE.get(existingId)!;
    }

    const id = randomUUID();
    const dto: ReservationDTO = {
      id,
      roomId: p.roomId,
      checkIn: p.checkIn,
      checkOut: p.checkOut,
      guests: p.guests,
      breakfast: !!p.breakfast,
      totalCents: p.totalCents,
      status: "CONFIRMED",
      createdAt: new Date(),
      idempotencyKey: p.idempotencyKey,
    };
    STORE.set(id, dto);
    if (p.idempotencyKey) BY_IDEMPOTENCY.set(p.idempotencyKey, id);
    return dto;
  }

  async getById(id: string) {
    return STORE.get(id) ?? null;
  }

  async findByIdempotencyKey(key: string) {
    const id = BY_IDEMPOTENCY.get(key);
    return id ? (STORE.get(id) ?? null) : null;
  }

  // Test helper method to clear all data
  clearAll() {
    STORE.clear();
    BY_IDEMPOTENCY.clear();
  }

  async hasOverlap(roomId: string, checkIn: Date, checkOut: Date): Promise<boolean> {
    for (const r of STORE.values()) {
      if (r.roomId !== roomId) continue;
      // overlap si (r.checkIn < checkOut) && (r.checkOut > checkIn)
      if (r.checkIn < checkOut && r.checkOut > checkIn) return true;
    }
    return false;
  }
}
