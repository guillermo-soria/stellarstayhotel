import { Request, Response, NextFunction } from "express";
import { ReservationBody } from "../schemas/reservation.schema";

import { NewInMemoryReservationRepository } from "../../../infrastructure/repositories/new-in-memory-reservation.repository";
import { NewInMemoryRoomRepository } from "../../../infrastructure/repositories/new-in-memory-room.repository";
import { CreateReservation } from "../../../application/use-cases/new-create-reservation";
import { PricingEngine } from "../../../domain/services/pricing-engine";

const reservationsRepo = new NewInMemoryReservationRepository();
const roomsRepo = new NewInMemoryRoomRepository();
const pricing = new PricingEngine();
const createReservation = new CreateReservation(reservationsRepo, roomsRepo, pricing);

// Export for testing
export { reservationsRepo };

export async function createReservationController(req: Request, res: Response, next: NextFunction) {
  try {
    const idem = req.header("Idempotency-Key");
    if (!idem) {
      return res.status(400).json({ error: { code: "MISSING_IDEMPOTENCY_KEY", message: "Header Idempotency-Key requerido" }});
    }

    const body = (req as any).validatedBody as ReservationBody;

    const result = await createReservation.execute({
      roomId: body.roomId,
      type: body.type,
      checkIn: new Date(body.checkIn),
      checkOut: new Date(body.checkOut),
      guests: body.guests,
      breakfast: body.breakfast ?? false,
      idempotencyKey: idem
    });

    const r = result.reservation;
    res.setHeader("Location", `/api/reservations/${r.id}`);

    if (result.created) {
      return res.status(201).json({
        id: r.id,
        status: r.status,
        totalCents: r.totalCents,
        createdAt: r.createdAt,
        requestIdempotencyKey: idem
      });
    } else {
      // Reintento idempotente: devolver 200 con el mismo recurso
      return res.status(200).json({
        id: r.id,
        status: r.status,
        totalCents: r.totalCents,
        createdAt: r.createdAt,
        requestIdempotencyKey: idem
      });
    }
  } catch (err: any) {
    const code = err?.code || err?.message;
    if (code === 'ROOM_NOT_FOUND')    return res.status(404).json({ error: { code, message: 'Room no encontrada' }});
    if (code === 'ROOM_TYPE_MISMATCH')return res.status(400).json({ error: { code, message: 'Tipo de room no coincide' }});
    if (code === 'OVER_CAPACITY')     return res.status(400).json({ error: { code, message: 'Guests exceden capacidad' }});
    if (code === 'INVALID_RANGE')     return res.status(400).json({ error: { code, message: 'Rango de fechas inválido' }});
    if (code === 'DATE_OVERLAP')      return res.status(409).json({ error: { code, message: 'Fechas solapadas con otra reserva' }});
    return next(err);
  }
}
