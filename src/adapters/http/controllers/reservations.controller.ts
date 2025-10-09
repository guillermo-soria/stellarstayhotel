import { Request, Response, NextFunction } from "express";
import { ReservationBody } from "../schemas/reservation.schema";

import { PrismaReservationRepository } from "../../../infrastructure/repositories/prisma-reservation.repository";
import { PrismaRoomRepository } from "../../../infrastructure/repositories/prisma-room.repository";
import { CreateReservation } from "../../../application/use-cases/new-create-reservation";
import { PricingEngine } from "../../../domain/services/pricing-engine";
import { reliabilityManager } from "../../../infrastructure/reliability/reliability-manager";

const reservationsRepo = new PrismaReservationRepository();
const roomsRepo = new PrismaRoomRepository();
const pricing = new PricingEngine();
const createReservation = new CreateReservation(reservationsRepo, roomsRepo, pricing);

// Export for testing
export { reservationsRepo };

function extractErrorCode(err: unknown): string | undefined {
  if (typeof err !== 'object' || err === null) return undefined;
  const maybe = err as { code?: unknown };
  return typeof maybe.code === 'string' ? maybe.code : undefined;
}

export async function createReservationController(req: Request, res: Response, next: NextFunction) {
  try {
    const idem = req.header("Idempotency-Key");
    if (!idem) {
      return res.status(400).json({ error: { code: "MISSING_IDEMPOTENCY_KEY", message: "Header Idempotency-Key requerido" }});
    }

    const body = (req as Request & { validatedBody?: ReservationBody }).validatedBody;
    if (!body) {
      return res.status(400).json({ error: { code: "BODY_NOT_VALIDATED", message: "Body no validado" }});
    }

    // Execute reservation creation with reliability patterns
    const result = await reliabilityManager.executeWithReliability(
      () => createReservation.execute({
        roomId: body.roomId,
        type: body.type,
        checkIn: new Date(body.checkIn),
        checkOut: new Date(body.checkOut),
        guests: body.guests,
        breakfast: body.breakfast ?? false,
        idempotencyKey: idem
      }),
      'create-reservation',
      {
        maxRetries: 2, // Fewer retries for mutations to avoid duplicate reservations
        timeoutMs: 7000,
        useCircuitBreaker: true
      }
    );

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
  } catch (err: unknown) {
    const code = extractErrorCode(err) ?? (err instanceof Error ? err.message : 'UNKNOWN_ERROR');
    if (code === 'ROOM_NOT_FOUND')    return res.status(404).json({ error: { code, message: 'Room no encontrada' }});
    if (code === 'ROOM_TYPE_MISMATCH')return res.status(400).json({ error: { code, message: 'Tipo de room no coincide' }});
    if (code === 'OVER_CAPACITY')     return res.status(400).json({ error: { code, message: 'Guests exceden capacidad' }});
    if (code === 'INVALID_RANGE')     return res.status(400).json({ error: { code, message: 'Rango de fechas inválido' }});
    if (code === 'DATE_OVERLAP')      return res.status(409).json({ error: { code, message: 'Fechas solapadas con otra reserva' }});
    return next(err);
  }
}
